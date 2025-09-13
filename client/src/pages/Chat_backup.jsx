import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { io } from 'socket.io-client'
import { motion, AnimatePresence } from 'framer-motion'
import {
  UserCircleIcon,
  VideoCameraIcon,
  MicrophoneIcon,
  XMarkIcon,
  FlagIcon,
  ArrowRightIcon,
  PaperAirplaneIcon,
  PhoneXMarkIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline'

export default function Chat() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const socket = useRef()
  const chatContainerRef = useRef()
  const typingTimeout = useRef()
  const fileInputRef = useRef()
  const peerConnection = useRef()
  const localStream = useRef()
  const localVideoRef = useRef()
  const remoteVideoRef = useRef()
  
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState([])
  const [isTyping, setIsTyping] = useState(false)
  const [partnerTyping, setPartnerTyping] = useState(false)
  const [currentRoom, setCurrentRoom] = useState(null)
  const [partner, setPartner] = useState(null)
  const [isConnecting, setIsConnecting] = useState(true)
  const [isConnected, setIsConnected] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [showEmoji, setShowEmoji] = useState(false)
  const commonEmojis = ['😀','😁','😂','🤣','😊','😍','😘','😉','😎','🤩','🫡','🤝','👍','🙏','🔥','💯','🎉','✨','🤗','😅','😭','😤','😴','🤔','🙃','😇']
  
  const countryFlags = {
    any: '🌐', us: '🇺🇸', in: '🇮🇳', gb: '🇬🇧', ca: '🇨🇦', au: '🇦🇺', de: '🇩🇪', fr: '🇫🇷', br: '🇧🇷'
  }
  const countryNames = {
    any: 'Any', us: 'United States', in: 'India', gb: 'United Kingdom', ca: 'Canada', au: 'Australia', de: 'Germany', fr: 'France', br: 'Brazil'
  }
  
  const [endState, setEndState] = useState(null)
  const [selectedLanguage, setSelectedLanguage] = useState('en')
  const [handRaised, setHandRaised] = useState(false)
  const [filters, setFilters] = useState([])
  const [sharedFiles, setSharedFiles] = useState([])
  const [showReport, setShowReport] = useState(false)
  const [videoEnabled, setVideoEnabled] = useState(true)
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [selectedCountry, setSelectedCountry] = useState('any')
  const [selectedGender, setSelectedGender] = useState('any')
  
  const chatType = searchParams.get('type') || 'video'
  const interests = searchParams.get('interests')?.split(',').filter(Boolean) || []

  // Socket connection and event handlers
  useEffect(() => {
    socket.current = io(import.meta.env.VITE_API_URL || 'http://localhost:3000', {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    })

    socket.current.on('connect', () => {
      console.log('Connected to server')
      setIsConnected(true)
      setIsConnecting(false)
      joinQueue()
    })

    socket.current.on('connect_error', (error) => {
      console.error('Socket connection error:', error)
      setIsConnected(false)
      setIsConnecting(false)
    })

    socket.current.on('disconnect', () => {
      console.log('Disconnected from server')
      setIsConnected(false)
      setIsConnecting(false)
    })

    socket.current.on('waiting', handleWaiting)
    socket.current.on('match-found', handleMatchFound)
    socket.current.on('chat-ended', handleChatEnded)
    socket.current.on('receive-message', handleReceiveMessage)

    return () => {
      cleanup()
    }
  }, [])

  const joinQueue = () => {
    if (socket.current) {
      socket.current.emit('join-queue', {
        type: chatType,
        interests: interests,
        country: selectedCountry,
        gender: selectedGender
      })
      setIsConnecting(true)
      setIsConnected(false)
    }
  }

  const handleWaiting = () => {
    setIsConnecting(true)
    setIsConnected(false)
    setMessages(prev => [...prev, {
      type: 'system',
      message: 'Looking for someone to chat with...',
      timestamp: Date.now()
    }])
  }

  const handleMatchFound = ({ room }) => {
    setCurrentRoom(room)
    setIsConnected(true)
    setIsConnecting(false)
    setMessages(prev => [...prev, {
      type: 'system',
      message: 'Connected! Say hello 👋',
      timestamp: Date.now()
    }])
  }

  const handleChatEnded = () => {
    setIsConnected(false)
    setCurrentRoom(null)
    setPartner(null)
    setMessages(prev => [...prev, {
      type: 'system',
      message: 'Stranger disconnected',
      timestamp: Date.now()
    }])
  }

  const handleReceiveMessage = ({ senderId, message, timestamp }) => {
    setMessages(prev => [...prev, {
      senderId,
      message,
      timestamp,
      type: 'message'
    }])
    
    setTimeout(() => {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
      }
    }, 100)
  }

  const handleSendMessage = (e) => {
    e?.preventDefault()
    if (!message.trim() || !socket.current || !isConnected) return

    const messageData = {
      room: currentRoom,
      message: message.trim(),
      timestamp: Date.now()
    }

    socket.current.emit('send-message', messageData)
    setMessages(prev => [...prev, {
      senderId: socket.current.id,
      message: message.trim(),
      timestamp: Date.now(),
      type: 'message'
    }])
    
    setMessage('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleNext = () => {
    if (socket.current) {
      socket.current.emit('end-chat', { room: currentRoom })
    }
    setMessages([])
    joinQueue()
  }

  const handleStop = () => {
    if (socket.current) {
      socket.current.emit('end-chat', { room: currentRoom })
    }
    setIsConnected(false)
    setCurrentRoom(null)
  }

  const handleReport = () => {
    if (socket.current && currentRoom) {
      socket.current.emit('report-user', { room: currentRoom })
    }
    setShowReport(false)
    handleNext()
  }

  const toggleVideo = () => {
    setVideoEnabled(!videoEnabled)
  }

  const toggleAudio = () => {
    setAudioEnabled(!audioEnabled)
  }

  const cleanup = () => {
    if (socket.current) {
      socket.current.disconnect()
    }
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-gray-900 pt-16 relative overflow-hidden"
    >
      {/* Main Layout */}
      <div className="h-[calc(100vh-4rem)] flex">
        {/* Video Section - Left Side */}
        <div className="flex-1 relative bg-black">
          {chatType === 'video' && (
            <>
              {/* Remote Video */}
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />

              {/* Local Video - Picture in Picture */}
              <div className="absolute top-4 right-4 w-48 aspect-video">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover rounded-lg shadow-lg border-2 border-white/20"
                />
              </div>

              {/* Video Controls - Floating */}
              <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2">
                <div className="flex items-center gap-4 bg-black/50 backdrop-blur-md px-6 py-3 rounded-full">
                  <button
                    onClick={toggleAudio}
                    className={`p-3 rounded-full transition-all ${
                      audioEnabled 
                        ? 'bg-white/20 hover:bg-white/30 text-white' 
                        : 'bg-red-500 hover:bg-red-600 text-white'
                    }`}
                  >
                    <MicrophoneIcon className="w-5 h-5" />
                  </button>
                  <button
                    onClick={toggleVideo}
                    className={`p-3 rounded-full transition-all ${
                      videoEnabled 
                        ? 'bg-white/20 hover:bg-white/30 text-white' 
                        : 'bg-red-500 hover:bg-red-600 text-white'
                    }`}
                  >
                    <VideoCameraIcon className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setShowReport(true)}
                    className="p-3 rounded-full bg-white/20 hover:bg-white/30 text-white transition-all"
                  >
                    <FlagIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Connection Status Overlay */}
              {!isConnected && (
                <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
                  <div className="text-center text-white">
                    <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <h3 className="text-xl font-semibold mb-2">Looking for someone...</h3>
                    <p className="text-gray-300">
                      {interests.length > 0
                        ? `Matching with people interested in: ${interests.join(', ')}`
                        : 'Finding a random person to chat with'}
                    </p>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Text Chat Mode */}
          {chatType === 'text' && (
            <div className="w-full h-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
              <div className="text-center text-white">
                <UserCircleIcon className="w-32 h-32 mx-auto mb-4 opacity-50" />
                <h2 className="text-2xl font-bold mb-2">Text Chat Mode</h2>
                <p className="text-emerald-100">Use the chat panel to start messaging</p>
              </div>
            </div>
          )}
        </div>

        {/* Chat Panel - Right Side */}
        <div className="w-80 bg-gray-800 flex flex-col border-l border-gray-700">
          {/* Chat Header */}
          <div className="p-4 border-b border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                <span className="text-white font-medium">
                  {isConnected ? 'Connected' : 'Connecting...'}
                </span>
              </div>
              <button
                onClick={() => navigate('/')}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <XMarkIcon className="w-5 h-5 text-gray-400" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto p-4 space-y-3"
          >
            {messages.map((msg, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.type === 'system' ? 'justify-center' : msg.senderId === socket.current?.id ? 'justify-end' : 'justify-start'}`}
              >
                {msg.type === 'system' ? (
                  <div className="bg-gray-700 text-gray-300 px-3 py-1 rounded-full text-sm">
                    {msg.message}
                  </div>
                ) : (
                  <div
                    className={`max-w-[80%] px-3 py-2 rounded-lg ${
                      msg.senderId === socket.current?.id
                        ? 'bg-emerald-500 text-white'
                        : 'bg-gray-700 text-white'
                    }`}
                  >
                    <div className="text-sm">{msg.message}</div>
                    {msg.timestamp && (
                      <div className="text-xs opacity-70 mt-1">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            ))}
          </div>

          {/* Chat Input */}
          <div className="p-4 border-t border-gray-700">
            <div className="flex gap-2">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                className="flex-1 bg-gray-700 text-white placeholder-gray-400 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                onClick={handleSendMessage}
                disabled={!message.trim() || !isConnected}
                className={`px-4 py-2 rounded-lg transition-all ${
                  message.trim() && isConnected
                    ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                    : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                }`}
              >
                <PaperAirplaneIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Control Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-800/90 backdrop-blur-sm border-t border-gray-700 p-4">
        <div className="flex items-center justify-center gap-4">
          <select
            value={selectedCountry}
            onChange={(e) => setSelectedCountry(e.target.value)}
            className="px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 text-sm"
          >
            <option value="any">Any Country</option>
            <option value="us">United States</option>
            <option value="in">India</option>
            <option value="gb">United Kingdom</option>
            <option value="ca">Canada</option>
            <option value="au">Australia</option>
          </select>

          <button
            onClick={() => setSelectedGender(g => g === 'male' ? 'any' : 'male')}
            className={`px-4 py-2 rounded-lg text-sm transition-all ${
              selectedGender === 'male' 
                ? 'bg-emerald-500 text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Male {selectedGender === 'male' ? '✓' : ''}
          </button>

          <button
            onClick={handleStop}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm transition-all"
          >
            Stop
          </button>

          <button
            onClick={handleNext}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm transition-all"
          >
            Next
          </button>
        </div>
      </div>

      {/* Report Modal */}
      <AnimatePresence>
        {showReport && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className="bg-gray-800 rounded-xl p-6 max-w-md w-full border border-gray-700"
            >
              <h3 className="text-xl text-white font-semibold mb-4">Report User</h3>
              <p className="text-gray-300 mb-6">
                Are you sure you want to report this user for inappropriate behavior?
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowReport(false)}
                  className="px-4 py-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReport}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all"
                >
                  Report
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
