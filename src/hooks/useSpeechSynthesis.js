import { useState, useCallback, useEffect, useRef } from 'react';

/**
 * Custom hook for Web Speech API SpeechSynthesis.
 * Allows assistant to speak responses aloud, with user mute/unmute control.
 */
export function useSpeechSynthesis() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const voiceRef = useRef(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setIsSupported(true);

      const updateVoices = () => {
        try {
          const voices = window.speechSynthesis.getVoices();
          // Find a clear natural English voice
          const preferred = voices.find(
            (v) => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Alex'))
          ) || voices.find((v) => v.lang.startsWith('en')) || voices[0];
          voiceRef.current = preferred || null;
        } catch (e) {
          // ignore
        }
      };

      updateVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = updateVoices;
      }
    }
  }, []);

  const speak = useCallback(
    (text) => {
      if (!text || isMuted || !isSupported || typeof window === 'undefined') return;

      try {
        window.speechSynthesis.cancel(); // Stop prior speech

        const utterance = new SpeechSynthesisUtterance(text);
        if (voiceRef.current) {
          utterance.voice = voiceRef.current;
        }
        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        window.speechSynthesis.speak(utterance);
      } catch (err) {
        setIsSpeaking(false);
      }
    },
    [isMuted, isSupported]
  );

  const stop = useCallback(() => {
    if (isSupported && typeof window !== 'undefined') {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {
        // ignore
      }
      setIsSpeaking(false);
    }
  }, [isSupported]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      if (!prev) {
        stop();
      }
      return !prev;
    });
  }, [stop]);

  return {
    speak,
    stop,
    isSpeaking,
    isMuted,
    isSupported,
    toggleMute,
  };
}
