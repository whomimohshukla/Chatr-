import { useEffect, useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { io } from 'socket.io-client'
import {
  VideoCameraIcon,
  MicrophoneIcon,
  XMarkIcon,
  PaperAirplaneIcon,
  ArrowRightIcon,
  FaceSmileIcon,
  UserCircleIcon,
  PhotoIcon,
  GifIcon,
  LanguageIcon,
  HandRaisedIcon,
  FlagIcon,
  ShareIcon,
  DocumentTextIcon,
  PhoneIcon,
  ComputerDesktopIcon,
} from '@heroicons/react/24/outline'

export default function Chat() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const socket = useRef()
  const localVideoRef = useRef()
  const remoteVideoRef = useRef()
  const chatContainerRef = useRef()
  const typingTimeout = useRef()
  const fileInputRef = useRef()
  
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState([])
  const [isTyping, setIsTyping] = useState(false)
  const [partnerTyping, setPartnerTyping] = useState(false)
  const [videoEnabled, setVideoEnabled] = useState(true)
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [currentRoom, setCurrentRoom] = useState(null)
  const [partner, setPartner] = useState(null)
  const [isConnecting, setIsConnecting] = useState(true)
  const [isConnected, setIsConnected] = useState(false)
  const [localStream, setLocalStream] = useState(null)
  const [showControls, setShowControls] = useState(true)
  const [showEmoji, setShowEmoji] = useState(false)
  const [selectedLanguage, setSelectedLanguage] = useState('en')
  const [handRaised, setHandRaised] = useState(false)
  const [filters, setFilters] = useState([])
  const [sharedFiles, setSharedFiles] = useState([])
  const [showReport, setShowReport] = useState(false)
  
  const chatType = searchParams.get('type') || 'text'
  const interests = searchParams.get('interests')?.split(',').filter(Boolean) || []

  useEffect(() => {
    // Initialize socket connection with basic configuration
    socket.current = io(import.meta.env.VITE_API_URL || 'http://localhost:3000');

    // Handle connection events
    socket.current.on('connect', () => {
      console.log('Connected to server');
      setIsConnected(true);
      setIsConnecting(false);
      socket.current.emit('join-queue');
    });

    socket.current.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setIsConnected(false);
      setIsConnecting(false);
    });

    socket.current.on('disconnect', () => {
      console.log('Disconnected from server');
      setIsConnected(false);
      setIsConnecting(false);
    });

    socket.current.on('reconnect', (attemptNumber) => {
      console.log('Reconnected to server after', attemptNumber, 'attempts');
      socket.current.emit('join-queue');
    });

    socket.current.on('waiting', () => {
      console.log('Waiting for match...');
      setIsConnecting(true);
      setIsConnected(false);
      setMessages(prev => [...prev, {
        type: 'system',
        message: 'Looking for someone to chat with...',
        timestamp: Date.now()
      }]);
    });

    socket.current.on('match-found', ({ room }) => {
      console.log('Match found in room:', room);
      setCurrentRoom(room);
      setIsConnecting(false);
      setIsConnected(true);
      setMessages(prev => [...prev, {
        type: 'system',
        message: 'Connected with a stranger! Say hello 👋',
        timestamp: Date.now()
      }]);
    });

    socket.current.on('receive-message', ({ message, senderId, timestamp }) => {
      console.log('Message received:', { message, senderId, timestamp });
      const isSelf = senderId === socket.current.id;
      
      setMessages(prev => [...prev, {
        type: 'message',
        message,
        isSelf,
        senderId,
        timestamp
      }]);

      // Auto scroll to bottom
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
    });

    socket.current.on('chat-ended', () => {
      console.log('Chat ended');
      setMessages(prev => [...prev, {
        type: 'system',
        message: 'Chat ended. Looking for a new match...',
        timestamp: Date.now()
      }]);
      setCurrentRoom(null);
      setIsConnected(false);
      setIsConnecting(true);
      
      // Rejoin queue after a short delay
      setTimeout(() => {
        socket.current.emit('join-queue');
      }, 1000);
    });

    return () => {
      if (socket.current) {
        socket.current.disconnect();
      }
    };
  }, []);

  const setupVideoChat = async () => {
    try {
      const constraints = {
        video: {
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 },
          aspectRatio: 16 / 9,
          facingMode: 'user',
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      setLocalStream(stream)
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
      }
    } catch (error) {
      console.error('Error accessing media devices:', error)
      alert('Unable to access camera or microphone. Please check your permissions.')
    }
  }

  const handleFileShare = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      alert('File size should be less than 5MB')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      socket.current.emit('file-share', {
        room: currentRoom,
        file: {
          name: file.name,
          type: file.type,
          data: event.target.result,
        },
      })

      setMessages(prev => [...prev, {
        type: 'file',
        senderId: socket.current.id,
        fileName: file.name,
        fileType: file.type,
        timestamp: Date.now(),
      }])
    }
    reader.readAsDataURL(file)
  }

  const handleFileReceived = (data) => {
    setMessages(prev => [...prev, {
      type: 'file',
      senderId: data.senderId,
      fileName: data.file.name,
      fileType: data.file.type,
      fileData: data.file.data,
      timestamp: Date.now(),
    }])
  }

  const translateMessage = async (text, targetLang) => {
    try {
      const response = await fetch('https://translation-api-endpoint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, targetLang }),
      })
      const data = await response.json()
      return data.translatedText
    } catch (error) {
      console.error('Translation error:', error)
      return text
    }
  }

  const handleReport = () => {
    if (partner) {
      socket.current.emit('report-user', {
        room: currentRoom,
        reason: 'inappropriate behavior',
      })
      setShowReport(false)
      handleEndChat()
    }
  }

  const toggleHandRaise = () => {
    if (handRaised) {
      socket.current.emit('lower-hand', { room: currentRoom })
      setHandRaised(false)
    } else {
      socket.current.emit('raise-hand', { room: currentRoom })
      setHandRaised(true)
    }
  }

  const joinQueue = () => {
    if (socket.current) {
      setIsConnecting(true)
      setIsConnected(false)
      setMessages([])
      
      // Clean up any existing room
      if (currentRoom) {
        socket.current.emit('end-chat', { room: currentRoom })
      }

      // Join the queue with interests
      socket.current.emit('join-queue', { 
        type: chatType,
        interests 
      })

      // Add system message
      setMessages(prev => [...prev, {
        type: 'system',
        message: interests.length > 0 
          ? `Looking for people interested in: ${interests.join(', ')}`
          : 'Looking for anyone available to chat',
        timestamp: Date.now()
      }])
    }
  }

  const handleEndChat = () => {
    if (currentRoom) {
      socket.current?.emit('end-chat', { room: currentRoom })
    }
    setCurrentRoom(null)
    setIsConnected(false)
    setPartner(null)
    setMessages([])
    
    // Rejoin queue automatically
    joinQueue()
  }

  const handleMatchFound = ({ room }) => {
    setCurrentRoom(room)
    setIsConnecting(false)
    setIsConnected(true)
    
    // Add system message
    setMessages(prev => [...prev, {
      type: 'system',
      message: 'Connected with a stranger! Say hello 👋',
      timestamp: Date.now()
    }])
  }

  const handleChatEnded = () => {
    setMessages(prev => [...prev, {
      type: 'system',
      message: 'Chat ended. Finding a new match...',
      timestamp: Date.now()
    }])
    
    setCurrentRoom(null)
    setIsConnected(false)
    setPartner(null)
    
    // Rejoin queue automatically after a short delay
    setTimeout(joinQueue, 1000)
  }

  const handleWaiting = () => {
    setIsConnecting(true)
    setIsConnected(false)
  }

  const handleReceiveMessage = ({ senderId, message, timestamp }) => {
    console.log('Message received:', { senderId, message, timestamp });
    setMessages(prev => [...prev, {
      type: 'text',
      senderId,
      message,
      timestamp
    }]);

    // Auto scroll to bottom
    if (chatContainerRef.current) {
      setTimeout(() => {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }, 100);
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    const trimmedMessage = message.trim();
    
    if (trimmedMessage && currentRoom && socket.current) {
      console.log('Sending message:', { room: currentRoom, message: trimmedMessage });
      
      // Emit the message to the server
      socket.current.emit('send-message', {
        room: currentRoom,
        message: trimmedMessage
      });
      
      setMessage('');
    }
  };

  const handleTyping = (e) => {
    setMessage(e.target.value)
    if (!isTyping && currentRoom) {
      setIsTyping(true)
      socket.current.emit('typing', { room: currentRoom })
    }
    
    if (typingTimeout.current) {
      clearTimeout(typingTimeout.current)
    }
    
    typingTimeout.current = setTimeout(() => {
      setIsTyping(false)
      socket.current.emit('stop-typing', { room: currentRoom })
    }, 1000)
  }

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !videoEnabled
        setVideoEnabled(!videoEnabled)
      }
    }
  }

  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioEnabled
        setAudioEnabled(!audioEnabled)
      }
    }
  }

  const cleanup = () => {
    if (socket.current) {
      socket.current.disconnect()
    }
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop())
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-6 pt-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-8rem)] max-w-7xl mx-auto">
          {/* Video Chat Section */}
          <div className="relative h-[calc(50vh-4rem)] lg:h-full order-2 lg:order-1 rounded-3xl overflow-hidden shadow-2xl transition-all duration-300 hover:shadow-blue-500/20">
            <div className="relative w-full h-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 overflow-hidden">
              {chatType === 'video' && (
                <>
                  {/* Remote Video */}
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  
                  {/* Local Video */}
                  <div className="absolute bottom-4 right-4 rounded-2xl overflow-hidden shadow-xl border-2 border-white/20 backdrop-blur-sm z-10 group transition-transform hover:scale-105">
                    <video
                      ref={localVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-32 h-[72px] md:w-48 md:h-[108px] object-cover"
                    />
                  </div>

                  {/* Video Controls */}
                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 md:gap-4 p-3 md:p-4 bg-black/40 backdrop-blur-md rounded-2xl shadow-lg border border-white/10 z-20">
                    <button
                      onClick={toggleAudio}
                      className={`p-3 md:p-4 rounded-xl transition-all transform hover:scale-105 active:scale-95 ${
                        audioEnabled 
                          ? 'bg-white/90 text-gray-900 hover:bg-white' 
                          : 'bg-red-500/90 text-white hover:bg-red-500'
                      }`}
                    >
                      <MicrophoneIcon className="w-5 h-5 md:w-6 md:h-6" />
                    </button>
                    <button
                      onClick={toggleVideo}
                      className={`p-3 md:p-4 rounded-xl transition-all transform hover:scale-105 active:scale-95 ${
                        videoEnabled 
                          ? 'bg-white/90 text-gray-900 hover:bg-white' 
                          : 'bg-red-500/90 text-white hover:bg-red-500'
                      }`}
                    >
                      <VideoCameraIcon className="w-5 h-5 md:w-6 md:h-6" />
                    </button>
                    <button
                      onClick={handleEndChat}
                      className="p-3 md:p-4 rounded-xl bg-red-500 text-white hover:bg-red-600 transition-all transform hover:scale-105 active:scale-95"
                    >
                      <XMarkIcon className="w-5 h-5 md:w-6 md:h-6" />
                    </button>
                  </div>
                </>
              )}

              {/* Loading State */}
              {isConnecting && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                  <div className="text-center px-6">
                    <div className="w-16 h-16 md:w-20 md:h-20 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
                    <h2 className="text-2xl md:text-3xl font-bold text-white mb-3 animate-pulse">
                      Finding Someone...
                    </h2>
                    <p className="text-sm md:text-base text-gray-300 max-w-md">
                      {interests.length > 0
                        ? `Looking for people interested in: ${interests.join(', ')}`
                        : 'Looking for anyone to chat with'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Chat Section */}
          <div className="flex flex-col h-[calc(50vh-4rem)] lg:h-full order-1 lg:order-2 bg-white dark:bg-gray-800 rounded-3xl shadow-2xl overflow-hidden transition-all duration-300 hover:shadow-blue-500/20">
            {/* Chat Header */}
            <div className="px-6 py-4 md:px-8 md:py-5 border-b border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                      <UserCircleIcon className="w-6 h-6 md:w-7 md:h-7 text-white" />
                    </div>
                    {isConnected && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">
                      {isConnected ? 'Stranger' : 'Connecting...'}
                    </h2>
                    {partnerTyping && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 animate-pulse">
                        typing...
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowReport(true)}
                    className="p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <FlagIcon className="w-5 h-5 md:w-6 md:h-6 text-gray-600 dark:text-gray-400" />
                  </button>
                  <button
                    onClick={handleEndChat}
                    className="p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <ArrowRightIcon className="w-5 h-5 md:w-6 md:h-6 text-gray-600 dark:text-gray-400" />
                  </button>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div
              ref={chatContainerRef}
              className="flex-1 overflow-y-auto px-6 py-4 md:px-8 md:py-6 space-y-4 md:space-y-6 bg-gray-50 dark:bg-gray-900"
            >
              {messages.map((msg, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`flex flex-col max-w-[85%] md:max-w-[75%] ${
                    msg.senderId === socket.current?.id ? 'ml-auto' : 'mr-auto'
                  }`}
                >
                  <div
                    className={`rounded-2xl px-4 py-3 md:px-5 md:py-4 shadow-sm ${
                      msg.senderId === socket.current?.id
                        ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-br-sm'
                        : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-sm'
                    }`}
                  >
                    {msg.type === 'file' ? (
                      <div className="flex items-center space-x-3">
                        <DocumentTextIcon className="w-5 h-5 md:w-6 md:h-6 flex-shrink-0" />
                        <a
                          href={msg.fileData}
                          download={msg.fileName}
                          className="text-sm md:text-base font-medium underline hover:text-blue-100 truncate max-w-[200px] md:max-w-[300px]"
                        >
                          {msg.fileName}
                        </a>
                      </div>
                    ) : (
                      <p className="text-sm md:text-base break-words leading-relaxed">
                        {msg.message}
                      </p>
                    )}
                  </div>
                  <span className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 mt-1.5 px-1">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </span>
                </motion.div>
              ))}
            </div>

            {/* Chat Input */}
            <div className="px-6 py-4 md:px-8 md:py-5 border-t border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
              <form onSubmit={handleSendMessage} className="flex items-center space-x-3">
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowEmoji(!showEmoji)}
                    className="p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <FaceSmileIcon className="w-6 h-6 text-gray-500 dark:text-gray-400" />
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <PhotoIcon className="w-6 h-6 text-gray-500 dark:text-gray-400" />
                  </button>
                </div>
                <input
                  type="text"
                  className="flex-1 h-12 md:h-14 px-5 text-base md:text-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl border-2 border-transparent focus:border-blue-500 dark:focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 transition-all"
                  placeholder={isConnected ? "Type a message..." : "Waiting for connection..."}
                  value={message}
                  onChange={handleTyping}
                  disabled={!isConnected}
                />
                <button
                  type="submit"
                  disabled={!isConnected || !message.trim()}
                  className="h-12 md:h-14 px-5 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-blue-500/25"
                >
                  <PaperAirplaneIcon className="w-6 h-6 md:w-7 md:h-7" />
                </button>
              </form>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileShare}
                accept="image/*,.pdf,.doc,.docx"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Report Modal */}
      <AnimatePresence>
        {showReport && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-md mx-4 bg-white dark:bg-gray-800 rounded-3xl shadow-2xl"
            >
              <div className="p-6 md:p-8">
                <h3 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  Report User
                </h3>
                <p className="text-base md:text-lg text-gray-600 dark:text-gray-300 mb-8">
                  Are you sure you want to report this user for inappropriate behavior?
                </p>
                <div className="flex justify-end space-x-4">
                  <button
                    onClick={() => setShowReport(false)}
                    className="px-6 py-3 text-base md:text-lg font-medium rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white transition-all transform hover:scale-105 active:scale-95"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReport}
                    className="px-6 py-3 text-base md:text-lg font-medium rounded-xl bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white transition-all transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-red-500/25"
                  >
                    Report
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
