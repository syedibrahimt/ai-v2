require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { TutoringOrchestrator } = require('./orchestrator');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3001",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

const orchestrator = new TutoringOrchestrator();

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('start-session', async (data) => {
    try {
      await orchestrator.startSession(socket.id, socket);
      socket.emit('session-started', { 
        status: 'active',
        currentAgent: 'welcomer'
      });
    } catch (error) {
      console.error('Error starting session:', error);
      socket.emit('error', { message: 'Failed to start session' });
    }
  });

  socket.on('audio-data', async (audioData) => {
    try {
      await orchestrator.handleAudio(socket.id, audioData);
    } catch (error) {
      console.error('Error handling audio:', error);
    }
  });

  socket.on('user-message', async (message) => {
    try {
      await orchestrator.handleMessage(socket.id, message);
    } catch (error) {
      console.error('Error handling message:', error);
    }
  });

  socket.on('end-session', async () => {
    try {
      await orchestrator.endSession(socket.id);
      socket.emit('session-ended');
    } catch (error) {
      console.error('Error ending session:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    orchestrator.endSession(socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Math Tutoring Server running on port ${PORT}`);
});