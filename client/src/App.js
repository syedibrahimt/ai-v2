import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import SessionStatus from './components/SessionStatus';
import AudioControls from './components/AudioControls';
import ConversationDisplay from './components/ConversationDisplay';
import ProblemArea from './components/ProblemArea';
import ProgressIndicator from './components/ProgressIndicator';
import QuickActions from './components/QuickActions';
import './App.css';

function App() {
  const [socket, setSocket] = useState(null);
  const [sessionActive, setSessionActive] = useState(false);
  const [currentAgent, setCurrentAgent] = useState(null);
  const [agentInfo, setAgentInfo] = useState({});
  const [conversation, setConversation] = useState([]);
  const [currentProblem, setCurrentProblem] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState(null);
  
  const mediaRecorderRef = useRef(null);
  const audioStreamRef = useRef(null);

  useEffect(() => {
    // Initialize socket connection
    const newSocket = io('http://localhost:3000');
    setSocket(newSocket);

    // Socket event listeners
    newSocket.on('connect', () => {
      console.log('Connected to server');
      setError(null);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server');
    });

    newSocket.on('session-started', (data) => {
      setSessionActive(true);
      setCurrentAgent(data.currentAgent);
      addToConversation('System', 'Session started! 🎉');
    });

    newSocket.on('agent-changed', (data) => {
      setCurrentAgent(data.currentAgent);
      setAgentInfo(data.agentInfo);
      addToConversation('System', `Now speaking with ${data.agentInfo.name} ${data.agentInfo.avatar}`);
    });

    newSocket.on('agent-response', (data) => {
      addToConversation(data.agentInfo.name || data.agent, data.text);
      
      // Extract problem if present
      if (data.agent === 'question-presenter' && data.text.includes(':')) {
        const problemMatch = data.text.match(/:\s*(.+?)(?:\.|Take|Let)/);
        if (problemMatch) {
          setCurrentProblem(problemMatch[1].trim());
        }
      }
    });

    newSocket.on('transcription', (data) => {
      if (data.speaker === 'student') {
        addToConversation('You', data.text);
      }
    });

    newSocket.on('audio-response', (data) => {
      // Play audio response
      playAudioResponse(data.audioData);
    });

    newSocket.on('session-ended', () => {
      setSessionActive(false);
      setCurrentAgent(null);
      addToConversation('System', 'Session ended. Thanks for learning with us! 👋');
    });

    newSocket.on('error', (data) => {
      setError(data.message);
      console.error('Socket error:', data);
    });

    return () => {
      newSocket.close();
    };
  }, []);

  const addToConversation = (speaker, message) => {
    setConversation(prev => [...prev, {
      id: Date.now(),
      speaker,
      message,
      timestamp: new Date()
    }]);
  };

  const startSession = () => {
    if (socket) {
      socket.emit('start-session');
      setError(null);
    }
  };

  const endSession = () => {
    if (socket) {
      socket.emit('end-session');
      stopRecording();
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      });
      
      audioStreamRef.current = stream;
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && socket) {
          const reader = new FileReader();
          reader.onload = () => {
            socket.emit('audio-data', reader.result);
          };
          reader.readAsArrayBuffer(event.data);
        }
      };
      
      mediaRecorder.start(1000); // Send audio chunks every second
      setIsRecording(true);
      
      // Set up audio level monitoring
      setupAudioLevelMonitoring(stream);
      
    } catch (error) {
      console.error('Error starting recording:', error);
      setError('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
    
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
      audioStreamRef.current = null;
    }
    
    setAudioLevel(0);
  };

  const setupAudioLevelMonitoring = (stream) => {
    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    const microphone = audioContext.createMediaStreamSource(stream);
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    
    microphone.connect(analyser);
    analyser.fftSize = 256;
    
    const updateAudioLevel = () => {
      if (isRecording) {
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        setAudioLevel(average);
        requestAnimationFrame(updateAudioLevel);
      }
    };
    
    updateAudioLevel();
  };

  const playAudioResponse = (audioData) => {
    // Simple audio playback - in a real implementation, you'd handle different audio formats
    try {
      const audio = new Audio();
      const blob = new Blob([audioData], { type: 'audio/wav' });
      audio.src = URL.createObjectURL(blob);
      audio.play();
    } catch (error) {
      console.error('Error playing audio:', error);
    }
  };

  const sendQuickAction = (action) => {
    if (socket) {
      socket.emit('user-message', action);
      addToConversation('You', action);
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>🧮 AI Math Tutor</h1>
        <p>Learn math with voice-powered AI tutors</p>
      </header>

      <div className="main-container">
        <div className="left-panel">
          <SessionStatus 
            active={sessionActive}
            currentAgent={currentAgent}
            agentInfo={agentInfo}
          />
          
          <AudioControls
            isRecording={isRecording}
            audioLevel={audioLevel}
            sessionActive={sessionActive}
            onStartSession={startSession}
            onEndSession={endSession}
            onStartRecording={startRecording}
            onStopRecording={stopRecording}
          />
          
          <ProgressIndicator currentAgent={currentAgent} />
          
          {sessionActive && (
            <QuickActions onAction={sendQuickAction} />
          )}
        </div>

        <div className="right-panel">
          <ConversationDisplay conversation={conversation} />
          
          {currentProblem && (
            <ProblemArea problem={currentProblem} />
          )}
        </div>
      </div>

      {error && (
        <div className="error-message">
          ⚠️ {error}
        </div>
      )}
    </div>
  );
}

export default App;