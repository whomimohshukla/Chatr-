import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const server = createServer(app);

// Basic middleware
app.use(express.json());
app.use(cors());

// Health check route
app.get('/', (req, res) => {
  res.send('Server is running');
});

// Configure Socket.IO with basic settings
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

// Store active users and their rooms
const users = new Map();
const rooms = new Map();
const queue = [];

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-queue', () => {
    console.log('User joining queue:', socket.id);
    
    // Remove from any existing room
    const currentRoom = users.get(socket.id);
    if (currentRoom) {
      socket.leave(currentRoom);
      io.to(currentRoom).emit('chat-ended');
      rooms.delete(currentRoom);
      users.delete(socket.id);
    }

    // Check if someone is waiting in the queue
    if (queue.length > 0) {
      const partnerId = queue.shift();
      const room = `room_${Date.now()}`;
      
      // Join both users to the room
      socket.join(room);
      const partnerSocket = io.sockets.sockets.get(partnerId);
      if (partnerSocket) {
        partnerSocket.join(room);
        
        // Store room information
        users.set(socket.id, room);
        users.set(partnerId, room);
        rooms.set(room, [socket.id, partnerId]);
        
        // Notify both users
        io.to(room).emit('match-found', { 
          room,
          users: [socket.id, partnerId]
        });
        
        console.log(`Match found in room ${room} between ${socket.id} and ${partnerId}`);
      } else {
        // If partner socket not found, add current user to queue
        queue.push(socket.id);
        socket.emit('waiting');
      }
    } else {
      // No one waiting, add to queue
      queue.push(socket.id);
      socket.emit('waiting');
      console.log('User waiting:', socket.id);
    }
  });

  // WebRTC signaling
  socket.on('offer', ({ room, offer }) => {
    console.log('Relaying offer in room:', room);
    socket.to(room).emit('offer', { offer });
  });

  socket.on('answer', ({ room, answer }) => {
    console.log('Relaying answer in room:', room);
    socket.to(room).emit('answer', { answer });
  });

  socket.on('ice-candidate', ({ room, candidate }) => {
    console.log('Relaying ICE candidate in room:', room);
    socket.to(room).emit('ice-candidate', { candidate });
  });

  socket.on('start-video', ({ room }) => {
    console.log('Starting video in room:', room);
    socket.to(room).emit('start-video');
  });

  socket.on('send-message', ({ room, message }) => {
    if (!message.trim()) return;
    
    const roomUsers = rooms.get(room);
    if (roomUsers?.includes(socket.id)) {
      console.log(`Broadcasting message in room ${room} from ${socket.id}`);
      
      // Emit to everyone in the room including sender
      io.to(room).emit('receive-message', {
        message: message.trim(),
        senderId: socket.id,
        timestamp: Date.now()
      });
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    const queueIndex = queue.indexOf(socket.id);
    if (queueIndex > -1) {
      queue.splice(queueIndex, 1);
    }
    
    const room = users.get(socket.id);
    if (room) {
      io.to(room).emit('chat-ended');
      rooms.delete(room);
      users.delete(socket.id);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
