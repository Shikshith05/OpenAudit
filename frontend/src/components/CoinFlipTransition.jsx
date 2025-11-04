import React, { useEffect, useState } from 'react'
import './CoinFlipTransition.css'

function CoinFlipTransition({ onComplete }) {
  const [stage, setStage] = useState('enter') // enter, spin, zoom, fade
  const [logoError, setLogoError] = useState(false)

  useEffect(() => {
    // Enter stage - logo appears and rotates
    const enterTimer = setTimeout(() => {
      setStage('spin')
    }, 500)
    
    // Spin stage - logo spins
    const spinTimer = setTimeout(() => {
      setStage('zoom')
    }, 1400)
    
    // Zoom stage - logo zooms to fill screen
    const zoomTimer = setTimeout(() => {
      setStage('fade')
    }, 2200)
    
    // Fade out and complete
    const completeTimer = setTimeout(() => {
      if (onComplete) onComplete()
    }, 2800)

    return () => {
      clearTimeout(enterTimer)
      clearTimeout(spinTimer)
      clearTimeout(zoomTimer)
      clearTimeout(completeTimer)
    }
  }, [onComplete])

  return (
    <div className={`logo-transition ${stage}`}>
      <div className="transition-background">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
        <div className="gradient-orb orb-3"></div>
      </div>
      <div className="logo-container">
        <div className="logo-wrapper">
          {!logoError ? (
            <img 
              src="/logo.png" 
              alt="OpenAudit Logo" 
              className="transition-logo"
              onError={() => setLogoError(true)}
            />
          ) : (
            <div className="logo-fallback-transition">
              <svg width="120" height="120" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 13H21M3 6H21M3 20H21" stroke="#10b981" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="6" cy="9" r="1" fill="#10b981"/>
                <circle cx="18" cy="17" r="1" fill="#10b981"/>
              </svg>
            </div>
          )}
          <div className="logo-glow"></div>
          <div className="logo-particles">
            <div className="particle particle-1"></div>
            <div className="particle particle-2"></div>
            <div className="particle particle-3"></div>
            <div className="particle particle-4"></div>
            <div className="particle particle-5"></div>
            <div className="particle particle-6"></div>
          </div>
        </div>
        <div className="logo-text">OpenAudit</div>
      </div>
    </div>
  )
}

export default CoinFlipTransition

