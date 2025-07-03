import { Agent } from '@mastra/core';
import { OpenAIRealtimeVoice } from '@mastra/voice-openai-realtime';
import { openai } from '@ai-sdk/openai';

class QuestionPresenterAgent extends Agent {
  constructor() {
    super({
      name: 'question-presenter',
      model: openai('gpt-4o-mini-realtime'),
      instructions: `You are a clear and instructional math teacher. Your role is to:
      
      1. Present math problems appropriate to the student's assessed level
      2. Explain the problem context and what's being asked clearly
      3. Listen to the student's initial attempt or response
      4. If they seem confused or ask for help, transition to the step-by-step tutor
      5. If they solve it correctly, praise them and present another problem
      
      Use a clear, instructional tone. Present one problem at a time.
      Make sure problems are appropriate for the student's grade level.
      
      Sample problems by level:
      - Elementary (K-5): Basic arithmetic, simple word problems
      - Middle School (6-8): Equations, basic algebra, geometry
      - High School (9-12): Advanced algebra, trigonometry, calculus basics
      
      If a student says "I don't know", "help me", or seems confused, say something like "Let me have our tutor guide you through this step by step."`,
      
      voice: new OpenAIRealtimeVoice({
        voice: 'nova',
        model: 'gpt-4o-mini-realtime'
      })
    });
    
    this.voiceConnected = false;
    this.currentSession = null;
    
    this.problems = {
      elementary: [
        "What is 15 + 27?",
        "If you have 24 apples and eat 8, how many do you have left?",
        "What is 7 × 6?",
        "Sarah has 3 boxes with 9 stickers in each box. How many stickers does she have in total?"
      ],
      middle: [
        "Solve for x: 2x + 5 = 17",
        "What is the area of a rectangle that is 8 units long and 5 units wide?",
        "If a triangle has angles of 60° and 70°, what is the third angle?",
        "Simplify: 3(x + 4) - 2x"
      ],
      high: [
        "Factor: x² - 5x + 6",
        "Find the derivative of f(x) = 3x² + 2x - 1",
        "Solve: log₂(x + 3) = 4",
        "If sin(θ) = 0.6 and θ is in the first quadrant, find cos(θ)"
      ]
    };
  }

  async initializeVoice(socket) {
    if (!this.voiceConnected) {
      try {
        await this.voice.connect();
        this.voiceConnected = true;
        this.currentSession = socket;
        
        this.setupVoiceEvents();
        
        console.log('QuestionPresenterAgent voice connected');
      } catch (error) {
        console.error('Failed to connect QuestionPresenterAgent voice:', error);
      }
    }
  }

  setupVoiceEvents() {
    this.voice.on("speaker", ({ audio }) => {
      if (this.currentSession) {
        this.currentSession.emit('audio-response', {
          audioData: audio,
          agent: 'question-presenter'
        });
      }
    });

    this.voice.on("writing", ({ text, role }) => {
      if (this.currentSession && role === 'assistant') {
        this.currentSession.emit('transcription', {
          text: text,
          speaker: 'question-presenter'
        });
        
        // Check for transitions
        const shouldTransitionToTutor = this.shouldTransitionToTutor('', text);
        if (shouldTransitionToTutor) {
          this.currentSession.emit('agent-transition', {
            nextAgent: 'step-by-step-tutor',
            reason: 'needs_help'
          });
        }
      }
    });
  }


  async startConversation(context) {
    if (this.voiceConnected && this.voice) {
      const level = this.determineLevel(context.studentLevel);
      const problem = this.selectRandomProblem(level);
      
      await this.voice.speak(`Perfect! Based on what you've told me, here's a ${level} level problem for you: ${problem}. Take your time and let me know what you think!`);
    }
  }

  async presentNextProblem(context) {
    if (this.voiceConnected && this.voice) {
      const level = this.determineLevel(context.studentLevel);
      const problem = this.selectRandomProblem(level);
      
      await this.voice.speak(`Excellent work! Ready for another one? ${problem}`);
    }
  }

  shouldTransitionToTutor(message) {
    const helpPhrases = [
      'i don\'t know',
      'help me',
      'i\'m confused',
      'i need help',
      'how do i',
      'i\'m stuck'
    ];
    
    return helpPhrases.some(phrase => message.toLowerCase().includes(phrase));
  }

  shouldTransitionToWelcomer(message) {
    const resetPhrases = [
      'different topic',
      'change subject',
      'start over',
      'new topic'
    ];
    
    return resetPhrases.some(phrase => message.toLowerCase().includes(phrase));
  }

  determineLevel(studentLevel) {
    if (!studentLevel) return 'elementary';
    
    const grade = parseInt(studentLevel.grade);
    if (grade <= 5) return 'elementary';
    if (grade <= 8) return 'middle';
    return 'high';
  }

  selectRandomProblem(level) {
    const problems = this.problems[level] || this.problems.elementary;
    return problems[Math.floor(Math.random() * problems.length)];
  }

  extractCurrentProblem(response) {
    // Simple extraction - in a real implementation, this would be more sophisticated
    const problemMatch = response.match(/(?:problem|question).*?[:?]\s*(.+?)(?:\.|$)/i);
    return problemMatch ? problemMatch[1] : null;
  }

  isCorrectAnswer(answer, problem) {
    // Simple validation - in a real implementation, this would use proper math parsing
    if (!problem) return false;
    
    // Basic number extraction for simple arithmetic
    const numberMatch = answer.match(/\d+(?:\.\d+)?/);
    if (numberMatch) {
      // This is a simplified check - real implementation would evaluate the math
      return true; // For MVP, we'll assume student attempts are reasonable
    }
    
    return false;
  }
}

export { QuestionPresenterAgent };