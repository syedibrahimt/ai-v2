# Real-Time Math Tutoring System
## Multi-Agent AI with Voice Capabilities

---

## System Architecture

```
Frontend Interface
    ↓
WebRTC Audio + Socket.io
    ↓
Mastra.ai Orchestrator
    ↓
Three Specialized Agents + OpenAI Realtime Voice
```

---

## Required Packages

### Backend
```json
{
  "dependencies": {
    "@mastra/core": "latest",
    "@mastra/voice-openai-realtime": "latest",
    "@mastra/node-audio": "latest",
    "@ai-sdk/openai": "latest",
    "express": "^4.18.0",
    "socket.io": "^4.7.0"
  }
}
```

### Frontend
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "socket.io-client": "^4.7.0"
  }
}
```

---

## Docs
- **Mastra.ai**: https://mastra.ai/en/docs
- **Socket.io**: https://socket.io/docs/v4/


## Three-Agent System

### 1. Welcomer Agent
- **Role**: Greets students and assesses their math level
- **Voice**: "alloy" - friendly and welcoming tone
- **Responsibilities**:
  - Welcome students to the tutoring session
  - Ask about their grade level and math comfort
  - Determine which type of problems to start with
  - Transition to Question Presenter Agent

### 2. Question Presenter Agent  
- **Role**: Presents math problems appropriate to student level
- **Voice**: "nova" - clear and instructional tone
- **Responsibilities**:
  - Present math problems based on student assessment
  - Explain problem context and what's being asked
  - Listen to student's initial attempt or confusion
  - Transition to Step-by-Step Tutor Agent when help needed

### 3. Step-by-Step Tutor Agent
- **Role**: Provides detailed problem-solving guidance
- **Voice**: "shimmer" - patient and encouraging tone
- **Responsibilities**:
  - Break down problems into manageable steps
  - Guide students through solution process
  - Provide hints and encouragement
  - Check understanding at each step
  - Return to Question Presenter for next problem

---

## Mastra.ai Orchestrator

### Core Orchestration Logic
- **Agent Selection**: Determines which agent should handle current conversation state
- **Context Preservation**: Maintains student information and progress across agents
- **Seamless Handoffs**: Manages transitions between agents with proper context
- **Session State**: Tracks overall tutoring session progress

### Agent Switching Triggers
- **To Welcomer**: Session start, student wants to change topics
- **To Question Presenter**: Assessment complete, ready for new problem, problem solved
- **To Step-by-Step Tutor**: Student says "I don't know", "help me", shows confusion

### Shared Context
- Student grade level and math comfort
- Current problem being worked on
- Student's previous answers and attempts
- Session progress and topics covered

---

## Frontend Interface

### Main Components
- **Session Status**: Shows current active agent and session phase
- **Audio Controls**: Start/stop session, mute controls, audio level
- **Conversation Display**: Real-time transcription of voice conversation  
- **Problem Area**: Shows current math problem being discussed
- **Progress Indicator**: Visual representation of session flow

### Agent Indicators
- **Welcomer Active**: "Getting to know you..." with friendly avatar
- **Question Presenter Active**: "Here's your problem..." with instructional avatar  
- **Step-by-Step Tutor Active**: "Let's work through this..." with supportive avatar

### Interactive Elements
- **Quick Actions**: "I need help", "Next problem", "Repeat that"
- **Problem Input**: Backup text input for typing problems
- **Session Controls**: Pause, restart, end session

---

## Voice Integration with OpenAI Realtime

### OpenAI Realtime Configuration
- **Model**: `gpt-4o-mini-realtime` for all agents
- **Voice Providers**: Different voices for each agent personality
- **Event Handling**: Speaking, writing, and error events
- **Audio Streaming**: Continuous bidirectional audio communication

### Agent Voice Setup
- Each agent uses `OpenAIRealtimeVoice` with specific voice configuration
- Mastra.ai handles voice provider connections and audio streaming
- Event-driven communication between frontend and agents
- Real-time audio processing with `getMicrophoneStream` and `playAudio`

---

## Session Flow

### Typical Session Progression
1. **Welcome Phase**: Welcomer Agent greets and assesses student
2. **Problem Phase**: Question Presenter Agent gives appropriate problem
3. **Tutoring Phase**: Step-by-Step Tutor Agent provides guidance when needed
4. **Next Problem**: Return to Question Presenter for continued practice
5. **Session End**: Welcomer Agent provides summary and encouragement

### Agent Handoff Examples
- Student: "Hi, I need help with math" → **Welcomer Agent**
- Welcomer: "Great! What grade are you in?" → **Assessment**
- Student: "I'm ready for a problem" → **Question Presenter Agent**
- Question Presenter: "Solve: 2x + 5 = 11" → **Problem Given**
- Student: "I don't know how to start" → **Step-by-Step Tutor Agent**
- Tutor: "Let's isolate x step by step..." → **Guided Learning**

---

## Technical Requirements

### WebRTC Audio
- Browser microphone access with noise cancellation
- Real-time audio streaming via WebSocket connections
- Audio quality optimization for clear math discussions

### Mastra.ai Integration
- Agent creation with voice capabilities
- Orchestrator for managing agent lifecycle and handoffs
- Context sharing and session state management
- Event-driven architecture for real-time interactions

### Backend Server
- Express.js server with Socket.io for WebSocket communication
- Integration between WebRTC audio and Mastra.ai voice providers
- Agent orchestration logic and session management
- Error handling and connection recovery

---

## Environment Variables
```
OPENAI_API_KEY=your_openai_api_key
PORT=3000
```

---

## Expected User Experience

Students interact naturally through voice with three distinct AI personalities:
- **Friendly Welcomer** who makes them comfortable and assesses their level
- **Clear Question Presenter** who gives them appropriate math problems  
- **Patient Tutor** who guides them step-by-step when they need help

The system automatically switches between agents based on conversation context, creating a seamless tutoring experience that adapts to student needs.