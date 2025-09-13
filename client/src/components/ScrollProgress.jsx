import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

export default function ScrollProgress() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const onScroll = () => {
      const scrollTop = window.scrollY
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      const p = docHeight > 0 ? Math.min(1, scrollTop / docHeight) : 0
      setProgress(p)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="fixed top-0 left-0 right-0 h-1 z-[60]">
      <motion.div
        className="h-full bg-gradient-to-r from-emerald-500 to-green-500 shadow-[0_0_10px_rgba(16,185,129,0.35)]"
        style={{ transformOrigin: '0% 50%' }}
        animate={{ scaleX: progress }}
        transition={{ type: 'tween', ease: 'easeOut', duration: 0.1 }}
      />
    </div>
  )
}
