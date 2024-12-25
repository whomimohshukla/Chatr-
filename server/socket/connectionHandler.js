const waitingUsers = {
  text: new Map(),
  video: new Map(),
}

export const handleConnection = (socket) => {
  console.log('User connected:', socket.id)

  socket.on('join-queue', ({ type, interests }) => {
    const userId = socket.id
    const userInfo = {
      socketId: socket.id,
      interests: interests || [],
      timestamp: Date.now(),
    }

    console.log(`User ${userId} joined ${type} queue with interests:`, interests)

    // Add user to waiting queue
    waitingUsers[type].set(userId, userInfo)
    
    // Try to find a match
    const waitingList = Array.from(waitingUsers[type].entries())
      .filter(([id]) => id !== userId)
    
    if (waitingList.length > 0) {
      // Get the first waiting user
      const [matchId, matchInfo] = waitingList[0]
      const room = `room_${Date.now()}`
      
      // Remove both users from waiting queue
      waitingUsers[type].delete(userId)
      waitingUsers[type].delete(matchId)
      
      console.log(`Matched users ${userId} and ${matchId} in room ${room}`)
      
      // Join both users to the room
      socket.join(room)
      socket.to(matchInfo.socketId).emit('match-found', {
        room,
        partner: {
          id: userId,
          interests: userInfo.interests,
        },
      })
      
      socket.emit('match-found', {
        room,
        partner: {
          id: matchId,
          interests: matchInfo.interests,
        },
      })
    } else {
      socket.emit('waiting')
    }
  })

  socket.on('leave-queue', ({ type }) => {
    const userId = socket.id
    waitingUsers[type].delete(userId)
    console.log(`User ${userId} left ${type} queue`)
  })

  socket.on('send-message', ({ room, message }) => {
    socket.to(room).emit('receive-message', {
      senderId: socket.id,
      message,
      timestamp: Date.now(),
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
    socket.to(room).emit('chat-ended')
    socket.leave(room)
    console.log(`User ${socket.id} ended chat in room ${room}`)
  })

  socket.on('disconnect', () => {
    const userId = socket.id
    waitingUsers.text.delete(userId)
    waitingUsers.video.delete(userId)
    console.log('User disconnected:', socket.id)
  })
}
