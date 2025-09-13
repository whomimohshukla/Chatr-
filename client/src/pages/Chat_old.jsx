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
  const commonEmojis = ['😀','😁','😂','🤣','😊','😍','😘','😉','😎','🤩','🫡','🤝','👍','🙏','🔥','💯','🎉','✨','🤗','😅','😭','😤','😴','🤔','🙃','😇']
  // Country flag and label helpers for a more polished, OmeTV-like UI
  const countryFlags = {
    any: '🌐', us: '🇺🇸', in: '🇮🇳', gb: '🇬🇧', ca: '🇨🇦', au: '🇦🇺', de: '🇩🇪', fr: '🇫🇷', br: '🇧🇷'
  }
  const countryNames = {
    any: 'Any', us: 'United States', in: 'India', gb: 'United Kingdom', ca: 'Canada', au: 'Australia', de: 'Germany', fr: 'France', br: 'Brazil'
  }
  // End screen state: 'stopped' when Stop pressed, 'closed' when X pressed
  const [endState, setEndState] = useState(null)
  const [selectedLanguage, setSelectedLanguage] = useState('en')
  const [handRaised, setHandRaised] = useState(false)
  const [filters, setFilters] = useState([])
  const [sharedFiles, setSharedFiles] = useState([])
  const [showReport, setShowReport] = useState(false)
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  // New: simple matching filters
  const [selectedCountry, setSelectedCountry] = useState('any')
  const [selectedGender, setSelectedGender] = useState('any')
  
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

    socket.current.on('match-found', async ({ room, partner: matchedPartner }) => {
      console.log('Match found in room:', room);
      setCurrentRoom(room);
      setPartner(matchedPartner || null);
      setIsConnecting(false);
      setIsConnected(true);
      setMessages(prev => [...prev, {
        type: 'system',
        message: 'Connected with a stranger! Say hello 👋',
        timestamp: Date.now()
      }]);

      // Initialize camera/mic and peer connection for video chats
      if (chatType === 'video') {
        try {
          await initializeWebRTC();

          // Decide a deterministic initiator to avoid glare using room structure
          // Room is formatted as `${initiatorId}-${matchedId}` in server
          const firstId = room?.split('-')[0];
          const isInitiator = socket.current.id === firstId;

          if (isInitiator) {
            await createAndSendOffer();
          }
        } catch (e) {
          console.error('Error starting WebRTC after match:', e);
        }
      }
    });

    // Typing indicators from partner (custom relays)
    socket.current.on('partner-typing', () => {
      setPartnerTyping(true);
    });
    socket.current.on('partner-stop-typing', () => {
      setPartnerTyping(false);
    });

    // Fallback: if server relays generic 'typing' event
    socket.current.on('typing', (payload) => {
      if (typeof payload === 'object') {
        setPartnerTyping(!!payload.isTyping)
      } else if (typeof payload === 'boolean') {
        setPartnerTyping(!!payload)
      }
    })

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

    // Unified signaling channel for WebRTC offers/answers/candidates
    socket.current.on('video-signal', async ({ signal }) => {
      try {
        if (!peerConnection.current && signal.type !== 'candidate') {
          // If we receive an offer/answer before creating, create now (requires local stream)
          if (!localStream.current) {
            await initializeWebRTC();
          }
          createPeerConnection();
        }

        const pc = peerConnection.current;
        if (!pc) return;

        if (signal.type === 'offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.current.emit('video-signal', {
            room: currentRoom,
            signal: { type: 'answer', sdp: pc.localDescription },
          });
        } else if (signal.type === 'answer') {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        } else if (signal.type === 'candidate' && signal.candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
        }
      } catch (err) {
        console.error('Error handling video-signal:', err);
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
        interests,
        country: selectedCountry,
        gender: selectedGender,
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

  // Stop button: end current chat without auto re-queue
  const handleStop = () => {
    if (currentRoom) {
      socket.current?.emit('end-chat', { room: currentRoom })
    }
    setCurrentRoom(null)
    setIsConnected(false)
    setPartner(null)
    setMessages(prev => [...prev, {
      type: 'system',
      message: 'Chat ended.',
      timestamp: Date.now()
    }])
  }

  // Omegle/OmeTV-style Next button handler
  const handleNext = () => {
    // End current chat and immediately find a new match
    handleEndChat()
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
      // stop typing indicator immediately
      if (typingTimeout.current) clearTimeout(typingTimeout.current)
      setIsTyping(false)
      socket.current?.emit('stop-typing', { room: currentRoom });
    }
  };

  const handleKeyDown = (e) => {
    // Support Enter and NumpadEnter, allow Shift+Enter for newline. Include legacy keyCode/which.
    if (e.isComposing || e.nativeEvent?.isComposing) return; // ignore while IME composing
    const isEnter = e.key === 'Enter' || e.code === 'Enter' || e.code === 'NumpadEnter' || e.keyCode === 13 || e.which === 13;
    if (isEnter && !e.shiftKey) {
      e.preventDefault();
      if (message && message.trim()) {
        handleSendMessage();
      }
    }
  };

  const handleKeyPress = (e) => {
    if (e.isComposing || e.nativeEvent?.isComposing) return;
    const isEnter = e.key === 'Enter' || e.code === 'Enter' || e.code === 'NumpadEnter' || e.keyCode === 13 || e.which === 13;
    if (isEnter && !e.shiftKey) {
      e.preventDefault();
      if (message && message.trim()) {
        handleSendMessage();
      }
    }
  };

  const handleKeyUp = (e) => {
    if (e.isComposing || e.nativeEvent?.isComposing) return;
    const isEnter = e.key === 'Enter' || e.code === 'Enter' || e.code === 'NumpadEnter' || e.keyCode === 13 || e.which === 13;
    if (isEnter && !e.shiftKey) {
      e.preventDefault();
      if (message && message.trim()) {
        handleSendMessage();
      }
    }
  };

  const handleMessageChange = (e) => {
    setMessage(e.target.value);
    handleTyping();
  };

  const handleTyping = () => {
    // Emit start typing once
    if (!isTyping) {
      setIsTyping(true);
      if (currentRoom) {
        socket.current?.emit('typing', { room: currentRoom });
      } else {
        socket.current?.emit('typing', {});
      }
    }
    // Debounce stop-typing
    if (typingTimeout.current) clearTimeout(typingTimeout.current)
    typingTimeout.current = setTimeout(() => {
      setIsTyping(false);
      if (currentRoom) {
        socket.current?.emit('stop-typing', { room: currentRoom });
      } else {
        socket.current?.emit('stop-typing', {});
      }
    }, 1200);
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
      // Stay in text chat mode without crashing
    }
  };

  // Create RTCPeerConnection and wire WebRTC events
  const createPeerConnection = () => {
    if (!localStream.current) {
      throw new Error('Local stream not initialized');
    }

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    });

    // Add local tracks
    localStream.current.getTracks().forEach((track) => {
      pc.addTrack(track, localStream.current);
    });

    // Remote track handler
    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      if (remoteVideoRef.current && remoteStream) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
    };

    // ICE candidates to signaling
    pc.onicecandidate = (event) => {
      if (event.candidate && socket.current && currentRoom) {
        socket.current.emit('video-signal', {
          room: currentRoom,
          signal: { type: 'candidate', candidate: event.candidate },
        });
      }
    };

    peerConnection.current = pc;
  };

  const createAndSendOffer = async () => {
    try {
      if (!peerConnection.current) {
        throw new Error('PeerConnection not initialized');
      }

      const offer = await peerConnection.current.createOffer();
      await peerConnection.current.setLocalDescription(offer);
      // Send via unified signaling channel
      socket.current.emit('video-signal', {
        room: currentRoom,
        signal: { type: 'offer', sdp: peerConnection.current.localDescription },
      });
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
    <div className="min-h-screen bg-gray-900 pt-16 relative overflow-hidden">
      {/* Subtle background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900"></div>
      
      <div className="relative z-10 h-[calc(100vh-4rem)]">
        {/* Main Content - Full Screen Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 h-full">
          {/* Video Section - Takes most space */}
          <div className="lg:col-span-3 relative bg-black">
            <div className="w-full h-full relative">
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

                    {/* Top Overlay Info (OmeTV-like) */}
                    <div className="absolute top-0 left-0 right-0 p-3 pointer-events-none z-20 flex justify-center">
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 text-white text-sm backdrop-blur-md border border-white/10 shadow">
                        <span className="text-base">{countryFlags[selectedCountry] || '🌐'}</span>
                        <span>
                          {countryNames[selectedCountry] || 'Any'} • {selectedGender === 'any' ? 'Any gender' : (selectedGender === 'male' ? 'Male' : 'Female')}
                        </span>
                      </div>
                    </div>

                    {/* Local Video */}
                    <div className="absolute top-4 right-4 w-32 sm:w-48 lg:w-56 aspect-video">
                      <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover rounded-xl shadow-lg border border-gray-200 dark:border-white/10 backdrop-blur-sm"
                      />
                    </div>

                    {/* Video Controls (centered on screen) */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
                      <div className="flex items-center gap-4 bg-brand-black/30 backdrop-blur-md px-3 sm:px-4 py-2 rounded-full border border-brand-black/10 shadow-lg">
                      <button
                        onClick={toggleAudio}
                        className={`p-3 sm:p-4 rounded-full ${
                          audioEnabled 
                            ? 'bg-brand-card hover:bg-brand-black/60 border border-brand-black/10' 
                            : 'bg-red-500 hover:bg-red-600'
                        } text-white backdrop-blur-sm shadow-lg transform hover:scale-105 transition-all duration-200`}
                      >
                        <MicrophoneIcon className="fluid-icon" />
                      </button>
                      <button
                        onClick={toggleVideo}
                        className={`p-3 sm:p-4 rounded-full ${
                          videoEnabled 
                            ? 'bg-brand-card hover:bg-brand-black/60 border border-brand-black/10' 
                            : 'bg-red-500 hover:bg-red-600'
                        } text-white backdrop-blur-sm shadow-lg transform hover:scale-105 transition-all duration-200`}
                      >
                        <VideoCameraIcon className="fluid-icon" />
                      </button>
                      <button
                        onClick={() => { setEndState('closed'); handleEndChat(); }}
                        className="p-3 sm:p-4 rounded-full bg-red-500 hover:bg-red-600 text-white backdrop-blur-sm shadow-lg transform hover:scale-105 transition-all duration-200"
                      >
                        <XMarkIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                      </button>
                      </div>
                    </div>

                    {/* End/Stop Overlay */}
                    {endState && (
                      <div className="absolute inset-0 z-40 bg-brand-black/70 backdrop-blur-sm flex items-center justify-center">
                        <div className="bg-brand-card rounded-2xl p-8 max-w-md w-full shadow-2xl border border-gray-200 dark:border-white/10">
                          <h3 className="text-fluid-lg font-bold text-white mb-2">
                            {endState === 'stopped' ? 'Chat Stopped' : 'Chat Ended'}
                          </h3>
                          <p className="text-gray-300 text-fluid-sm mb-6">
                            {endState === 'stopped' 
                              ? 'You have stopped the current chat. You can find a new partner anytime.'
                              : 'You ended the chat. Want to meet someone new?'}
                          </p>
                          <div className="flex items-center justify-center gap-3 flex-wrap">
                            <button
                              onClick={() => { setEndState(null); handleNext(); }}
                              className="px-5 py-2.5 rounded-xl bg-brand-green hover:brightness-110 text-white shadow-lg shadow-emerald-500/20 text-fluid-base"
                            >
                              Next
                            </button>
                            <button
                              onClick={() => setEndState(null)}
                              className="px-5 py-2.5 rounded-xl bg-brand-card text-gray-300 hover:bg-brand-black/60 border border-brand-black/10 text-fluid-base"
                            >
                              Close
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Loading State */}
                    {!isConnected && (
                      <div className="absolute inset-0 bg-brand-black/90 backdrop-blur-sm flex items-center justify-center z-30">
                        <div className="text-center px-6">
                          <div className="w-16 h-16 border-4 border-brand-green border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
                          <h3 className="text-fluid-lg font-bold text-white mb-2">Looking for someone...</h3>
                          <p className="text-gray-400 text-fluid-sm">
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
            <div className="bg-brand-card backdrop-blur-md rounded-2xl overflow-hidden flex flex-col h-full shadow-2xl border border-brand-black/10 w-full mx-auto">
              {/* Chat Header (minimal, centered) */}
              <div className="bg-brand-black/50 backdrop-blur-sm px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-center gap-2 flex-wrap border-b border-brand-black/10">
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <div className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`}></div>
                  <span className="text-white font-medium text-fluid-base">
                    {isConnected ? 'Connected' : 'Finding partner...'}
                  </span>
                </div>
                
              </div>

              {/* Messages */}
              <div
                ref={chatContainerRef}
                className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-white/10 scrollbar-track-transparent scroll-smooth-touch"
              >
                {messages.map((msg, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${msg.type === 'system' ? 'justify-center' : msg.senderId === socket.current?.id ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.type === 'system' ? (
                      <div className="bg-brand-black/20 text-gray-300 px-4 py-1.5 rounded-full text-fluid-sm backdrop-blur-sm">
                        {msg.message}
                      </div>
                    ) : (
                      <div
                        className={`max-w-[85%] sm:max-w-[75%] px-4 py-2.5 rounded-2xl shadow-lg ${
                          msg.senderId === socket.current?.id
                            ? 'bg-brand-green text-white ml-4'
                            : 'bg-brand-card text-gray-300 mr-4'
                        }`}
                      >
                        <div className="text-fluid-base">{msg.message}</div>
                        {msg.timestamp && (
                          <div className={`text-[10px] mt-1 opacity-80 ${msg.senderId === socket.current?.id ? 'text-white/80' : 'text-gray-400/80'}`}>
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>

              {/* Typing indicator */}
              {partnerTyping && (
                <div className="px-4 sm:px-6 pb-1 text-gray-500 dark:text-gray-400 text-sm">
                  Stranger is typing...
                </div>
              )}

              {/* Chat Input */}
              <div className="p-3 sm:p-4 bg-gray-50 dark:bg-brand-black/50 backdrop-blur-sm border-t border-gray-200 dark:border-white/10">
                <div className="relative flex items-center gap-2 sm:gap-3 flex-wrap w-full">
                  {/* Emoji toggle */}
                  <button
                    type="button"
                    onClick={() => setShowEmoji(v => !v)}
                    className="hidden sm:inline-flex px-3 py-2 rounded-xl bg-white dark:bg-brand-card text-xl border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-brand-black/60 ring-brand-focus shrink-0"
                    aria-label="Toggle emoji picker"
                  >
                    🙂
                  </button>
                  <input
                    type="text"
                    value={message}
                    onChange={handleMessageChange}
                    onKeyDown={handleKeyDown}
                    onKeyPress={handleKeyPress}
                    onKeyUp={handleKeyUp}
                    autoFocus
                    placeholder="Type a message..."
                    className="min-w-0 w-0 flex-1 basis-0 bg-white dark:bg-brand-card text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 focus:outline-none ring-brand-focus border border-gray-200 dark:border-white/10 text-sm sm:text-base"
                  />
                  <button
                    onClick={handleSendMessage}
                    type="button"
                    className={`shrink-0 w-full sm:w-auto basis-full sm:basis-auto mt-2 sm:mt-0 px-3 sm:px-5 py-2.5 sm:py-3 rounded-xl font-medium transition-all duration-200 text-sm sm:text-base ${
                      message.trim()
                        ? 'bg-brand-green hover:brightness-110 text-white shadow-lg shadow-emerald-500/20 transform hover:scale-105 text-fluid-base'
                        : 'bg-gray-100 dark:bg-brand-card text-gray-400 dark:text-gray-500 cursor-not-allowed border border-gray-200 dark:border-white/10 text-fluid-base'
                    }`}
                  >
                    Send
                  </button>

                  {/* Emoji palette */}
                  {showEmoji && (
                    <div className="absolute bottom-full mb-2 left-0 bg-white dark:bg-brand-card border border-gray-200 dark:border-white/10 rounded-2xl p-2 shadow-2xl max-w-[90vw] sm:max-w-[380px] w-max z-30">
                      <div className="grid grid-cols-8 gap-1">
                        {commonEmojis.map((em) => (
                          <button
                            key={em}
                            type="button"
                            className="w-8 h-8 sm:w-9 sm:h-9 text-xl rounded-lg hover:bg-gray-100 dark:hover:bg-brand-black/60"
                            onClick={() => {
                              setMessage((prev) => (prev || '') + em)
                              setShowEmoji(false)
                              handleTyping()
                            }}
                          >
                            {em}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Control Bar (Centered) */}
      <div className="fixed bottom-0 inset-x-0 z-40">
        <div className="w-full">
          <div className="m-3 px-3 sm:px-6 py-3 bg-white/80 dark:bg-brand-card/80 backdrop-blur-md rounded-2xl border border-gray-200 dark:border-white/10 shadow-lg flex items-center justify-center gap-3 sm:gap-4 flex-wrap">
            {/* Status */}
            <div className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`}></div>
              <span className="text-gray-900 dark:text-white font-medium text-sm sm:text-base">{isConnected ? 'Connected' : 'Finding partner...'}</span>
            </div>

            {/* Country + Gender pill */}
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-50 dark:bg-brand-black text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-white/10 text-xs sm:text-sm">
              <span className="text-base leading-none">{countryFlags[selectedCountry] || '🌐'}</span>
              <span className="font-medium">{countryNames[selectedCountry] || 'Any'}</span>
              <span className="opacity-60">•</span>
              <span>{selectedGender === 'any' ? 'Any gender' : (selectedGender === 'male' ? 'Male' : 'Female')}</span>
            </span>

            {/* Country selector */}
            <select
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              className="px-2 py-2 rounded-lg bg-white dark:bg-brand-card text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-white/10 text-xs sm:text-sm"
              title="Country filter"
            >
              <option value="any">Any Country</option>
              <option value="us">United States</option>
              <option value="in">India</option>
              <option value="gb">United Kingdom</option>
              <option value="ca">Canada</option>
              <option value="au">Australia</option>
              <option value="de">Germany</option>
              <option value="fr">France</option>
              <option value="br">Brazil</option>
            </select>

            {/* Gender quick toggle: Male */}
            <button
              type="button"
              onClick={() => setSelectedGender(g => g === 'male' ? 'any' : 'male')}
              className={`px-3 py-2 rounded-lg text-xs sm:text-sm border ${selectedGender === 'male' ? 'bg-brand-green text-white border-brand-green' : 'bg-white dark:bg-brand-card text-gray-700 dark:text-gray-200 border-gray-200 dark:border-white/10'}`}
              title="Toggle Male filter"
            >
              Male {selectedGender === 'male' ? '✓' : ''}
            </button>

            {/* Stop and Next */}
            <button
              onClick={() => { setEndState('stopped'); handleStop(); }}
              className="px-3 sm:px-4 py-2 rounded-lg bg-gray-200 dark:bg-brand-card text-gray-800 dark:text-gray-100 text-sm hover:bg-gray-300 dark:hover:bg-brand-black/60 transition-all"
            >
              Stop
            </button>
            <button
              onClick={() => { setEndState(null); handleNext(); }}
              className="px-3 sm:px-4 py-2 rounded-lg bg-brand-green hover:brightness-110 text-white text-sm shadow-lg shadow-emerald-500/20 transition-all"
            >
              Next
            </button>
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
            className="fixed inset-0 bg-white/95 dark:bg-brand-black/95 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className="bg-white dark:bg-brand-card rounded-2xl p-8 max-w-md w-full shadow-2xl border border-gray-200 dark:border-white/10"
            >
              <h3 className="text-xl text-gray-900 dark:text-white font-semibold mb-4">Report User</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-8">
                Are you sure you want to report this user for inappropriate behavior?
              </p>
              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => setShowReport(false)}
                  className="px-6 py-2.5 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-brand-black/60 rounded-xl transition-colors"
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
