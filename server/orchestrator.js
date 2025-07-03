import { WelcomerAgent } from './agents/welcomer.js';
import { QuestionPresenterAgent } from './agents/question-presenter.js';
import { StepByStepTutorAgent } from './agents/step-by-step-tutor.js';
import { Readable } from 'stream';

class TutoringOrchestrator {
  constructor() {
    this.agents = {
      'welcomer': new WelcomerAgent(),
      'question-presenter': new QuestionPresenterAgent(),
      'step-by-step-tutor': new StepByStepTutorAgent()
    };
    
    this.sessions = new Map(); // sessionId -> session state
  }

  async startSession(sessionId, socket) {
    const sessionState = {
      currentAgent: 'welcomer',
      context: {
        studentLevel: null,
        assessmentComplete: false,
        currentProblem: null,
        sessionProgress: [],
        startTime: new Date()
      },
      socket: socket,
      voiceMode: true,
      audioStream: null
    };
    
    this.sessions.set(sessionId, sessionState);
    
    // Start with welcomer agent
    await this.switchToAgent(sessionId, 'welcomer');
    
    // Initialize voice connection for the current agent
    try {
      const currentAgent = this.agents['welcomer'];
      await currentAgent.initializeVoice(socket);
      
      // Create audio stream for continuous audio input
      sessionState.audioStream = this.createAudioStream(sessionId);
      
      // Set up agent transition handler
      socket.on('agent-transition', async (data) => {
        await this.handleAgentTransition(sessionId, data);
      });
      
      // Start the conversation after a short delay to ensure connection is stable
      setTimeout(async () => {
        try {
          await currentAgent.startConversation();
        } catch (error) {
          console.error('Error starting conversation:', error);
        }
      }, 1000);
      
      console.log('Voice mode enabled for session', sessionId);
    } catch (error) {
      console.error('Error setting up voice:', error);
      sessionState.voiceMode = false;
      // Notify frontend about voice setup failure
      socket.emit('error', { 
        message: 'Voice setup failed. Please try again or check your microphone permissions.' 
      });
    }
    
    return sessionState;
  }

  async switchToAgent(sessionId, agentName) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }
    
    const previousAgent = session.currentAgent;
    session.currentAgent = agentName;
    
    // Log the transition
    session.context.sessionProgress.push({
      timestamp: new Date(),
      transition: `${previousAgent} -> ${agentName}`,
      reason: 'agent_switch'
    });
    
    // Notify frontend about agent change
    session.socket.emit('agent-changed', {
      previousAgent,
      currentAgent: agentName,
      agentInfo: this.getAgentInfo(agentName)
    });
    
    console.log(`Session ${sessionId}: Switched from ${previousAgent} to ${agentName}`);
  }

  async handleAgentTransition(sessionId, data) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    // Switch to the next agent
    await this.switchToAgent(sessionId, data.nextAgent);
    
    // Initialize voice for the new agent
    if (session.voiceMode) {
      try {
        const newAgent = this.agents[data.nextAgent];
        await newAgent.initializeVoice(session.socket);
        
        // Reconnect the audio stream to the new agent
        if (session.audioStream && !session.audioStream.destroyed) {
          newAgent.voice.send(session.audioStream).catch(error => {
            console.error(`Error reconnecting audio stream to ${data.nextAgent}:`, error);
          });
        }
        
        // Start conversation with context
        if (data.nextAgent === 'question-presenter') {
          session.context.assessmentComplete = true;
          await newAgent.startConversation(session.context);
        } else if (data.nextAgent === 'step-by-step-tutor') {
          await newAgent.startConversation(session.context);
        }
      } catch (error) {
        console.error(`Error transitioning to ${data.nextAgent}:`, error);
      }
    }
  }

  async handleMessage(sessionId, message) {
    // Text messages are no longer processed since we're using voice-only mode
    // This method is kept for backwards compatibility but does nothing
    console.log(`Text message received for session ${sessionId} but system is voice-only: ${message}`);
  }

  createAudioStream(sessionId) {
    const audioStream = new Readable({
      read() {
        // No-op: data is pushed externally
      }
    });

    // Set up the stream to forward audio to the current agent
    const session = this.sessions.get(sessionId);
    if (session && session.voiceMode) {
      const currentAgent = this.agents[session.currentAgent];
      if (currentAgent && currentAgent.voiceConnected) {
        // Start sending the stream to the agent's voice connection
        currentAgent.voice.send(audioStream).catch(error => {
          console.error(`Error sending audio stream for session ${sessionId}:`, error);
        });
      }
    }

    return audioStream;
  }

  async handleAudio(sessionId, audioData) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }
    
    if (!session.voiceMode) {
      console.log(`Audio data received for session ${sessionId} but voice mode is disabled`);
      return;
    }
    
    try {
      // Push audio data to the continuous stream
      if (session.audioStream && !session.audioStream.destroyed) {
        const audioBuffer = Buffer.from(audioData);
        session.audioStream.push(audioBuffer);
      }
    } catch (error) {
      console.error(`Error processing audio for session ${sessionId}:`, error);
      session.socket.emit('error', { 
        message: 'Error processing audio input',
        error: error.message 
      });
    }
  }

  // Response sending is now handled by voice events in agents
  // This method is no longer needed but kept for backwards compatibility

  setupAudioHandling(sessionId, audioStream) {
    audioStream.on('data', (audioData) => {
      this.handleAudio(sessionId, audioData);
    });
    
    audioStream.on('error', (error) => {
      console.error(`Audio stream error for session ${sessionId}:`, error);
    });
  }

  getAgentInfo(agentName) {
    const agentDescriptions = {
      'welcomer': {
        name: 'Welcomer',
        description: 'Getting to know you...',
        voice: 'alloy',
        avatar: '👋',
        role: 'Greeting and assessment'
      },
      'question-presenter': {
        name: 'Question Presenter',
        description: 'Here\'s your problem...',
        voice: 'nova',
        avatar: '📚',
        role: 'Problem presentation'
      },
      'step-by-step-tutor': {
        name: 'Step-by-Step Tutor',
        description: 'Let\'s work through this...',
        voice: 'shimmer',
        avatar: '🎯',
        role: 'Guided learning'
      }
    };
    
    return agentDescriptions[agentName] || {};
  }

  async endSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      // Clean up audio stream
      if (session.audioStream && !session.audioStream.destroyed) {
        session.audioStream.push(null); // End the stream
        session.audioStream.destroy();
      }
      
      // Log session end
      session.context.sessionProgress.push({
        timestamp: new Date(),
        event: 'session_ended',
        duration: new Date() - session.context.startTime
      });
      
      console.log(`Session ${sessionId} ended. Duration: ${new Date() - session.context.startTime}ms`);
      
      // Remove session
      this.sessions.delete(sessionId);
    }
  }

  // Utility methods
  getSessionInfo(sessionId) {
    return this.sessions.get(sessionId);
  }

  getAllActiveSessions() {
    return Array.from(this.sessions.keys());
  }

  getSessionStats() {
    return {
      activeSessions: this.sessions.size,
      totalAgents: Object.keys(this.agents).length
    };
  }
}

export { TutoringOrchestrator };