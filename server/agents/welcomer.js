const { Agent } = require('@mastra/core');
const { OpenAIRealtimeVoice } = require('@mastra/voice-openai-realtime');

class WelcomerAgent extends Agent {
  constructor() {
    super({
      name: 'welcomer',
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
  }

  async processMessage(message, context) {
    const response = await this.generateResponse(message, context);
    
    // Check if we should transition to question presenter
    const shouldTransition = this.shouldTransitionToQuestionPresenter(message, response);
    
    return {
      response,
      shouldTransition,
      nextAgent: shouldTransition ? 'question-presenter' : null,
      context: {
        ...context,
        studentLevel: this.extractStudentLevel(message, response),
        assessmentComplete: shouldTransition
      }
    };
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

module.exports = { WelcomerAgent };