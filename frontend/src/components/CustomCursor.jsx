import React, { useEffect, useState } from 'react'
import './CustomCursor.css'

function CustomCursor() {
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isHovering, setIsHovering] = useState(false)

  useEffect(() => {
    const updateCursor = (e) => {
      setPosition({ x: e.clientX, y: e.clientY })
    }

    const handleMouseEnter = (e) => {
      const target = e.target
      if (target.closest('button, a, .feature-item, .visual-card, .scroll-indicator, .login-card, .admin-login-card, .option-card')) {
        setIsHovering(true)
      }
    }

    const handleMouseLeave = (e) => {
      const target = e.target
      if (target.closest('button, a, .feature-item, .visual-card, .scroll-indicator, .login-card, .admin-login-card, .option-card')) {
        setIsHovering(false)
      }
    }

    window.addEventListener('mousemove', updateCursor)
    document.addEventListener('mouseenter', handleMouseEnter, true)
    document.addEventListener('mouseleave', handleMouseLeave, true)

    return () => {
      window.removeEventListener('mousemove', updateCursor)
      document.removeEventListener('mouseenter', handleMouseEnter, true)
      document.removeEventListener('mouseleave', handleMouseLeave, true)
    }
  }, [])

  return (
    <div
      className={`custom-cursor ${isHovering ? 'hover' : ''}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
    />
  )
}

export default CustomCursor
