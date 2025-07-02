const { WelcomerAgent } = require('./agents/welcomer');
const { QuestionPresenterAgent } = require('./agents/question-presenter');
const { StepByStepTutorAgent } = require('./agents/step-by-step-tutor');
const { getMicrophoneStream, playAudio } = require('@mastra/node-audio');

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
      audioStream: null
    };
    
    this.sessions.set(sessionId, sessionState);
    
    // Start with welcomer agent
    await this.switchToAgent(sessionId, 'welcomer');
    
    // Initialize audio streaming
    try {
      sessionState.audioStream = await getMicrophoneStream();
      this.setupAudioHandling(sessionId, sessionState.audioStream);
    } catch (error) {
      console.error('Error setting up audio:', error);
    }
    
    // Send welcome message
    const welcomeMessage = "Hello! I'm here to help you with math. What grade are you in, and how comfortable do you feel with math?";
    await this.sendResponse(sessionId, welcomeMessage, 'welcomer');
    
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

  async handleMessage(sessionId, message) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }
    
    const currentAgent = this.agents[session.currentAgent];
    if (!currentAgent) {
      throw new Error(`Agent ${session.currentAgent} not found`);
    }
    
    try {
      // Process message with current agent
      const result = await currentAgent.processMessage(message, session.context);
      
      // Update session context
      session.context = result.context;
      
      // Handle agent transition if needed
      if (result.shouldTransition && result.nextAgent) {
        await this.switchToAgent(sessionId, result.nextAgent);
        
        // If switching to question presenter and it's the first time, let it generate its first problem
        if (result.nextAgent === 'question-presenter' && result.context.assessmentComplete) {
          const nextAgent = this.agents[result.nextAgent];
          const followupResult = await nextAgent.processMessage('', result.context);
          await this.sendResponse(sessionId, followupResult.response, result.nextAgent);
          return;
        }
      }
      
      // Send response to frontend
      await this.sendResponse(sessionId, result.response, session.currentAgent);
      
    } catch (error) {
      console.error(`Error processing message for session ${sessionId}:`, error);
      session.socket.emit('error', { 
        message: 'Sorry, I encountered an error. Please try again.',
        error: error.message 
      });
    }
  }

  async handleAudio(sessionId, audioData) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }
    
    try {
      // Process audio with current agent's voice capabilities
      const currentAgent = this.agents[session.currentAgent];
      
      if (currentAgent.voice) {
        // Use Mastra's voice processing
        const transcription = await currentAgent.voice.processAudio(audioData);
        
        if (transcription && transcription.text) {
          // Process the transcribed text as a regular message
          await this.handleMessage(sessionId, transcription.text);
          
          // Send transcription to frontend for display
          session.socket.emit('transcription', {
            text: transcription.text,
            speaker: 'student'
          });
        }
      }
    } catch (error) {
      console.error(`Error processing audio for session ${sessionId}:`, error);
    }
  }

  async sendResponse(sessionId, response, agentName) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }
    
    // Send text response to frontend
    session.socket.emit('agent-response', {
      text: response,
      agent: agentName,
      timestamp: new Date(),
      agentInfo: this.getAgentInfo(agentName)
    });
    
    // Generate and send audio response
    try {
      const agent = this.agents[agentName];
      if (agent.voice) {
        const audioResponse = await agent.voice.generateSpeech(response);
        
        if (audioResponse) {
          session.socket.emit('audio-response', {
            audioData: audioResponse,
            agent: agentName
          });
          
          // Play audio on server side if needed
          // await playAudio(audioResponse);
        }
      }
    } catch (error) {
      console.error(`Error generating audio response:`, error);
    }
    
    // Send transcription for display
    session.socket.emit('transcription', {
      text: response,
      speaker: agentName
    });
  }

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
      if (session.audioStream) {
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

module.exports = { TutoringOrchestrator };