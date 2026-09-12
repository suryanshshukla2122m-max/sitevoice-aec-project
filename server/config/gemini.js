const { GoogleGenAI } = require('@google/genai');

let aiClient = null;

const DEFAULT_PRIMARY_MODEL = 'gemini-3.8-flash';
const FALLBACK_MODELS = ['gemini-3.7-flash', 'gemini-3.5-flash-lite'];

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
  };

  if (responseSchema) {
    config.responseSchema = responseSchema;
  }

  const MAX_RETRIES_PER_MODEL = 1; // 1 initial attempt + 1 retry per model
  let lastTransientError = null;

  for (let mIdx = 0; mIdx < modelChain.length; mIdx++) {
    const model = modelChain[mIdx];
    console.log(`[Gemini] Trying model: ${model}`);

    for (let attempt = 1; attempt <= MAX_RETRIES_PER_MODEL + 1; attempt++) {
      try {
        const response = await client.models.generateContent({
          model,
          contents: prompt,
          config,
        });

        if (!response || !response.text) {
          throw new Error('Gemini API returned an empty response.');
        }

        console.log(`[Gemini] Success with model: ${model}`);
        return JSON.parse(response.text);
      } catch (err) {
        // If not a transient availability error, fail fast without masking
        if (!isTransientUnavailableError(err)) {
          throw err;
        }

        lastTransientError = err;

        if (attempt <= MAX_RETRIES_PER_MODEL) {
          console.warn('[Gemini] 503 received, retrying...');
          const delayMs = 600 * attempt;
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        } else {
          // Model exhausted after retries
          if (mIdx + 1 < modelChain.length) {
            const nextModel = modelChain[mIdx + 1];
            console.warn(`[Gemini] Falling back to model: ${nextModel}`);
          }
        }
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

