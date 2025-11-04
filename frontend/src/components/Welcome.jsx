import React, { useEffect, useState } from 'react'
import { TrendingUp, BarChart3, Upload } from 'lucide-react'
import Chatbot from './Chatbot'
import './Welcome.css'

function Welcome({ user, onStartAnalysis, onViewHistory }) {
  const [showContent, setShowContent] = useState(false)
  const [logoError, setLogoError] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), 1500)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="welcome-container">
      <div className={`welcome-logo ${showContent ? 'fade-in' : ''}`}>
        {!logoError ? (
          <img 
            src="/logo.png" 
            alt="OpenAudit Logo" 
            onError={(e) => {
              setLogoError(true)
              e.target.style.display = 'none'
            }}
          />
        ) : null}
        {logoError && (
          <div className="logo-fallback">
            <BarChart3 size={80} color="#6366f1" />
          </div>
        )}
      </div>

      {showContent && (
        <div className="welcome-content fade-in">
          <h1 className="welcome-title">
            Welcome to OpenAudit, {user?.full_name || 'User'}!
          </h1>
          <p className="welcome-subtitle">
            Ready to discover insights about your spending habits?
          </p>

          <div className="welcome-options">
            <div className="option-card" onClick={onStartAnalysis}>
              <div className="option-icon">
                <TrendingUp size={32} color="#6366f1" />
              </div>
              <h3>Analyze Your Spending</h3>
              <p>Upload your bank statement and get instant insights</p>
              <div className="option-badge">Quick Analysis</div>
            </div>

            <div className="option-card" onClick={onViewHistory}>
              <div className="option-icon">
                <BarChart3 size={32} color="#10b981" />
              </div>
              <h3>View History & Reports</h3>
              <p>View your previous analyses and download detailed PDF reports</p>
              <div className="option-badge">Available</div>
            </div>
          </div>

          <div className="welcome-cta">
            <button className="btn btn-primary btn-large" onClick={onStartAnalysis}>
              <Upload size={24} />
              Start Analyzing My Spending
            </button>
          </div>
        </div>
      )}
      <Chatbot user={user} accountType="personal" />
    </div>
  )
}

export default Welcome

