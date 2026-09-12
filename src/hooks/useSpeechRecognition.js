import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook for browser Web Speech API SpeechRecognition.
 * Falls back gracefully if unsupported or permissions are denied.
 */
export function useSpeechRecognition({ onResult, onError } = {}) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState(null);
  const [isSupported, setIsSupported] = useState(false);

  const recognitionRef = useRef(null);
  const latestTranscriptRef = useRef('');
  const onResultRef = useRef(onResult);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onResultRef.current = onResult;
    onErrorRef.current = onError;
  }, [onResult, onError]);

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition || null;

    if (SpeechRecognition) {
      setIsSupported(true);
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
          setIsListening(true);
          setError(null);
          setInterimTranscript('');
          latestTranscriptRef.current = '';
        };

        recognition.onresult = (event) => {
          let currentInterim = '';
          let currentFinal = '';

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const item = event.results[i];
            if (item.isFinal) {
              currentFinal += item[0].transcript;
            } else {
              currentInterim += item[0].transcript;
            }
          }

          if (currentFinal) {
            const cleaned = currentFinal.trim();
            setTranscript(cleaned);
            latestTranscriptRef.current = cleaned;
            setInterimTranscript('');
          } else {
            setInterimTranscript(currentInterim);
          }
        };

        recognition.onerror = (event) => {
          console.error('[SpeechRecognition Error Event]', event.error, event);

          const errorCode = event.error || 'unknown';
          let friendlyDetail = '';

          switch (errorCode) {
            case 'not-allowed':
              friendlyDetail = 'Microphone access denied. Please check your browser microphone permissions.';
              break;
            case 'service-not-allowed':
              friendlyDetail = 'Speech recognition service is not allowed or was blocked by browser/system settings.';
              break;
            case 'no-speech':
              friendlyDetail = 'No speech detected. Please speak clearly into your microphone.';
              break;
            case 'audio-capture':
              friendlyDetail = 'No microphone device found on this system.';
              break;
            case 'network':
              friendlyDetail = 'Network error communicating with speech recognition service.';
              break;
            case 'aborted':
              friendlyDetail = 'Speech recognition was aborted.';
              break;
            case 'language-not-supported':
              friendlyDetail = 'The selected language (en-US) is not supported by this browser.';
              break;
            default:
              friendlyDetail = `Speech recognition error occurred (${errorCode}).`;
              break;
          }

          const fullErrorMessage = `[${errorCode}] ${friendlyDetail}`;
          setError(fullErrorMessage);
          setIsListening(false);
          if (onErrorRef.current) onErrorRef.current(fullErrorMessage);
        };

        recognition.onend = () => {
          setIsListening(false);
          const finalCandidate = latestTranscriptRef.current.trim();
          if (finalCandidate && onResultRef.current) {
            onResultRef.current(finalCandidate);
          }
        };

        recognitionRef.current = recognition;
      } catch (initErr) {
        setIsSupported(false);
        setError('Failed to initialize speech recognition engine.');
      }
    } else {
      setIsSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          // ignore cleanup error
        }
      }
    };
  }, []);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) {
      setError('Speech recognition is not supported in this browser. Please use the typed input below.');
      return;
    }
    setError(null);
    setTranscript('');
    setInterimTranscript('');
    latestTranscriptRef.current = '';

    try {
      recognitionRef.current.start();
    } catch (err) {
      console.error('[SpeechRecognition Start Error]', err);
      setError(`Could not start microphone: ${err.message || err}`);
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // ignore
      }
      setIsListening(false);
    }
  }, [isListening]);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    latestTranscriptRef.current = '';
    setError(null);
  }, []);

  return {
    isListening,
    transcript,
    interimTranscript,
    error,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
    setTranscript,
  };
}
