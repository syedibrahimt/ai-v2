import { Agent } from '@mastra/core';
import { OpenAIRealtimeVoice } from '@mastra/voice-openai-realtime';
import { openai } from '@ai-sdk/openai';

class WelcomerAgent extends Agent {
  constructor() {
    super({
      name: 'welcomer',
      model: openai('gpt-4o-mini-realtime'),
      instructions: `You are a friendly and welcoming math tutor. Your role is to:
      
      1. Greet students warmly and make them feel comfortable
      2. Ask about their grade level and math comfort level
      3. Determine what type of math problems would be appropriate for them
      4. Once you understand their level, transition them to the question presenter
      
      Keep your responses brief and encouraging. Use a friendly, patient tone.
      Ask one question at a time to avoid overwhelming the student.
      
      When ready to move to problems, say something like "Great! Let me have my colleague present you with a math problem that's perfect for your level."`,
      
      voice: new OpenAIRealtimeVoice({
        voice: 'alloy',
        model: 'gpt-4o-mini-realtime'
      })
    });
    
    this.voiceConnected = false;
    this.currentSession = null;
  }

  async initializeVoice(socket) {
    if (!this.voiceConnected) {
      try {
        await this.voice.connect();
        this.voiceConnected = true;
        this.currentSession = socket;
        
        // Set up voice event handlers
        this.setupVoiceEvents();
        
        console.log('WelcomerAgent voice connected');
      } catch (error) {
        console.error('Failed to connect WelcomerAgent voice:', error);
      }
    }
  }

  setupVoiceEvents() {
    // Handle agent speech output
    this.voice.on("speaker", ({ audio }) => {
      if (this.currentSession) {
        this.currentSession.emit('audio-response', {
          audioData: audio,
          agent: 'welcomer'
        });
      }
    });

    // Handle conversation events
    this.voice.on("writing", ({ text, role }) => {
      if (this.currentSession && role === 'assistant') {
        // Send transcription for display
        this.currentSession.emit('transcription', {
          text: text,
          speaker: 'welcomer'
        });
        
        // Check for transitions
        const shouldTransition = this.shouldTransitionToQuestionPresenter('', text);
        if (shouldTransition) {
          this.currentSession.emit('agent-transition', {
            nextAgent: 'question-presenter',
            reason: 'assessment_complete'
          });
        }
      }
    });
  }


  async startConversation() {
    // Start the conversation with a welcome message
    if (this.voiceConnected && this.voice) {
      await this.voice.speak("Hello! I'm here to help you with math. What grade are you in, and how comfortable do you feel with math?");
    }
  }

  shouldTransitionToQuestionPresenter(message, response) {
    const transitionPhrases = [
      'ready for a problem',
      'give me a problem',
      'let\'s start',
      'i\'m ready',
      'show me a problem'
    ];
    
    const messageText = message.toLowerCase();
    const responseText = response.toLowerCase();
    
    return transitionPhrases.some(phrase => 
      messageText.includes(phrase) || 
      responseText.includes('colleague') ||
      responseText.includes('question presenter')
    );
  }

  extractStudentLevel(message, response) {
    const gradePattern = /grade\s*(\d+)|(\d+)th\s*grade/i;
    const levelPattern = /(beginner|intermediate|advanced|elementary|middle|high)/i;
    
    const gradeMatch = message.match(gradePattern) || response.match(gradePattern);
    const levelMatch = message.match(levelPattern) || response.match(levelPattern);
    
    return {
      grade: gradeMatch ? gradeMatch[1] || gradeMatch[2] : null,
      level: levelMatch ? levelMatch[1] : null
    };
  }
}

export { WelcomerAgent };