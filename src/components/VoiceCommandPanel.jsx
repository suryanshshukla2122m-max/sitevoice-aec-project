import React, { useState } from 'react';
import { Mic, MicOff, Send, Loader2, Check, AlertCircle } from 'lucide-react';

const EXAMPLE_COMMANDS = [
  'Report a problem with cracked bathroom tile',
  'Create a task to inspect electrical wiring',
  'Show open problems',
  'Show pending tasks',
  'What is the project status?',
];

export function VoiceCommandPanel({
  isListening,
  interimTranscript,
  onStartListening,
  onStopListening,
  isInterpreting,
  onSendCommand,
  isVoiceSupported,
  voiceError,
  hasPendingAction,
  hasRecentSuccess,
}) {
  const [typedInput, setTypedInput] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!typedInput.trim() || isInterpreting) return;
    onSendCommand(typedInput.trim());
    setTypedInput('');
  };

  const handleExampleClick = (cmd) => {
    if (isInterpreting || isListening) return;
    onSendCommand(cmd);
  };

  // Status state text
  let statusText = 'Ready';
  let statusColor = 'ready';
  if (isListening) {
    statusText = 'Listening…';
    statusColor = 'listening';
  } else if (isInterpreting) {
    statusText = 'Processing…';
    statusColor = 'processing';
  } else if (hasPendingAction) {
    statusText = 'Review details';
    statusColor = 'confirming';
  } else if (hasRecentSuccess) {
    statusText = 'Saved';
    statusColor = 'success';
  } else if (voiceError) {
    statusText = 'Error';
    statusColor = 'error';
  }

  return (
    <div className="compact-voice-bar-wrapper">
      {/* Streamlined Voice + Text Command Bar */}
      <div className={`compact-voice-bar ${isListening ? 'is-listening' : ''} ${isInterpreting ? 'is-interpreting' : ''}`}>
        {/* Mic Action Button */}
        <button
          type="button"
          className={`compact-mic-btn ${statusColor}`}
          onClick={isListening ? onStopListening : onStartListening}
          disabled={isInterpreting}
          title={isListening ? 'Stop listening' : 'Start voice command'}
          aria-label={isListening ? 'Stop listening' : 'Start voice command'}
        >
          {isInterpreting ? (
            <Loader2 size={18} className="animate-spin" />
          ) : isListening ? (
            <MicOff size={18} />
          ) : hasRecentSuccess ? (
            <Check size={18} />
          ) : voiceError ? (
            <AlertCircle size={18} />
          ) : (
            <Mic size={18} />
          )}
        </button>

        {/* Input & Live Transcript Area */}
        <form onSubmit={handleSubmit} className="compact-input-form">
          <input
            type="text"
            className="compact-input-field"
            placeholder={
              isListening
                ? interimTranscript || 'Listening... Speak your command'
                : isInterpreting
                ? 'Processing command...'
                : 'Tap mic to speak, or type a command (e.g. Report a problem with bathroom tile)'
            }
            value={isListening ? interimTranscript : typedInput}
            onChange={(e) => !isListening && setTypedInput(e.target.value)}
            disabled={isInterpreting || isListening}
            aria-label="Voice or text command"
          />

          {/* Status badge pill inside bar */}
          <span className={`compact-status-badge ${statusColor}`}>
            <span className="status-dot" />
            <span className="status-text">{statusText}</span>
          </span>

          {/* Send button when text is typed */}
          {!isListening && typedInput.trim().length > 0 && (
            <button
              type="submit"
              className="compact-send-btn"
              disabled={isInterpreting}
              aria-label="Send command"
            >
              {isInterpreting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </button>
          )}
        </form>
      </div>

      {/* 7. Subtle Secondary Helper Area for Examples */}
      <div className="subtle-voice-helpers">
        <span className="helper-label">Try:</span>
        <div className="helper-chips">
          {EXAMPLE_COMMANDS.map((cmd, idx) => (
            <button
              key={idx}
              type="button"
              className="subtle-chip"
              onClick={() => handleExampleClick(cmd)}
              disabled={isInterpreting || isListening}
            >
              "{cmd}"
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default VoiceCommandPanel;
