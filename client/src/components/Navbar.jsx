import { useState, useEffect } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { SunIcon, MoonIcon, Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline'

export default function Navbar() {
  const location = useLocation()
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

  const navItems = [
    { name: 'Home', path: '/' },
    { name: 'Text Chat', path: '/chat?type=text' },
    { name: 'Video Chat', path: '/chat?type=video' },
  ]

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-brand-black/80 backdrop-blur-lg border-b border-gray-200 dark:border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              Chat<span className="text-brand-green">rr</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8 relative">
            {navItems.map((item) => (
              <div key={item.name} className="relative">
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    `pb-1 transition-colors ${isActive ? 'text-brand-green' : 'text-gray-600 dark:text-gray-300 hover:text-brand-green dark:hover:text-brand-green'}`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span>{item.name}</span>
                      {isActive && (
                        <motion.div
                          layoutId="nav-underline"
                          className="absolute -bottom-1 left-0 right-0 h-0.5 bg-brand-green rounded-full"
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        />
                      )}
                    </>
                  )}
                </NavLink>
              </div>
            ))}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsDark(!isDark)}
              className="p-2 rounded-xl bg-gray-100 dark:bg-brand-card hover:bg-gray-200 dark:hover:bg-brand-black/60 transition-colors border border-transparent dark:border-white/10"
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
        className="md:hidden overflow-hidden bg-white dark:bg-brand-black border-b border-gray-200 dark:border-white/10"
      >
        <div className="px-4 py-3 space-y-3">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              onClick={() => setIsMenuOpen(false)}
              className={({ isActive }) =>
                `block pb-1 ${isActive ? 'text-brand-green' : 'text-gray-600 dark:text-gray-300 hover:text-brand-green dark:hover:text-brand-green'}`
              }
            >
              {({ isActive }) => (
                <div className="relative inline-block">
                  <span>{item.name}</span>
                  {isActive && (
                    <motion.div
                      layoutId="nav-underline"
                      className="absolute -bottom-1 left-0 right-0 h-0.5 bg-brand-green rounded-full"
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  )}
                </div>
              )}
            </NavLink>
          ))}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsDark(!isDark)}
            className="w-full p-2 rounded-xl bg-gray-100 dark:bg-brand-card hover:bg-gray-200 dark:hover:bg-brand-black/60 transition-colors flex items-center space-x-2 border border-transparent dark:border-white/10"
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
