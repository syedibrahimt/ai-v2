import React from 'react';

const AudioControls = ({ 
  isRecording, 
  audioLevel, 
  sessionActive, 
  onStartSession, 
  onEndSession, 
  onStartRecording, 
  onStopRecording 
}) => {
  return (
    <div className="card audio-controls">
      <h3>Audio Controls</h3>
      
      <div>
        {!sessionActive ? (
          <button 
            className="control-button primary" 
            onClick={onStartSession}
          >
            🎤 Start Session
          </button>
        ) : (
          <button 
            className="control-button danger" 
            onClick={onEndSession}
          >
            ⏹️ End Session
          </button>
        )}
      </div>

      {sessionActive && (
        <div>
          {!isRecording ? (
            <button 
              className="control-button" 
              onClick={onStartRecording}
            >
              🎙️ Start Talking
            </button>
          ) : (
            <button 
              className="control-button danger" 
              onClick={onStopRecording}
            >
              ⏸️ Stop Talking
            </button>
          )}
        </div>
      )}

      {isRecording && (
        <div className="audio-level">
          <div>Audio Level</div>
          <div className="audio-level-bar">
            <div 
              className="audio-level-fill"
              style={{ width: `${Math.min(audioLevel / 255 * 100, 100)}%` }}
            ></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AudioControls;