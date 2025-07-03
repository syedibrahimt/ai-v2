import { Agent } from '@mastra/core';
import { OpenAIRealtimeVoice } from '@mastra/voice-openai-realtime';
import { openai } from '@ai-sdk/openai';

class StepByStepTutorAgent extends Agent {
  constructor() {
    super({
      name: 'step-by-step-tutor',
      model: openai('gpt-4o-mini-realtime'),
      instructions: `You are a patient and encouraging math tutor. Your role is to:
      
      1. Break down complex problems into manageable steps
      2. Guide students through the solution process step by step
      3. Provide hints and encouragement without giving away the answer
      4. Check understanding at each step before moving to the next
      5. When the problem is solved, transition back to the question presenter
      
      Use a patient, encouraging tone. Ask "Do you understand this step?" or "Are you with me so far?" frequently.
      
      Teaching approach:
      - Start with what the student knows
      - Introduce one concept at a time
      - Use simple language and concrete examples
      - Celebrate small wins and progress
      - If they're still confused, try a different explanation approach
      
      When the student successfully completes the problem or shows understanding, say something like "Excellent! You've got it! Let me have my colleague give you another problem to practice with."`,
      
      voice: new OpenAIRealtimeVoice({
        voice: 'shimmer',
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
        
        this.setupVoiceEvents();
        
        console.log('StepByStepTutorAgent voice connected');
      } catch (error) {
        console.error('Failed to connect StepByStepTutorAgent voice:', error);
      }
    }
  }

  setupVoiceEvents() {
    this.voice.on("speaker", ({ audio }) => {
      if (this.currentSession) {
        this.currentSession.emit('audio-response', {
          audioData: audio,
          agent: 'step-by-step-tutor'
        });
      }
    });

    this.voice.on("writing", ({ text, role }) => {
      if (this.currentSession && role === 'assistant') {
        this.currentSession.emit('transcription', {
          text: text,
          speaker: 'step-by-step-tutor'
        });
        
        // Check for transitions back to question presenter
        const shouldTransitionToQuestionPresenter = this.shouldTransitionToQuestionPresenter('', text);
        if (shouldTransitionToQuestionPresenter) {
          this.currentSession.emit('agent-transition', {
            nextAgent: 'question-presenter',
            reason: 'problem_solved'
          });
        }
      }
    });
  }


  async startConversation(context) {
    if (this.voiceConnected && this.voice) {
      await this.voice.speak("I'm here to help you work through this step by step. Let's break down the problem together. What part are you having trouble with?");
    }
  }


  shouldTransitionToQuestionPresenter(message, response) {
    const completionPhrases = [
      'got it',
      'i understand',
      'that makes sense',
      'i see',
      'oh okay',
      'next problem',
      'another problem'
    ];
    
    const responseIndicators = [
      'excellent',
      'great job',
      'you\'ve got it',
      'perfect',
      'colleague',
      'question presenter'
    ];
    
    const messageText = message.toLowerCase();
    const responseText = response.toLowerCase();
    
    return completionPhrases.some(phrase => messageText.includes(phrase)) ||
           responseIndicators.some(phrase => responseText.includes(phrase));
  }

  shouldTransitionToWelcomer(message) {
    const resetPhrases = [
      'different topic',
      'change subject',
      'start over',
      'new topic',
      'different problem type'
    ];
    
    return resetPhrases.some(phrase => message.toLowerCase().includes(phrase));
  }

  extractCurrentStep(response) {
    // Extract step indicators from response
    const stepPattern = /step\s*(\d+)|first|second|third|next|finally/i;
    const match = response.match(stepPattern);
    return match ? match[0] : 'guidance';
  }

  assessProgress(message, context) {
    const positiveIndicators = [
      'yes',
      'got it',
      'understand',
      'makes sense',
      'i see',
      'okay'
    ];
    
    const negativeIndicators = [
      'no',
      'don\'t understand',
      'confused',
      'lost',
      'don\'t get it'
    ];
    
    const messageText = message.toLowerCase();
    
    if (positiveIndicators.some(phrase => messageText.includes(phrase))) {
      return 'good';
    } else if (negativeIndicators.some(phrase => messageText.includes(phrase))) {
      return 'needs_more_help';
    }
    
    return 'neutral';
  }

  // Helper methods for different types of problems
  getTutoringSteps(problem, level) {
    // This would contain specific step-by-step breakdowns for different problem types
    // For MVP, we'll keep it simple and let the AI generate appropriate steps
    
    const commonSteps = {
      algebraic: [
        "Let's identify what we're solving for",
        "What operations do we see in the equation?",
        "How can we isolate the variable?",
        "Let's work through this step by step"
      ],
      arithmetic: [
        "Let's break this down into smaller parts",
        "What operation should we do first?",
        "Can you try this part?",
        "Now let's put it all together"
      ],
      word_problem: [
        "Let's read the problem carefully",
        "What information are we given?",
        "What are we trying to find?",
        "How can we set up the equation?"
      ]
    };
    
    // Simple problem type detection
    if (problem && problem.includes('x') && problem.includes('=')) {
      return commonSteps.algebraic;
    } else if (problem && /\d+\s*[+\-×÷]\s*\d+/.test(problem)) {
      return commonSteps.arithmetic;
    } else {
      return commonSteps.word_problem;
    }
  }
}

export { StepByStepTutorAgent };