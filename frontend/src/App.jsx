import React, { useState, useEffect } from 'react'
import Login from './components/Login'
import Signup from './components/Signup'
import Welcome from './components/Welcome'
import Header from './components/Header'
import FileUpload from './components/FileUpload'
import Dashboard from './components/Dashboard'
import AdminPortal from './components/AdminPortal'
import CoinFlipTransition from './components/CoinFlipTransition'
import LandingPage from './components/LandingPage'
import CustomCursor from './components/CustomCursor'
import CompanyPortal from './components/CompanyPortal'
import Chatbot from './components/Chatbot'
import './App.css'

function App() {
  const [user, setUser] = useState(null)
  const [showSignup, setShowSignup] = useState(false)
  const [showWelcome, setShowWelcome] = useState(false)
  const [currentView, setCurrentView] = useState('landing') // landing, login, signup, welcome, dashboard, admin, upload
  const [analysisData, setAnalysisData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showCoinFlipTransition, setShowCoinFlipTransition] = useState(false)
  const [pendingUser, setPendingUser] = useState(null)

  useEffect(() => {
    // Check if user is logged in
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      const userData = JSON.parse(storedUser)
      setUser(userData)
      
      // Route based on account type
      if (userData.is_admin) {
        setCurrentView('admin')
      } else if (userData.account_type === 'company') {
        setCurrentView('company')
      } else {
        setCurrentView('welcome')
        setShowWelcome(true)
      }
    }
  }, [])

  const handleLandingLogin = (userData) => {
    handleLogin(userData)
  }

  const handleLogin = (userData) => {
    if (!userData) {
      // Show signup
      setShowSignup(true)
      setCurrentView('signup')
      return
    }
    
    localStorage.setItem('user', JSON.stringify(userData))
    
    // Determine view based on account type
    if (userData.is_admin) {
      setUser(userData)
      setCurrentView('admin')
    } else if (userData.account_type === 'company') {
      // Company account - show transition then go to company portal
      setPendingUser(userData)
      setShowCoinFlipTransition(true)
      setCurrentView('transition')
    } else {
      // Personal account - show transition then welcome
      setPendingUser(userData)
      setShowCoinFlipTransition(true)
      setCurrentView('transition')
    }
  }

  const handleTransitionComplete = () => {
    setShowCoinFlipTransition(false)
    
    if (pendingUser) {
      setUser(pendingUser)
      
      // Route based on account type
      if (pendingUser.account_type === 'company') {
        setCurrentView('company')
      } else {
        setCurrentView('welcome')
        setShowWelcome(true)
      }
      
      setPendingUser(null)
    }
  }

  const handleSignupVerify = (verified) => {
    if (verified) {
      setCurrentView('login')
      alert('Account created successfully! Please login.')
    }
  }

  const handleStartAnalysis = () => {
    setShowWelcome(false)
    setCurrentView('upload')
  }

  const handleAnalysisComplete = (data) => {
    setAnalysisData(data)
    setCurrentView('dashboard')
  }

  const handleViewHistory = async () => {
    // Load history and show Dashboard with History tab active
    // This combines both viewing history and downloading reports
    if (!user?.id) return
    
    try {
      // Set flag to show history tab immediately
      sessionStorage.setItem('fromReports', 'true')
      
      // Set a minimal data object so Dashboard doesn't show "No Analysis Data"
      setAnalysisData({})
      
      // Navigate to dashboard - HistoryTab will fetch its own data
      setCurrentView('dashboard')
      setShowWelcome(false)
    } catch (err) {
      console.error('Failed to load history:', err)
      alert('Failed to load history. Please try again.')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('user')
    setUser(null)
    setCurrentView('landing')
    setShowWelcome(false)
    setAnalysisData(null)
  }

  // Landing Page View
  if (currentView === 'landing') {
    return (
      <>
        <CustomCursor />
        <LandingPage onLogin={handleLandingLogin} />
      </>
    )
  }

  // Coin Flip Transition View (for non-admin logins)
  if (currentView === 'transition' && showCoinFlipTransition) {
    return (
      <>
        <CustomCursor />
        <CoinFlipTransition onComplete={handleTransitionComplete} />
      </>
    )
  }

  // Login View (standalone)
  if (currentView === 'login') {
    return (
      <>
        <CustomCursor />
        <Login 
          onLogin={handleLogin}
        />
      </>
    )
  }

  // Signup View
  if (currentView === 'signup') {
    return (
      <>
        <CustomCursor />
        <Signup 
          onBackToLogin={() => {
            setCurrentView('login')
            setShowSignup(false)
          }}
          onVerifyOTP={handleSignupVerify}
        />
      </>
    )
  }

  // Welcome View (Personal Portal)
  if (currentView === 'welcome' || showWelcome) {
    return (
      <div className="App">
        <CustomCursor />
        <Header user={user} onLogout={handleLogout} />
        <Welcome 
          user={user}
          onStartAnalysis={handleStartAnalysis}
          onViewHistory={handleViewHistory}
        />
      </div>
    )
  }

  // Admin Portal
  if (currentView === 'admin') {
    return (
      <div className="App">
        <CustomCursor />
        <Header user={user} onLogout={handleLogout} />
        <AdminPortal user={user} />
      </div>
    )
  }

  // Upload View
  if (currentView === 'upload') {
    return (
      <div className="App">
        <CustomCursor />
        <Header user={user} onLogout={handleLogout} />
        <div className="container">
          <FileUpload
            onAnalysisComplete={handleAnalysisComplete}
            loading={loading}
            setLoading={setLoading}
            onBack={() => {
              setCurrentView('welcome')
              setShowWelcome(true)
            }}
          />
        </div>
        {user && <Chatbot user={user} accountType="personal" />}
      </div>
    )
  }

  // Dashboard View
  if (currentView === 'dashboard') {
    return (
      <div className="App">
        <CustomCursor />
        <Header user={user} onLogout={handleLogout} />
        <div className="container">
          <Dashboard 
            data={analysisData}
            user={user}
            onBack={() => {
              setCurrentView('welcome')
              setShowWelcome(true)
              sessionStorage.removeItem('fromReports')
            }}
          />
        </div>
      </div>
    )
  }

  // Company Portal View
  if (currentView === 'company') {
    return (
      <div className="App">
        <CustomCursor />
        <Header user={user} onLogout={handleLogout} />
        <CompanyPortal user={user} />
      </div>
    )
  }

  return null
}

export default App
