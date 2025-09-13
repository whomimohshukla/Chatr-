import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import Navbar from './components/Navbar'
import ScrollProgress from './components/ScrollProgress'
import Home from './pages/Home'
import Chat from './pages/Chat'
import Settings from './pages/Settings'

function RoutesWithAnimation() {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Home />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </AnimatePresence>
  )
}

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50 dark:bg-brand-black">
        <ScrollProgress />
        <Navbar />
        <RoutesWithAnimation />
      </div>
    </Router>
  )
}

export default App
