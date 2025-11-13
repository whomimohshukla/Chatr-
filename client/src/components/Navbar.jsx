import { useState, useEffect } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { SunIcon, MoonIcon, Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline'

export default function Navbar() {
  const location = useLocation()
  const params = new URLSearchParams(location.search)
  const chatType = params.get('type')
  const isHomeActive = location.pathname === '/'
  const isTextActive = location.pathname === '/chat' && (chatType === 'text')
  const isVideoActive = location.pathname === '/chat' && (chatType === 'video' || chatType === null)
  // Compute initial theme synchronously to avoid light flash; default to dark
  const [isDark, setIsDark] = useState(() => {
    try {
      const stored = localStorage.getItem('theme')
      if (stored === 'dark') return true
      if (stored === 'light') return false
      // fallback to system preference; if unavailable, default dark
      return window.matchMedia('(prefers-color-scheme: dark)').matches || true
    } catch {
      return true
    }
  })
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  // Persist changes and toggle class when user toggles theme
  useEffect(() => {
    try {
      if (isDark) {
        document.documentElement.classList.add('dark')
        localStorage.setItem('theme', 'dark')
      } else {
        document.documentElement.classList.remove('dark')
        localStorage.setItem('theme', 'light')
      }
    } catch {}
  }, [isDark])

  // Close mobile menu on route changes
  useEffect(() => {
    setIsMenuOpen(false)
  }, [location.pathname, location.search])

  const linkBase = 'px-2 pb-1 text-sm font-medium tracking-wide transition-colors'
  const activeClass = 'text-brand-green'
  const inactiveClass = 'text-gray-700 dark:text-gray-300 hover:text-brand-green dark:hover:text-brand-green'

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-brand-black/80 backdrop-blur-lg border-b border-gray-200/70 dark:border-white/10 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              Chat<span className="text-brand-green">rr</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6 relative">
            <div className="relative">
              <Link to="/" className={`${linkBase} ${isHomeActive ? activeClass : inactiveClass}`}>
                Home
              </Link>
              {isHomeActive && (
                <motion.div layoutId="nav-underline" className="absolute -bottom-1 left-1 right-1 h-0.5 bg-brand-green/90 rounded-full" transition={{ type: 'spring', stiffness: 500, damping: 30 }} />
              )}
            </div>
            <div className="relative">
              <Link to="/chat?type=text" className={`${linkBase} ${isTextActive ? activeClass : inactiveClass}`}>
                Text Chat
              </Link>
              {isTextActive && (
                <motion.div layoutId="nav-underline" className="absolute -bottom-1 left-1 right-1 h-0.5 bg-brand-green/90 rounded-full" transition={{ type: 'spring', stiffness: 500, damping: 30 }} />
              )}
            </div>
            <div className="relative">
              <Link to="/chat?type=video" className={`${linkBase} ${isVideoActive ? activeClass : inactiveClass}`}>
                Video Chat
              </Link>
              {isVideoActive && (
                <motion.div layoutId="nav-underline" className="absolute -bottom-1 left-1 right-1 h-0.5 bg-brand-green/90 rounded-full" transition={{ type: 'spring', stiffness: 500, damping: 30 }} />
              )}
            </div>
            <Link
              to="/chat?type=video"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 text-white text-sm font-semibold shadow-md hover:shadow-lg hover:brightness-110 transition-all border border-emerald-500/10"
            >
              <span>Start Chat</span>
            </Link>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsDark(!isDark)}
              className="p-2 rounded-xl bg-gray-100 dark:bg-brand-card hover:bg-gray-200 dark:hover:bg-brand-black/60 transition-colors border border-gray-200 dark:border-white/10"
            >
              {isDark ? (
                <SunIcon className="w-5 h-5 text-yellow-500" />
              ) : (
                <MoonIcon className="w-5 h-5 text-gray-600" />
              )}
            </motion.button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              {isMenuOpen ? (
                <XMarkIcon className="w-6 h-6 text-gray-600 dark:text-gray-300" />
              ) : (
                <Bars3Icon className="w-6 h-6 text-gray-600 dark:text-gray-300" />
              )}
            </motion.button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <motion.div
        initial={false}
        animate={{
          height: isMenuOpen ? 'auto' : 0,
          opacity: isMenuOpen ? 1 : 0,
        }}
        className="md:hidden overflow-hidden bg-white/95 dark:bg-brand-black/95 backdrop-blur-lg border-b border-gray-200/70 dark:border-white/10 shadow"
      >
        <div className="px-4 py-3 space-y-3">
          <Link to="/" onClick={() => setIsMenuOpen(false)} className={`block pb-1 text-base ${isHomeActive ? activeClass : inactiveClass}`}>
            Home
          </Link>
          <Link to="/chat?type=text" onClick={() => setIsMenuOpen(false)} className={`block pb-1 text-base ${isTextActive ? activeClass : inactiveClass}`}>
            Text Chat
          </Link>
          <Link to="/chat?type=video" onClick={() => setIsMenuOpen(false)} className={`block pb-1 text-base ${isVideoActive ? activeClass : inactiveClass}`}>
            Video Chat
          </Link>
          <Link
            to="/chat?type=video"
            onClick={() => setIsMenuOpen(false)}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 text-white text-sm font-semibold shadow-md hover:shadow-lg hover:brightness-110 transition-all"
          >
            Start Chat
          </Link>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsDark(!isDark)}
            className="w-full p-2 rounded-xl bg-gray-100 dark:bg-brand-card hover:bg-gray-200 dark:hover:bg-brand-black/60 transition-colors flex items-center space-x-2 border border-gray-200 dark:border-white/10"
          >
            {isDark ? (
              <>
                <SunIcon className="w-5 h-5 text-yellow-500" />
                <span className="text-gray-600 dark:text-gray-300">Light Mode</span>
              </>
            ) : (
              <>
                <MoonIcon className="w-5 h-5 text-gray-600" />
                <span className="text-gray-600 dark:text-gray-300">Dark Mode</span>
              </>
            )}
          </motion.button>
        </div>
      </motion.div>
    </nav>
  )
}
