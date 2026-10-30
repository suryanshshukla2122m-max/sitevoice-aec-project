const { GoogleGenAI } = require('@google/genai');

let aiClient = null;

const DEFAULT_PRIMARY_MODEL = 'gemini-3-flash-preview';
const FALLBACK_MODELS = ['gemini-3.1-flash-lite'];

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    throw new Error('GEMINI_API_KEY environment variable is required.');
  }

  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: apiKey.trim(),
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }

  return aiClient;
}

function getGeminiModel() {
  const model = process.env.GEMINI_MODEL;
  if (!model || !model.trim()) {
    return DEFAULT_PRIMARY_MODEL;
  }
  return model.trim();
}

/**
 * Returns the ordered model chain: primary model followed by fallback models.
 * @returns {string[]}
 */
function getModelChain() {
  const primary = getGeminiModel();
  const chain = [primary];
  for (const fallback of FALLBACK_MODELS) {
    if (!chain.includes(fallback)) {
      chain.push(fallback);
    }
  }
  return chain;
}

/**
 * Evaluates whether an error is a transient availability or capacity error (e.g. 503, UNAVAILABLE).
 * Explicitly rejects client, authentication, invalid-request, and schema errors.
 * @param {any} err
 * @returns {boolean}
 */
function isTransientUnavailableError(err) {
  if (!err) return false;

  const status = err.status || err.statusCode || err.code;
  const statusStr = String(status || '').toUpperCase();

  // Non-transient status codes: do not treat as transient availability issue
  if (
    status === 400 ||
    status === 401 ||
    status === 403 ||
    status === 404 ||
    statusStr === 'INVALID_ARGUMENT' ||
    statusStr === 'UNAUTHENTICATED' ||
    statusStr === 'PERMISSION_DENIED' ||
    statusStr === 'NOT_FOUND'
  ) {
    return false;
  }

  const msg = (err.message || '').toLowerCase();
  const details = typeof err.errorDetails === 'string' ? err.errorDetails.toLowerCase() : '';
  const combined = `${msg} ${details}`;

  // Explicit authentication or client validation errors
  if (
    combined.includes('api_key_invalid') ||
    combined.includes('api key not valid') ||
    combined.includes('unauthenticated') ||
    combined.includes('permission denied') ||
    combined.includes('permission_denied') ||
    combined.includes('invalid argument') ||
    combined.includes('invalid_argument')
  ) {
    return false;
  }

  // Transient capacity / availability indicators
  if (
    status === 503 ||
    status === 429 ||
    statusStr === 'UNAVAILABLE' ||
    statusStr === 'RESOURCE_EXHAUSTED' ||
    combined.includes('503') ||
    combined.includes('429') ||
    combined.includes('unavailable') ||
    combined.includes('resource_exhausted') ||
    combined.includes('quota') ||
    combined.includes('rate limit') ||
    combined.includes('high demand') ||
    combined.includes('spikes in demand') ||
    combined.includes('overloaded') ||
    combined.includes('service unavailable') ||
    combined.includes('temporarily unavailable')
  ) {
    return true;
  }

  return false;
}

/**
 * Call Gemini to interpret text with structured system prompt and schema.
 * Executes primary model with short exponential backoff on 503 before sequentially falling back.
 * The exact same prompt, systemInstruction, and responseSchema are delivered to every candidate model.
 * 
 * @param {string} prompt - User transcript or instruction
 * @param {string} systemInstruction - System rules and instructions
 * @param {object} responseSchema - JSON schema for structured output
 */
async function generateStructuredContent(prompt, systemInstruction, responseSchema) {
  const client = getGeminiClient();
  const modelChain = getModelChain();

  const config = {
    systemInstruction,
    responseMimeType: 'application/json',
    temperature: 0.1,
  };

  if (responseSchema) {
    config.responseSchema = responseSchema;
  }

  let lastTransientError = null;

  for (let mIdx = 0; mIdx < modelChain.length; mIdx++) {
    const model = modelChain[mIdx];
    console.log(`[Gemini] Trying model: ${model}`);

    try {
      // 5-second timeout per model attempt to prevent hanging requests
      const response = await Promise.race([
        client.models.generateContent({
          model,
          contents: prompt,
          config,
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Timeout invoking model ${model}`)), 5000)
        ),
      ]);

      if (!response || !response.text) {
        throw new Error('Gemini API returned an empty response.');
      }

      console.log(`[Gemini] Success with model: ${model}`);
      return JSON.parse(response.text);
    } catch (err) {
      if (!isTransientUnavailableError(err) && !err.message.includes('Timeout')) {
        throw err;
      }

      lastTransientError = err;
      console.warn(`[Gemini] ${model} unavailable or timed out: ${err.message}.`);
      if (mIdx + 1 < modelChain.length) {
        const nextModel = modelChain[mIdx + 1];
        console.warn(`[Gemini] Immediately falling back to model: ${nextModel}`);
      }
    }
  }

  // If all models in the fallback chain were exhausted due to transient 503/UNAVAILABLE errors:
  const serviceUnavailableErr = new Error(
    'The AI speech interpretation service is temporarily experiencing high demand across all models. Please wait a moment and try your command again.'
  );
  serviceUnavailableErr.statusCode = 503;
  serviceUnavailableErr.isAiUnavailable = true;
  throw serviceUnavailableErr;
}

module.exports = {
  getGeminiClient,
  getGeminiModel,
  getModelChain,
  isTransientUnavailableError,
  generateStructuredContent,
};

