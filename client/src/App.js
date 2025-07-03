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
  const [error, setError] = useState(null);
  const [voiceMode, setVoiceMode] = useState(true);

  useEffect(() => {
    // Initialize socket connection
    const newSocket = io('http://localhost:3001');
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
      // Play audio response using the global function
      if (window.playAudioResponse) {
        window.playAudioResponse(data.audioData);
      }
    });

    newSocket.on('voice-mode-changed', (data) => {
      setVoiceMode(data.enabled);
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
    }
  };

  const sendMessage = (message) => {
    if (socket && message.trim()) {
      socket.emit('user-message', message);
      addToConversation('You', message);
    }
  };

  const sendQuickAction = (action) => {
    if (socket) {
      socket.emit('user-message', action);
      addToConversation('You', action);
    }
  };

  const toggleVoiceMode = (enabled) => {
    setVoiceMode(enabled);
    if (socket) {
      socket.emit('toggle-voice-mode', enabled);
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
            sessionActive={sessionActive}
            onStartSession={startSession}
            onEndSession={endSession}
            socket={socket}
            voiceMode={voiceMode}
            onToggleVoiceMode={toggleVoiceMode}
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