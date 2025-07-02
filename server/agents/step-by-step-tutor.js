const { Agent } = require('@mastra/core');
const { OpenAIRealtimeVoice } = require('@mastra/voice-openai-realtime');

class StepByStepTutorAgent extends Agent {
  constructor() {
    super({
      name: 'step-by-step-tutor',
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
  }

  async processMessage(message, context) {
    const response = await this.generateTutoringResponse(message, context);
    
    const shouldTransitionToQuestionPresenter = this.shouldTransitionToQuestionPresenter(message, response);
    const shouldTransitionToWelcomer = this.shouldTransitionToWelcomer(message);
    
    return {
      response,
      shouldTransition: shouldTransitionToQuestionPresenter || shouldTransitionToWelcomer,
      nextAgent: shouldTransitionToQuestionPresenter ? 'question-presenter' : 
                 shouldTransitionToWelcomer ? 'welcomer' : null,
      context: {
        ...context,
        tutoringStep: this.extractCurrentStep(response),
        studentProgress: this.assessProgress(message, context)
      }
    };
  }

  async generateTutoringResponse(message, context) {
    const problem = context.currentProblem;
    const studentLevel = context.studentLevel;
    
    // Customize response based on the type of problem and student's confusion
    const prompt = this.buildTutoringPrompt(message, problem, studentLevel, context);
    
    return await this.generateResponse(message, {
      ...context,
      customPrompt: prompt
    });
  }

  buildTutoringPrompt(message, problem, studentLevel, context) {
    return `
    Student is working on: ${problem || 'a math problem'}
    Student level: ${studentLevel?.grade ? `Grade ${studentLevel.grade}` : 'Not specified'}
    Student just said: "${message}"
    
    Provide step-by-step guidance. Break down the solution into small, manageable steps.
    Check their understanding frequently. Be encouraging and patient.
    
    If this is the first time helping with this problem, start by asking what part they're confused about.
    If they've made progress, acknowledge it and guide them to the next step.
    
    Remember: Don't give the answer directly - guide them to discover it themselves.
    `;
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

module.exports = { StepByStepTutorAgent };