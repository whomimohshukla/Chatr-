import { Server } from 'socket.io'
import Filter from 'bad-words'
const filter = new Filter()

const rooms = new Map()
const userQueues = {
  text: [],
  video: []
}
const userInterests = new Map()
// Desired filters provided by user (what they want to match with)
const userDesired = new Map() // socketId -> { country: 'any'|'us'|..., gender: 'any'|'male'|'female' }
// Optional self profile of the user (who they are)
const userProfile = new Map() // socketId -> { country?: string, gender?: string }
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
    socket.on('end-chat', handleEndChat(socket, io))
    socket.on('video-signal', handleVideoSignal(socket, io))
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

const handleJoinQueue = (socket, io) => ({ type, interests, country, gender, selfCountry, selfGender }) => {
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

  // Store desired filters
  userDesired.set(socket.id, {
    country: country || 'any',
    gender: gender || 'any',
  })

  // Optionally store user's own profile if provided (can be used to honor others' filters)
  if (selfCountry || selfGender) {
    userProfile.set(socket.id, {
      country: selfCountry,
      gender: selfGender,
    })
  }

  // Find match based on interests
  let matchedUser = null
  const want = userDesired.get(socket.id) || { country: 'any', gender: 'any' }
  for (const id of queue) {
    // Interest check (if both sides have interests, require overlap)
    const otherInts = userInterests.get(id)
    const interestOk = !interests?.length || !otherInts?.size
      ? true
      : interests.some(int => otherInts.has(int))

    if (!interestOk) continue

    // Country/Gender desired filters: try to respect if the other has a self profile
    const otherProfile = userProfile.get(id) || {}
    const countryOk = want.country === 'any' || (otherProfile.country ? otherProfile.country === want.country : true)
    const genderOk = want.gender === 'any' || (otherProfile.gender ? otherProfile.gender === want.gender : true)
    if (!countryOk || !genderOk) continue

    // Also check reciprocal desires if available
    const otherWant = userDesired.get(id)
    const myProfile = userProfile.get(socket.id) || {}
    const recipCountryOk = !otherWant || otherWant.country === 'any' || (myProfile.country ? myProfile.country === otherWant.country : true)
    const recipGenderOk = !otherWant || otherWant.gender === 'any' || (myProfile.gender ? myProfile.gender === otherWant.gender : true)
    if (!recipCountryOk || !recipGenderOk) continue

    matchedUser = id
    break
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

// Relay WebRTC signaling messages within a room
const handleVideoSignal = (socket, io) => ({ room, signal }) => {
  if (!rooms.has(room)) return
  socket.to(room).emit('video-signal', { signal, from: socket.id })
}

// End chat: notify the room and tear it down
const handleEndChat = (socket, io) => ({ room }) => {
  if (!rooms.has(room)) return
  const roomData = rooms.get(room)
  io.to(room).emit('chat-ended')
  rooms.delete(room)
  for (const uid of roomData.users) {
    io.sockets.sockets.get(uid)?.leave(room)
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
  userDesired.delete(socket.id)
  userProfile.delete(socket.id)
}
