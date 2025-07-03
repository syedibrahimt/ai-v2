import React, { useState, useRef, useEffect } from 'react';

const AudioControls = ({ 
  sessionActive, 
  onStartSession, 
  onEndSession,
  socket,
  voiceMode,
  onToggleVoiceMode
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [micPermission, setMicPermission] = useState('prompt');
  const [spacebarPressed, setSpacebarPressed] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const streamRef = useRef(null);
  const isRecordingRef = useRef(false);

  useEffect(() => {
    // Check microphone permission on component mount
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'microphone' }).then((result) => {
        setMicPermission(result.state);
      });
    }
  }, []);

  // Spacebar push-to-talk functionality
  useEffect(() => {
    if (!sessionActive || !voiceMode) return;

    const handleKeyDown = (event) => {
      if (event.code === 'Space' && !event.repeat && !spacebarPressed) {
        event.preventDefault();
        setSpacebarPressed(true);
        if (!isRecordingRef.current) {
          startRecording();
        }
      }
    };

    const handleKeyUp = (event) => {
      if (event.code === 'Space' && spacebarPressed) {
        event.preventDefault();
        setSpacebarPressed(false);
        if (isRecordingRef.current) {
          stopRecording();
        }
      }
    };

    // Add global event listeners
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [sessionActive, voiceMode, spacebarPressed]);

  const requestMicrophoneAccess = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      streamRef.current = stream;
      setMicPermission('granted');
      
      // Set up audio analysis for visual feedback
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      
      analyser.fftSize = 256;
      microphone.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      
      // Start audio level monitoring
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateAudioLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        setAudioLevel(average / 255 * 100);
        
        if (isRecording) {
          requestAnimationFrame(updateAudioLevel);
        }
      };
      
      if (isRecording) {
        updateAudioLevel();
      }
      
      return stream;
    } catch (error) {
      console.error('Error accessing microphone:', error);
      setMicPermission('denied');
      throw error;
    }
  };

  const startRecording = async () => {
    try {
      const stream = streamRef.current || await requestMicrophoneAccess();
      
      // Try to use the best available audio format
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'audio/mp4';
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = ''; // Use default
          }
        }
      }

      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
      
      // Stream audio data in real-time
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && socket) {
          const reader = new FileReader();
          reader.onload = () => {
            socket.emit('audio-data', reader.result);
          };
          reader.readAsArrayBuffer(event.data);
        }
      };
      
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(50); // Send data every 50ms for better real-time streaming
      setIsRecording(true);
      isRecordingRef.current = true;
      
      // Start audio level monitoring
      if (analyserRef.current) {
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        const updateAudioLevel = () => {
          if (isRecordingRef.current) {
            analyserRef.current.getByteFrequencyData(dataArray);
            const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
            setAudioLevel(average / 255 * 100);
            requestAnimationFrame(updateAudioLevel);
          }
        };
        updateAudioLevel();
      }
      
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecordingRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      isRecordingRef.current = false;
      setAudioLevel(0);
    }
  };

  const playAudio = (audioData) => {
    try {
      // Handle different audio data formats
      let audioBlob;
      if (audioData instanceof ArrayBuffer) {
        audioBlob = new Blob([audioData], { type: 'audio/wav' });
      } else if (typeof audioData === 'string') {
        // Base64 encoded audio
        const binaryString = atob(audioData);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        audioBlob = new Blob([bytes], { type: 'audio/wav' });
      } else {
        // Assume it's already a Blob or similar
        audioBlob = new Blob([audioData], { type: 'audio/wav' });
      }
      
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      audio.oncanplaythrough = () => {
        audio.play().catch(err => console.error('Audio play error:', err));
      };
      
      audio.onerror = (err) => {
        console.error('Audio loading error:', err);
      };
      
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
      };
      
    } catch (error) {
      console.error('Error playing audio:', error);
    }
  };

  // Expose playAudio function to parent component
  useEffect(() => {
    if (window) {
      window.playAudioResponse = playAudio;
    }
  }, []);

  return (
    <div className="card audio-controls">
      <h3>Session Controls</h3>
      
      <div className="session-controls">
        {!sessionActive ? (
          <button 
            className="control-button primary" 
            onClick={onStartSession}
          >
            🎓 Start Tutoring
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
        <>
          <div className="voice-mode-toggle">
            <label>
              <input
                type="checkbox"
                checked={voiceMode}
                onChange={(e) => onToggleVoiceMode(e.target.checked)}
              />
              🎤 Voice Mode
            </label>
          </div>

          {voiceMode && (
            <div className="voice-controls">
              <h4>Voice Controls</h4>
              
              {micPermission === 'denied' && (
                <div className="permission-warning">
                  ⚠️ Microphone access denied. Please enable in browser settings.
                </div>
              )}
              
              {micPermission === 'granted' && (
                <>
                  <div className="spacebar-instructions">
                    <div className={`spacebar-indicator ${spacebarPressed ? 'pressed' : ''}`}>
                      ⌨️ Hold SPACEBAR to talk
                    </div>
                    {spacebarPressed && (
                      <div className="speaking-indicator">
                        🎤 Speaking...
                      </div>
                    )}
                  </div>
                  
                  {isRecording && (
                    <div className="audio-level">
                      <div className="audio-level-bar">
                        <div 
                          className="audio-level-fill" 
                          style={{ width: `${audioLevel}%` }}
                        />
                      </div>
                      <small>Audio Level: {Math.round(audioLevel)}%</small>
                    </div>
                  )}
                </>
              )}
              
              {micPermission === 'prompt' && (
                <>
                  <div className="spacebar-instructions">
                    <div className="spacebar-indicator">
                      ⌨️ Hold SPACEBAR to talk
                    </div>
                    <small>Enable microphone first</small>
                  </div>
                  <button 
                    className="control-button secondary"
                    onClick={requestMicrophoneAccess}
                  >
                    🎤 Enable Microphone
                  </button>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AudioControls;