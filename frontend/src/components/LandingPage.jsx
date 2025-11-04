import React, { useState, useEffect } from 'react'
import { TrendingUp, BarChart3, DollarSign, Shield, ArrowDown, CreditCard } from 'lucide-react'
import Login from './Login'
import './LandingPage.css'

function LandingPage({ onLogin }) {
  const [showLogin, setShowLogin] = useState(false)
  const [scrollPosition, setScrollPosition] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      const position = window.scrollY
      setScrollPosition(position)
      if (position > 300) {
        setShowLogin(true)
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="landing-container">
      {/* Hero Section - Split Screen Design */}
      <section className="hero-section">
        <div className="hero-split">
          {/* Left Side - Text Section */}
          <div className="hero-left">
            {/* Animated Dot Grid Background */}
            <div className="dot-grid-overlay"></div>
            <div className="hero-text-content">
              {/* Logo and Name - Top of section */}
              <div className="hero-brand">
                <div className="brand-logo">
                  <img 
                    src="/logo.png" 
                    alt="OpenAudit Logo" 
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                  <div className="logo-fallback" style={{ display: 'none' }}>
                    <BarChart3 size={56} color="#ffffff" />
                  </div>
                </div>
                <h1 className="brand-name">OpenAudit</h1>
              </div>
              
              {/* Slogan - Three parts: Simplified (white), Financial (green), Clarity (red) */}
              <div className="hero-slogan-container">
                <div className="hero-slogan">
                  <span className="slogan-line-1">Simplified</span>
                  <span className="slogan-line-2">Financial</span>
                  <span className="slogan-line-3">Clarity</span>
                </div>
              </div>
              
              {/* 3D Credit Card Animation - Bottom of section */}
              <div className="credit-card-3d-container">
                <div className="credit-card-3d">
                  <div className="card-front">
                    <div className="card-logo">
                      <div className="card-logo-circle"></div>
                      <div className="card-logo-circle"></div>
                    </div>
                    <div className="card-chip">
                      <div className="chip-lines"></div>
                    </div>
                    <div className="card-number">**** **** **** 4521</div>
                    <div className="card-bottom">
                      <div className="card-name">JOHN DOE</div>
                      <div className="card-expiry">
                        <span className="expiry-label">VALID THRU</span>
                        <span className="expiry-date">12/25</span>
                      </div>
                    </div>
                    <div className="card-decoration"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Office Scene */}
          <div className="hero-right">
            <div className="office-image-container">
              <img 
                src="https://images.unsplash.com/photo-1552664730-d307ca884978?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80" 
                alt="Professional team working at office" 
                className="office-image"
                onError={(e) => {
                  // Fallback to a gradient if image fails to load
                  e.target.style.display = 'none'
                  e.target.parentElement.classList.add('office-fallback')
                }}
              />
              <div className="office-overlay"></div>
            </div>
          </div>
        </div>
        <div className="scroll-indicator">
          <ArrowDown size={24} />
          <span>Scroll to continue</span>
        </div>
      </section>

      {/* Login Section - Appears after scroll */}
      <section className={`login-section ${showLogin ? 'visible' : ''}`}>
        <div className="login-wrapper-container">
          <Login onLogin={onLogin} />
        </div>
      </section>
    </div>
  )
}

export default LandingPage
