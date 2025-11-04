import React, { useEffect, useState } from 'react'
import './DollarTransition.css'

function DollarTransition({ onComplete }) {
  const [stage, setStage] = useState('rotate') // rotate, zoom, fade

  useEffect(() => {
    // Rotate stage - fast rotation
    const rotateTimer = setTimeout(() => {
      setStage('zoom')
    }, 2000)
    
    // Zoom stage - pan and zoom to screen
    const zoomTimer = setTimeout(() => {
      setStage('fade')
    }, 3500)
    
    // Fade out and complete
    const completeTimer = setTimeout(() => {
      if (onComplete) onComplete()
    }, 4000)

    return () => {
      clearTimeout(rotateTimer)
      clearTimeout(zoomTimer)
      clearTimeout(completeTimer)
    }
  }, [onComplete])

  return (
    <div className={`dollar-transition ${stage}`}>
      <div className="transition-background">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
        <div className="gradient-orb orb-3"></div>
      </div>
      <div className="dollar-icon">
        <div className="dollar-symbol">$</div>
        <div className="glow-effect"></div>
        <div className="particle particle-1"></div>
        <div className="particle particle-2"></div>
        <div className="particle particle-3"></div>
        <div className="particle particle-4"></div>
      </div>
    </div>
  )
}

export default DollarTransition
