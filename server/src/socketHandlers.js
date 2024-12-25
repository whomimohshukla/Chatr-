import { Server } from 'socket.io'
import Filter from 'bad-words'
const filter = new Filter()

const rooms = new Map()
const userQueues = {
  text: [],
  video: []
}
const userInterests = new Map()
const userReports = new Map()
const userBans = new Set()

export const setupSocketHandlers = (server) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST']
    }
  })

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id)

    socket.on('join-queue', handleJoinQueue(socket, io))
    socket.on('send-message', handleSendMessage(socket, io))
    socket.on('typing', handleTyping(socket, io))
    socket.on('stop-typing', handleStopTyping(socket, io))
    socket.on('file-share', handleFileShare(socket, io))
    socket.on('raise-hand', handleRaiseHand(socket, io))
    socket.on('lower-hand', handleLowerHand(socket, io))
    socket.on('report-user', handleReport(socket, io))
    socket.on('disconnect', handleDisconnect(socket, io))
  })

  return io
}

const handleJoinQueue = (socket, io) => ({ type, interests }) => {
  if (userBans.has(socket.id)) {
    socket.emit('banned')
    return
  }

  const queue = userQueues[type]
  if (!queue) return

  // Remove user from any existing queue
  userQueues.text = userQueues.text.filter(id => id !== socket.id)
  userQueues.video = userQueues.video.filter(id => id !== socket.id)

  // Store user interests
  if (interests && interests.length > 0) {
    userInterests.set(socket.id, new Set(interests))
  }

  // Find match based on interests
  let matchedUser = null
  if (interests && interests.length > 0) {
    matchedUser = queue.find(id => {
      const userInts = userInterests.get(id)
      return userInts && interests.some(int => userInts.has(int))
    })
  }

  // If no interest match, get first available user
  if (!matchedUser && queue.length > 0) {
    matchedUser = queue[0]
  }

  if (matchedUser) {
    const roomId = `${socket.id}-${matchedUser}`
    rooms.set(roomId, { users: [socket.id, matchedUser], type })

    socket.join(roomId)
    io.sockets.sockets.get(matchedUser)?.join(roomId)

    // Remove matched user from queue
    userQueues[type] = queue.filter(id => id !== matchedUser)

    // Notify both users
    io.to(roomId).emit('match-found', { room: roomId })
  } else {
    queue.push(socket.id)
    socket.emit('waiting')
  }
}

const handleSendMessage = (socket, io) => ({ room, message }) => {
  if (!rooms.has(room)) return
  if (!message.trim()) return

  // Filter inappropriate content
  const cleanMessage = filter.clean(message)

  io.to(room).emit('receive-message', {
    message: cleanMessage,
    senderId: socket.id,
    timestamp: Date.now()
  })
}

const handleTyping = (socket, io) => ({ room }) => {
  if (!rooms.has(room)) return
  socket.to(room).emit('partner-typing')
}

const handleStopTyping = (socket, io) => ({ room }) => {
  if (!rooms.has(room)) return
  socket.to(room).emit('partner-stop-typing')
}

const handleFileShare = (socket, io) => ({ room, file }) => {
  if (!rooms.has(room)) return

  // Validate file
  const maxSize = 5 * 1024 * 1024 // 5MB
  if (file.data.length > maxSize) return

  // Check file type
  const allowedTypes = ['image/', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
  if (!allowedTypes.some(type => file.type.startsWith(type))) return

  socket.to(room).emit('file-received', {
    senderId: socket.id,
    file
  })
}

const handleRaiseHand = (socket, io) => ({ room }) => {
  if (!rooms.has(room)) return
  socket.to(room).emit('hand-raised')
}

const handleLowerHand = (socket, io) => ({ room }) => {
  if (!rooms.has(room)) return
  socket.to(room).emit('hand-lowered')
}

const handleReport = (socket, io) => ({ room, reason }) => {
  if (!rooms.has(room)) return

  const roomData = rooms.get(room)
  const reportedUser = roomData.users.find(id => id !== socket.id)

  if (!reportedUser) return

  // Track reports
  if (!userReports.has(reportedUser)) {
    userReports.set(reportedUser, 1)
  } else {
    const reports = userReports.get(reportedUser)
    userReports.set(reportedUser, reports + 1)

    // Ban user after 3 reports
    if (reports + 1 >= 3) {
      userBans.add(reportedUser)
      io.to(reportedUser).emit('banned')
    }
  }
}

const handleDisconnect = (socket, io) => () => {
  console.log('User disconnected:', socket.id)

  // Remove from queues
  userQueues.text = userQueues.text.filter(id => id !== socket.id)
  userQueues.video = userQueues.video.filter(id => id !== socket.id)

  // Clean up rooms
  for (const [roomId, room] of rooms.entries()) {
    if (room.users.includes(socket.id)) {
      io.to(roomId).emit('chat-ended')
      rooms.delete(roomId)
    }
  }

  // Clean up interests
  userInterests.delete(socket.id)
}
