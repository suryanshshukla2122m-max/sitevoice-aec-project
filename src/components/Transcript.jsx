import React from 'react';
import { MessageSquare, Clock } from 'lucide-react';

export function Transcript({ transcript, timestamp }) {
  if (!transcript) return null;

  return (
    <div className="transcript-card" role="region" aria-label="Spoken Command Transcript">
      <div className="transcript-header">
        <div className="transcript-user-tag">
          <MessageSquare size={13} aria-hidden="true" />
          <span>YOUR INSTRUCTION</span>
        </div>
        {timestamp && (
          <div className="transcript-timestamp">
            <Clock size={12} aria-hidden="true" />
            <span>{timestamp}</span>
          </div>
        )}
      </div>
      <div className="transcript-body">
        <p className="transcript-text">"{transcript}"</p>
      </div>
    </div>
  );
}

export default Transcript;
