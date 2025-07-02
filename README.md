# Real-Time Math Tutoring System

A voice-powered AI math tutoring system with three specialized agents using Mastra.ai and OpenAI Realtime Voice.

## Features

- **Three Specialized AI Agents**:
  - 👋 **Welcomer Agent**: Greets students and assesses their math level
  - 📚 **Question Presenter Agent**: Presents appropriate math problems  
  - 🎯 **Step-by-Step Tutor Agent**: Provides detailed problem-solving guidance

- **Voice Integration**: Real-time voice communication using OpenAI Realtime Voice
- **Smart Agent Switching**: Automatic transitions between agents based on conversation context
- **Real-time UI**: Live conversation display and session progress tracking
- **Audio Controls**: Voice recording with audio level monitoring

## Prerequisites

- Node.js (v16 or higher)
- OpenAI API key
- Microphone access in browser

## Setup

1. **Install Dependencies**
   ```bash
   npm run install-all
   ```

2. **Environment Configuration**
   ```bash
   # Edit .env file and add your OpenAI API key
   OPENAI_API_KEY=your_openai_api_key_here
   PORT=3000
   ```

3. **Start the Application**
   ```bash
   # Terminal 1: Start backend server
   npm run dev
   
   # Terminal 2: Start frontend client  
   npm run client
   ```

4. **Access the Application**
   - Frontend: http://localhost:3001
   - Backend: http://localhost:3000

## Usage

1. **Start Session**: Click "Start Session" to begin tutoring
2. **Voice Interaction**: Use "Start Talking" to speak with the AI tutors
3. **Quick Actions**: Use preset buttons for common responses
4. **Agent Flow**: Experience automatic transitions between the three agents
5. **End Session**: Click "End Session" when finished

## Agent Flow

```
Welcome → Assessment → Problem Presentation → Tutoring → Next Problem
    ↑                                                          ↓
    ←←←←←← Student can return to any previous step ←←←←←←←←←←←←←←
```

## Architecture

```
Frontend (React + Socket.io Client)
           ↕
Backend (Express + Socket.io Server)
           ↕
Mastra.ai Orchestrator
           ↕
Three Specialized Agents + OpenAI Realtime Voice
```

## File Structure

```
v2/
├── server/
│   ├── index.js              # Express server with Socket.io
│   ├── orchestrator.js       # Agent management and switching logic
│   └── agents/
│       ├── welcomer.js       # Welcomer Agent (alloy voice)
│       ├── question-presenter.js  # Question Presenter (nova voice)
│       └── step-by-step-tutor.js  # Tutor Agent (shimmer voice)
├── client/
│   ├── src/
│   │   ├── App.js           # Main React application
│   │   ├── App.css          # Styling
│   │   └── components/      # React components
│   └── public/
└── package.json             # Root package.json
```

## Troubleshooting

**Audio Issues:**
- Ensure microphone permissions are granted
- Check browser compatibility (Chrome/Firefox recommended)
- Verify audio input device is working

**Connection Issues:**  
- Check that both backend (port 3000) and frontend (port 3001) are running
- Verify OpenAI API key is valid and has sufficient credits
- Check network connectivity

**Agent Issues:**
- Ensure all Mastra.ai dependencies are installed
- Check console logs for specific error messages
- Verify OpenAI Realtime API access

## Development

**Adding New Agents:**
1. Create new agent file in `server/agents/`
2. Extend base Agent class with Mastra.ai
3. Add agent to orchestrator.js
4. Update frontend agent indicators

**Customizing Voices:**
- Modify voice parameters in agent constructors
- Available OpenAI voices: alloy, echo, fable, onyx, nova, shimmer

**Extending Problem Types:**
- Add new problem categories in question-presenter.js
- Implement specific tutoring steps in step-by-step-tutor.js

## Technologies Used

- **Backend**: Node.js, Express, Socket.io
- **Frontend**: React, Socket.io Client, Web Audio API
- **AI**: Mastra.ai, OpenAI Realtime Voice, GPT-4o-mini-realtime
- **Audio**: WebRTC, MediaRecorder API

## License

ISC License