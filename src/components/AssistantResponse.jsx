import React from 'react';
import { Bot, Volume2, Sparkles } from 'lucide-react';

export function AssistantResponse({ message, onReplay, isSpeaking }) {
  if (!message) return null;

  return (
    <div className="assistant-response-card" role="region" aria-label="Assistant Voice Response">
      <div className="assistant-response-header">
        <div className="assistant-tag">
          <Bot size={14} className="assistant-avatar-icon" aria-hidden="true" />
          <span>SITEVOICE ASSISTANT</span>
        </div>
        {onReplay && (
          <button
            type="button"
            className="replay-speech-btn"
            onClick={() => onReplay(message)}
            title="Listen to this response again"
            aria-label="Replay audio response"
          >
            <Volume2 size={13} className={isSpeaking ? 'pulse-audio' : ''} aria-hidden="true" />
            <span>{isSpeaking ? 'Speaking…' : 'Read Aloud'}</span>
          </button>
        )}
      </div>

      <div className="assistant-response-body">
        <p className="assistant-message-text">{message}</p>
      </div>
    </div>
  );
}

export default AssistantResponse;
