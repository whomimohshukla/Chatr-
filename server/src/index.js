import 'dotenv/config'
import express from 'express'
import { createServer } from 'http'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import mongoose from 'mongoose'
import authRouter from '../routes/auth.js'
import usersRouter from '../routes/users.js'
import { setupSocketHandlers } from './socketHandlers.js'

const app = express()
const server = createServer(app)

// Security middleware
app.use(helmet())
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173'
}))
app.use(express.json())

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
})
app.use(limiter)

// Socket.io setup
const io = setupSocketHandlers(server)

// API routes
app.use('/api/auth', authRouter)
app.use('/api/users', usersRouter)

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' })
})

const PORT = process.env.PORT || 3000

// Database connection then start server
const start = async () => {
  const mongoUri = process.env.MONGO_URI
  if (mongoUri) {
    try {
      await mongoose.connect(mongoUri)
      console.log('MongoDB connected')
    } catch (err) {
      console.error('MongoDB connection failed:', err.message)
    }
  } else {
    console.warn('MONGO_URI not set. Auth routes depending on DB will not function.')
  }

  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
  })
}

start()
