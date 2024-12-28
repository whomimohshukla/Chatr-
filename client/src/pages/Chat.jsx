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
  PaperClipIcon,
  PaperAirplaneIcon,
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
  const [selectedLanguage, setSelectedLanguage] = useState('en')
  const [handRaised, setHandRaised] = useState(false)
  const [filters, setFilters] = useState([])
  const [sharedFiles, setSharedFiles] = useState([])
  const [showReport, setShowReport] = useState(false)
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  
  const chatType = searchParams.get('type') || 'video'
  const interests = searchParams.get('interests')?.split(',').filter(Boolean) || []

  useEffect(() => {
    // Initialize socket connection with robust configuration
    socket.current = io(import.meta.env.VITE_API_URL || 'http://localhost:3000', {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    // Handle connection events
    socket.current.on('connect', () => {
      console.log('Connected to server');
      setIsConnected(true);
      setIsConnecting(false);
      joinQueue();
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

    socket.current.on('match-found', async ({ room, users }) => {
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
      cleanup();
    };
  }, []);

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

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleMessageChange = (e) => {
    setMessage(e.target.value);
    handleTyping();
  };

  const handleTyping = () => {
    if (!isTyping) {
      setIsTyping(true);
      socket.current?.emit('typing', { isTyping: true });
      
      // Clear typing indicator after delay
      typingTimeout.current = setTimeout(() => {
        setIsTyping(false);
        socket.current?.emit('typing', { isTyping: false });
      }, 2000);
    }
  };

  const initializeWebRTC = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: true
      });
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      // Store stream for peer connection
      localStream.current = stream;
      setVideoEnabled(true);
      setAudioEnabled(true);
      
      // Initialize peer connection after getting stream
      createPeerConnection();
    } catch (error) {
      console.error('Error initializing WebRTC:', error);
      if (error.name === 'NotReadableError') {
        alert('Unable to access camera. Please make sure no other application is using your camera and try again.');
      } else if (error.name === 'NotAllowedError') {
        alert('Please allow camera and microphone access to use video chat.');
      } else {
        alert('Failed to initialize video chat. Please check your camera and microphone settings.');
      }
      // Fall back to text-only chat
      setChatType('text');
    }
  };

  const createAndSendOffer = async () => {
    try {
      if (!peerConnection.current) {
        throw new Error('PeerConnection not initialized');
      }

      const offer = await peerConnection.current.createOffer();
      await peerConnection.current.setLocalDescription(offer);
      socket.current.emit('offer', { room: currentRoom, offer });
    } catch (error) {
      console.error('Error creating offer:', error);
      throw error;
    }
  };

  const toggleVideo = () => {
    if (localStream.current) {
      const videoTrack = localStream.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setVideoEnabled(videoTrack.enabled);
      }
    }
  };

  const toggleAudio = () => {
    if (localStream.current) {
      const audioTrack = localStream.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setAudioEnabled(audioTrack.enabled);
      }
    }
  };

  const cleanup = () => {
    // Stop all tracks in the local stream
    if (localStream.current) {
      localStream.current.getTracks().forEach(track => track.stop());
    }

    // Close peer connection
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }

    // Clean up video elements
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }

    // Disconnect socket
    if (socket.current) {
      socket.current.disconnect();
    }
  };

  return (
    <div className="min-h-screen dark:bg-gray-900 bg-gray-100 pt-16 pb-8 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-blue-500/5 to-transparent dark:from-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-purple-500/5 to-transparent dark:from-purple-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-7xl mx-auto">
          {/* Main Content */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 h-[calc(100vh-8rem)]">
            {/* Video Section */}
            <div className="xl:col-span-2 h-full flex flex-col">
              <div className="bg-white dark:bg-gray-800 backdrop-blur-md rounded-2xl overflow-hidden shadow-2xl border border-gray-200 dark:border-gray-700 flex-1 min-h-[300px] lg:min-h-[400px] relative">
                {chatType === 'video' && (
                  <>
                    {/* Remote Video */}
                    <div className="absolute inset-0">
                      <video
                        ref={remoteVideoRef}
                        autoPlay
                        playsInline
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Local Video */}
                    <div className="absolute top-4 right-4 w-32 sm:w-48 lg:w-56 aspect-video">
                      <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 backdrop-blur-sm"
                      />
                    </div>

                    {/* Video Controls */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center space-x-4 z-20">
                      <button
                        onClick={toggleAudio}
                        className={`p-3 sm:p-4 rounded-full ${
                          audioEnabled 
                            ? 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600' 
                            : 'bg-red-500 hover:bg-red-600'
                        } text-gray-700 dark:text-white backdrop-blur-sm shadow-lg transform hover:scale-105 transition-all duration-200`}
                      >
                        <MicrophoneIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                      </button>
                      <button
                        onClick={toggleVideo}
                        className={`p-3 sm:p-4 rounded-full ${
                          videoEnabled 
                            ? 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600' 
                            : 'bg-red-500 hover:bg-red-600'
                        } text-gray-700 dark:text-white backdrop-blur-sm shadow-lg transform hover:scale-105 transition-all duration-200`}
                      >
                        <VideoCameraIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                      </button>
                      <button
                        onClick={handleEndChat}
                        className="p-3 sm:p-4 rounded-full bg-red-500 hover:bg-red-600 text-white backdrop-blur-sm shadow-lg transform hover:scale-105 transition-all duration-200"
                      >
                        <XMarkIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                      </button>
                    </div>

                    {/* Loading State */}
                    {!isConnected && (
                      <div className="absolute inset-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm flex items-center justify-center z-30">
                        <div className="text-center px-6">
                          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
                          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Looking for someone...</h3>
                          <p className="text-gray-600 dark:text-gray-400 text-sm">
                            {interests.length > 0
                              ? `Matching with people interested in: ${interests.join(', ')}`
                              : 'Finding a random person to chat with'}
                          </p>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Chat Section */}
            <div className="bg-white dark:bg-gray-800 backdrop-blur-md rounded-2xl overflow-hidden flex flex-col h-full shadow-2xl border border-gray-200 dark:border-gray-700">
              {/* Chat Header */}
              <div className="bg-gray-50 dark:bg-gray-900/50 backdrop-blur-sm px-4 sm:px-6 py-4 flex items-center justify-between border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-3">
                  <div className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`}></div>
                  <span className="text-gray-900 dark:text-white font-medium">
                    {isConnected ? 'Connected' : 'Finding partner...'}
                  </span>
                </div>
                <button
                  onClick={() => setShowReport(true)}
                  className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  <FlagIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Messages */}
              <div
                ref={chatContainerRef}
                className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 scrollbar-track-transparent"
              >
                {messages.map((msg, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${msg.type === 'system' ? 'justify-center' : msg.senderId === socket.current?.id ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.type === 'system' ? (
                      <div className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-4 py-1.5 rounded-full text-sm backdrop-blur-sm">
                        {msg.message}
                      </div>
                    ) : (
                      <div
                        className={`max-w-[85%] sm:max-w-[75%] px-4 py-2.5 rounded-2xl shadow-lg ${
                          msg.senderId === socket.current?.id
                            ? 'bg-blue-500 text-white ml-4'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white mr-4'
                        }`}
                      >
                        {msg.message}
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>

              {/* Chat Input */}
              <div className="p-3 sm:p-4 bg-gray-50 dark:bg-gray-900/50 backdrop-blur-sm border-t border-gray-200 dark:border-gray-700">
                <div className="flex space-x-3">
                  <input
                    type="text"
                    value={message}
                    onChange={handleMessageChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message..."
                    className="flex-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 border border-gray-200 dark:border-gray-600 text-sm sm:text-base"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!message.trim()}
                    className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-medium transition-all duration-200 text-sm sm:text-base ${
                      message.trim()
                        ? 'bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/20 transform hover:scale-105'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed border border-gray-200 dark:border-gray-600'
                    }`}
                  >
                    Send
                  </button>
                </div>
              </div>
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
            className="fixed inset-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-md w-full shadow-2xl border border-gray-200 dark:border-gray-700"
            >
              <h3 className="text-xl text-gray-900 dark:text-white font-semibold mb-4">Report User</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-8">
                Are you sure you want to report this user for inappropriate behavior?
              </p>
              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => setShowReport(false)}
                  className="px-6 py-2.5 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReport}
                  className="px-6 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl shadow-lg shadow-red-500/20 transform hover:scale-105 transition-all duration-200"
                >
                  Report
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
