
// this is homepage page



import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  VideoCameraIcon,
  ChatBubbleLeftRightIcon,
  GlobeAltIcon,
  UserGroupIcon,
  SparklesIcon,
  ArrowRightIcon,
  HeartIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline'

export default function Home() {
  const navigate = useNavigate()
  const [interests, setInterests] = useState('')
  const [hoveredCard, setHoveredCard] = useState(null)

  const handleStartChat = (type) => {
    const interestsList = interests
      .split(',')
      .map((interest) => interest.trim())
      .filter(Boolean)
    
    const queryParams = new URLSearchParams()
    queryParams.set('type', type)
    if (interestsList.length > 0) {
      queryParams.set('interests', interestsList.join(','))
    }
    
    navigate(`/chat?${queryParams.toString()}`)
  }

  const features = [
    {
      icon: GlobeAltIcon,
      title: 'Global Community',
      description: 'Connect with people from around the world instantly.',
      color: 'from-blue-500 to-cyan-500',
    },
    {
      icon: UserGroupIcon,
      title: 'Anonymous Chat',
      description: 'Chat freely without revealing your identity.',
      color: 'from-purple-500 to-pink-500',
    },
    {
      icon: SparklesIcon,
      title: 'Interest Matching',
      description: 'Find people who share your interests and passions.',
      color: 'from-amber-500 to-orange-500',
    },
    {
      icon: HeartIcon,
      title: 'Make Friends',
      description: 'Build meaningful connections with new people.',
      color: 'from-red-500 to-rose-500',
    },
    {
      icon: ShieldCheckIcon,
      title: 'Safe & Secure',
      description: 'Your privacy and security are our top priority.',
      color: 'from-emerald-500 to-teal-500',
    },
  ]

  return (
    <div className="min-h-screen pt-16 bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-purple-900">
      {/* Hero Section */}
      <section className="py-20 px-4 relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-300 dark:bg-purple-900 rounded-full blur-3xl opacity-30" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-300 dark:bg-indigo-900 rounded-full blur-3xl opacity-30" />
        </div>

        <div className="max-w-7xl mx-auto relative">
          <div className="text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="inline-block mb-4 px-6 py-2 rounded-full bg-gradient-to-r from-indigo-500/10 to-purple-500/10 dark:from-indigo-500/20 dark:to-purple-500/20 backdrop-blur-sm"
            >
              <span className="text-sm md:text-base bg-gradient-to-r from-indigo-500 to-purple-500 text-transparent bg-clip-text font-medium">
                Start connecting with people worldwide
              </span>
            </motion.div>
            
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-indigo-500 to-purple-500 text-transparent bg-clip-text mb-6"
            >
              Meet New People
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-12 max-w-3xl mx-auto"
            >
              Connect with strangers, share interests, and make new friends in a safe and engaging environment
            </motion.p>

            {/* Chat Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto mb-12">
              <motion.button
                whileHover={{ scale: 1.02, y: -5 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleStartChat('text')}
                onMouseEnter={() => setHoveredCard('text')}
                onMouseLeave={() => setHoveredCard(null)}
                className="group relative p-8 rounded-3xl bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-indigo-500/10 to-purple-500/10 dark:from-indigo-500/5 dark:to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative">
                  <div className="flex items-center justify-between mb-6">
                    <div className="p-3 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20">
                      <ChatBubbleLeftRightIcon className="w-8 h-8 text-indigo-500" />
                    </div>
                    <motion.div
                      animate={{ x: hoveredCard === 'text' ? 5 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ArrowRightIcon className="w-6 h-6 text-gray-400 group-hover:text-indigo-500 transition-colors" />
                    </motion.div>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-3">Text Chat</h3>
                  <p className="text-gray-600 dark:text-gray-300">Connect through messages and express yourself freely</p>
                </div>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02, y: -5 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleStartChat('video')}
                onMouseEnter={() => setHoveredCard('video')}
                onMouseLeave={() => setHoveredCard(null)}
                className="group relative p-8 rounded-3xl bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 dark:from-purple-500/5 dark:to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative">
                  <div className="flex items-center justify-between mb-6">
                    <div className="p-3 rounded-2xl bg-purple-500/10 dark:bg-purple-500/20">
                      <VideoCameraIcon className="w-8 h-8 text-purple-500" />
                    </div>
                    <motion.div
                      animate={{ x: hoveredCard === 'video' ? 5 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ArrowRightIcon className="w-6 h-6 text-gray-400 group-hover:text-purple-500 transition-colors" />
                    </motion.div>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-3">Video Chat</h3>
                  <p className="text-gray-600 dark:text-gray-300">Have face-to-face conversations and make real connections</p>
                </div>
              </motion.button>
            </div>

            {/* Interests Input */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="max-w-md mx-auto"
            >
              <div className="relative">
                <input
                  type="text"
                  placeholder="Enter your interests (e.g., music, travel, gaming)"
                  value={interests}
                  onChange={(e) => setInterests(e.target.value)}
                  className="w-full px-6 py-4 rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm focus:ring-4 focus:ring-indigo-500/20 dark:focus:ring-purple-500/20 focus:border-indigo-500 dark:focus:border-purple-500 transition-all text-lg placeholder:text-gray-400 dark:placeholder:text-gray-500"
                />
                <AnimatePresence>
                  {interests && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700"
                      onClick={() => setInterests('')}
                    >
                      <span className="sr-only">Clear interests</span>
                      <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>
              <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                Add interests to match with people who share your passions
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="py-24 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-900 dark:to-gray-800"
      >
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Why Choose Stranger Connect?
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              Everything you need for seamless conversations
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ y: -5 }}
                className="p-8 rounded-3xl bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl transition-all duration-300 group"
              >
                <div className={`p-4 rounded-2xl bg-gradient-to-br ${feature.color} bg-opacity-10 dark:bg-opacity-20 w-fit mb-6 group-hover:scale-110 transition-transform`}>
                  <feature.icon className={`w-8 h-8 bg-gradient-to-br ${feature.color} text-transparent bg-clip-text`} />
                </div>
                <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Chat Features Section */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="py-24 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-900 dark:to-gray-800"
      >
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Powerful Chat Features
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              Everything you need for seamless conversations
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Custom Avatars */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg"
            >
              <span className="text-4xl mb-4 block">🎭</span>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Custom Avatars
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Choose from hundreds of avatars or create your own unique identity
              </p>
            </motion.div>

            {/* Mini Games */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg"
            >
              <span className="text-4xl mb-4 block">🎮</span>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Mini Games
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Play fun mini-games while chatting to break the ice
              </p>
            </motion.div>

            {/* Themes & Customization */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg"
            >
              <span className="text-4xl mb-4 block">🎨</span>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Themes & Customization
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Personalize your chat interface with custom themes and colors
              </p>
            </motion.div>

            {/* Auto Translation */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg"
            >
              <span className="text-4xl mb-4 block">🌍</span>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Auto Translation
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Chat with anyone, anywhere with real-time message translation
              </p>
            </motion.div>

            {/* Music Sharing */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg"
            >
              <span className="text-4xl mb-4 block">🎵</span>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Music Sharing
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Share and listen to music together while chatting
              </p>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* How It Works Section */}
      <section className="py-20 px-4 relative overflow-hidden">
        <div className="max-w-7xl mx-auto relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
              Connect with people in three simple steps
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
            {[
              {
                step: '01',
                title: 'Choose Your Mode',
                description: 'Select between text or video chat based on your preference',
                image: 'https://images.unsplash.com/photo-1577563908411-5077b6dc7624?auto=format&fit=crop&w=800',
              },
              {
                step: '02',
                title: 'Add Interests',
                description: 'Enter your interests to match with like-minded people',
                image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=800',
              },
              {
                step: '03',
                title: 'Start Chatting',
                description: 'Connect instantly with people from around the world',
                image: 'https://images.unsplash.com/photo-1543269664-56d93c1b41a6?auto=format&fit=crop&w=800',
              },
            ].map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.2 }}
                className="relative group"
              >
                <div className="relative h-64 mb-8 rounded-3xl overflow-hidden group-hover:scale-105 transition-transform duration-300">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-4 left-4">
                    <span className="text-5xl font-bold text-white/30">{item.step}</span>
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                  {item.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Safety Section */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Your Safety Matters
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              We've implemented multiple safety features to ensure a secure chatting experience
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: '🛡️',
                title: 'End-to-End Encryption',
                description: 'Your conversations are fully encrypted and private',
              },
              {
                icon: '⚡',
                title: 'Quick Block',
                description: 'Instantly block any unwanted interactions',
              },
              {
                icon: '👤',
                title: 'Anonymous Chat',
                description: 'Chat without sharing personal information',
              },
              {
                icon: '🚫',
                title: 'Report System',
                description: 'Report inappropriate behavior instantly',
              },
            ].map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="p-6 rounded-2xl bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl transition-all"
              >
                <span className="text-3xl mb-4 block">{feature.icon}</span>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Interactive Demo Section */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-6">
                Experience Real-time Chat
              </h2>
              <div className="space-y-6">
                {[
                  {
                    title: 'Crystal Clear Video',
                    description: 'HD video quality with adaptive streaming',
                    icon: '📹',
                  },
                  {
                    title: 'Smart Matching',
                    description: 'AI-powered matching based on interests',
                    icon: '🤝',
                  },
                  {
                    title: 'Quick Connect',
                    description: 'Connect with new people in seconds',
                    icon: '⚡',
                  },
                ].map((item, index) => (
                  <motion.div
                    key={item.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-start space-x-4"
                  >
                    <div className="w-10 h-10 flex items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
                      <span className="text-xl">{item.icon}</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                        {item.title}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-300">
                        {item.description}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="relative rounded-3xl overflow-hidden shadow-2xl">
                <div className="aspect-w-16 aspect-h-9 bg-gray-100 dark:bg-gray-800">
                  <div className="p-8 flex items-center justify-center">
                    <div className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                      <div className="flex items-center space-x-4 mb-6">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                          <span className="text-xl">👋</span>
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Welcome to Chatrr!
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            Finding you a chat partner...
                          </p>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="animate-pulse">
                          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                        </div>
                        <div className="animate-pulse">
                          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-6 -right-6 w-48 h-48 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Community Guidelines */}
      <section className="py-20 px-4 bg-gradient-to-b from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Community Guidelines
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Help us maintain a friendly and safe environment
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[
              {
                icon: '🤝',
                title: 'Be Respectful',
                description: 'Treat everyone with respect and kindness',
              },
              {
                icon: '🔒',
                title: 'Stay Safe',
                description: 'Never share personal or sensitive information',
              },
              {
                icon: '🚫',
                title: 'No Harassment',
                description: 'Zero tolerance for any form of harassment',
              },
              {
                icon: '💬',
                title: 'Keep it Clean',
                description: 'Maintain appropriate conversation',
              },
            ].map((guideline, index) => (
              <motion.div
                key={guideline.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="flex items-start space-x-6 p-6 rounded-2xl bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl transition-all"
              >
                <div className="w-12 h-12 flex items-center justify-center text-2xl rounded-xl bg-indigo-50 dark:bg-indigo-900/30">
                  {guideline.icon}
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    {guideline.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    {guideline.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 opacity-10 dark:opacity-20" />
        <div className="max-w-7xl mx-auto relative">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
              Ready to Connect?
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
              Join millions of people who are already making meaningful connections worldwide
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleStartChat('text')}
              className="px-8 py-4 text-lg font-medium text-white bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full hover:shadow-lg hover:shadow-indigo-500/25 transition-all"
            >
              Start Chatting Now
            </motion.button>
          </motion.div>

          {/* Background Elements */}
          <div className="absolute top-0 left-0 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob" />
          <div className="absolute top-0 right-0 w-72 h-72 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-2000" />
          <div className="absolute bottom-0 left-1/2 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-4000" />
        </div>
      </section>
    </div>
  )
}
