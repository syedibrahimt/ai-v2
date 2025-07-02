const { Agent } = require('@mastra/core');
const { OpenAIRealtimeVoice } = require('@mastra/voice-openai-realtime');

class QuestionPresenterAgent extends Agent {
  constructor() {
    super({
      name: 'question-presenter',
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

  async processMessage(message, context) {
    let response;
    
    if (this.isFirstInteraction(context)) {
      response = await this.presentFirstProblem(context);
    } else {
      response = await this.handleStudentResponse(message, context);
    }
    
    const shouldTransitionToTutor = this.shouldTransitionToTutor(message);
    const shouldTransitionToWelcomer = this.shouldTransitionToWelcomer(message);
    
    return {
      response,
      shouldTransition: shouldTransitionToTutor || shouldTransitionToWelcomer,
      nextAgent: shouldTransitionToTutor ? 'step-by-step-tutor' : 
                 shouldTransitionToWelcomer ? 'welcomer' : null,
      context: {
        ...context,
        currentProblem: this.extractCurrentProblem(response),
        studentAnswer: message
      }
    };
  }

  isFirstInteraction(context) {
    return !context.currentProblem && context.assessmentComplete;
  }

  async presentFirstProblem(context) {
    const level = this.determineLevel(context.studentLevel);
    const problem = this.selectRandomProblem(level);
    
    return `Perfect! Based on what you've told me, here's a ${level} level problem for you: ${problem}. 
    Take your time and let me know what you think!`;
  }

  async handleStudentResponse(message, context) {
    const response = await this.generateResponse(message, context);
    
    if (this.isCorrectAnswer(message, context.currentProblem)) {
      const level = this.determineLevel(context.studentLevel);
      const nextProblem = this.selectRandomProblem(level);
      return `${response} Excellent work! Ready for another one? ${nextProblem}`;
    }
    
    return response;
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

module.exports = { QuestionPresenterAgent };