const express = require('express')
const { createServer } = require('http')
const { Server } = require('socket.io')
const cors = require('cors')
const mongoose = require('mongoose')
const dotenv = require('dotenv')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const rateLimit = require('express-rate-limit')

dotenv.config()

const app = express()
const server = createServer(app)

// Configure CORS to allow requests from any frontend port
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      // Allow any localhost origin
      if (!origin || origin.startsWith('http://localhost:')) {
        callback(null, true)
      } else {
        callback(new Error('Not allowed by CORS'))
      }
    },
    methods: ['GET', 'POST'],
    credentials: true
  }
})

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
})

// Middleware
app.use(limiter)
app.use(cors({
  origin: (origin, callback) => {
    // Allow any localhost origin
    if (!origin || origin.startsWith('http://localhost:')) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true
}))
app.use(express.json())

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/stranger-connect')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err))

// Queue for matching users
const queue = {
  text: [],
  video: []
}

// Active rooms
const rooms = new Map()

io.on('connection', (socket) => {
  console.log('User connected:', socket.id)

  socket.on('join-queue', ({ type, interests }) => {
    // Remove user from any existing queue
    queue.text = queue.text.filter(user => user.id !== socket.id)
    queue.video = queue.video.filter(user => user.id !== socket.id)

    // Add user to appropriate queue
    const user = { id: socket.id, interests }
    queue[type].push(user)

    // Try to find a match
    findMatch(type, socket)
  })

  socket.on('send-message', ({ room, message }) => {
    socket.to(room).emit('receive-message', {
      senderId: socket.id,
      message,
      timestamp: Date.now()
    })
  })

  socket.on('typing', ({ room }) => {
    socket.to(room).emit('partner-typing')
  })

  socket.on('stop-typing', ({ room }) => {
    socket.to(room).emit('partner-stop-typing')
  })

  socket.on('video-signal', ({ room, signal }) => {
    socket.to(room).emit('video-signal', { signal })
  })

  socket.on('end-chat', ({ room }) => {
    const roomData = rooms.get(room)
    if (roomData) {
      // Notify other user that chat has ended
      socket.to(room).emit('chat-ended')
      // Clean up room data
      rooms.delete(room)
    }
  })

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id)
    // Remove user from queues
    queue.text = queue.text.filter(user => user.id !== socket.id)
    queue.video = queue.video.filter(user => user.id !== socket.id)
    
    // Handle active rooms
    rooms.forEach((roomData, roomId) => {
      if (roomData.users.includes(socket.id)) {
        // Notify other user that chat has ended
        socket.to(roomId).emit('chat-ended')
        // Clean up room data
        rooms.delete(roomId)
      }
    })
  })
})

function findMatch(type, socket) {
  const currentUser = queue[type].find(user => user.id === socket.id)
  if (!currentUser) return

  // Find a match with similar interests
  const match = queue[type].find(user => {
    if (user.id === socket.id) return false
    if (!user.interests || !currentUser.interests) return true
    return user.interests.some(interest => 
      currentUser.interests.includes(interest)
    )
  })

  if (match) {
    // Remove both users from queue
    queue[type] = queue[type].filter(user => 
      user.id !== socket.id && user.id !== match.id
    )

    // Create a room
    const room = `${socket.id}-${match.id}`
    rooms.set(room, { users: [socket.id, match.id], type })

    // Join both users to the room
    socket.join(room)
    io.sockets.sockets.get(match.id)?.join(room)

    // Notify both users
    io.to(socket.id).emit('match-found', { room, partner: match })
    io.to(match.id).emit('match-found', { room, partner: currentUser })
  }
}

const PORT = process.env.PORT || 3001
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
