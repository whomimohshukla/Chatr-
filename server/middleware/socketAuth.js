import jwt from 'jsonwebtoken'

export const socketAuth = (socket, next) => {
  try {
    const token = socket.handshake.auth.token?.replace('Bearer ', '')
    
    if (!token) {
      // Allow anonymous users for now
      socket.user = { id: socket.id }
      return next()
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    socket.user = decoded
    next()
  } catch (error) {
    // Allow anonymous users for now
    socket.user = { id: socket.id }
    next()
  }
}
