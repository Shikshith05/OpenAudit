import React, { useState } from 'react'
import axios from 'axios'
import { LogIn, Mail, Lock, AlertCircle, Shield, Sparkles } from 'lucide-react'
import './Login.css'

function Login({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [adminUsername, setAdminUsername] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [error, setError] = useState(null)
  const [adminError, setAdminError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [adminLoading, setAdminLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      console.log('[LOGIN] Attempting login for:', username)
      console.log('[LOGIN] Sending request to /api/auth/login')
      
      const response = await axios.post('/api/auth/login', {
        username,
        password
      }, {
        timeout: 10000 // 10 second timeout
      })

      console.log('[LOGIN] Response received:', response)
      console.log('[LOGIN] Response data:', response.data)
      console.log('[LOGIN] Response status:', response.status)

      if (response.data && response.data.status === 'success') {
        console.log('[LOGIN] Login successful, user:', response.data.user)
        
        if (!response.data.user) {
          console.error('[LOGIN] User object is missing from response')
          setError('Invalid response from server')
          setLoading(false)
          return
        }
        
        localStorage.setItem('user', JSON.stringify(response.data.user))
        setLoading(false) // Reset loading before navigation
        
        // Call onLogin in next tick to ensure state is updated
        setTimeout(() => {
          console.log('[LOGIN] Calling onLogin with user:', response.data.user)
          onLogin(response.data.user)
        }, 50)
      } else {
        console.error('[LOGIN] Login failed - no success status:', response.data)
        setError(response.data?.message || 'Login failed')
        setLoading(false)
      }
    } catch (err) {
      console.error('[LOGIN] Error caught:', err)
      console.error('[LOGIN] Error message:', err.message)
      console.error('[LOGIN] Error response:', err.response)
      console.error('[LOGIN] Error response data:', err.response?.data)
      
      if (err.code === 'ECONNABORTED') {
        setError('Request timeout - server may be offline')
      } else if (err.response) {
        setError(err.response?.data?.detail || err.response?.data?.message || 'Invalid username or password')
      } else if (err.request) {
        setError('No response from server - check if backend is running')
      } else {
        setError(err.message || 'An error occurred during login')
      }
      setLoading(false)
    }
  }

  const handleAdminSubmit = async (e) => {
    e.preventDefault()
    setAdminError(null)
    setAdminLoading(true)

    try {
      const response = await axios.post('/api/auth/login', {
        username: adminUsername,
        password: adminPassword
      })

      if (response.data.status === 'success') {
        if (response.data.user.is_admin) {
          localStorage.setItem('user', JSON.stringify(response.data.user))
          setAdminLoading(false) // Reset loading before navigation
          onLogin(response.data.user)
        } else {
          setAdminError('This account does not have admin privileges')
          setAdminLoading(false)
        }
      } else {
        setAdminError(response.data.message || 'Login failed')
        setAdminLoading(false)
      }
    } catch (err) {
      setAdminError(err.response?.data?.detail || err.message || 'Invalid admin credentials')
      setAdminLoading(false)
    }
  }

  return (
    <div className="login-container-landing">
      {/* Floating Financial Elements Background */}
      <div className="financial-bg">
        {/* Stock Charts */}
        <div className="financial-element stock-chart-1">
          <svg viewBox="0 0 200 80" xmlns="http://www.w3.org/2000/svg">
            <polyline points="10,60 30,45 50,50 70,35 90,40 110,25 130,30 150,20 170,25 190,15" 
              fill="none" stroke="currentColor" strokeWidth="2" />
            <polyline points="10,60 30,50 50,55 70,40 90,45 110,30 130,35 150,25 170,30 190,20" 
              fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
          </svg>
        </div>
        <div className="financial-element stock-chart-2">
          <svg viewBox="0 0 180 70" xmlns="http://www.w3.org/2000/svg">
            <polyline points="10,50 25,40 40,45 55,30 70,35 85,20 100,25 115,15 130,20 145,10 160,15 170,8" 
              fill="none" stroke="currentColor" strokeWidth="2" />
            <circle cx="170" cy="8" r="3" fill="currentColor" />
          </svg>
        </div>
        <div className="financial-element stock-chart-3">
          <svg viewBox="0 0 150 60" xmlns="http://www.w3.org/2000/svg">
            <polyline points="10,45 25,35 40,40 55,25 70,30 85,20 100,25 115,15 130,18 140,12" 
              fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>
        </div>

        {/* Bar Charts */}
        <div className="financial-element bar-chart-1">
          <svg viewBox="0 0 120 100" xmlns="http://www.w3.org/2000/svg">
            <rect x="10" y="20" width="15" height="60" fill="currentColor" />
            <rect x="30" y="35" width="15" height="45" fill="currentColor" />
            <rect x="50" y="15" width="15" height="65" fill="currentColor" />
            <rect x="70" y="40" width="15" height="40" fill="currentColor" />
            <rect x="90" y="25" width="15" height="55" fill="currentColor" />
            <line x1="5" y1="80" x2="115" y2="80" stroke="currentColor" strokeWidth="1" />
          </svg>
        </div>
        <div className="financial-element bar-chart-2">
          <svg viewBox="0 0 100 90" xmlns="http://www.w3.org/2000/svg">
            <rect x="8" y="25" width="12" height="55" fill="currentColor" />
            <rect x="25" y="30" width="12" height="50" fill="currentColor" />
            <rect x="42" y="20" width="12" height="60" fill="currentColor" />
            <rect x="59" y="35" width="12" height="45" fill="currentColor" />
            <rect x="76" y="28" width="12" height="52" fill="currentColor" />
          </svg>
        </div>

        {/* Pie Charts */}
        <div className="financial-element pie-chart-1">
          <svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">
            <path d="M 40 40 L 40 10 A 30 30 0 0 1 65 30 Z" fill="currentColor" />
            <path d="M 40 40 L 65 30 A 30 30 0 0 1 55 60 Z" fill="currentColor" opacity="0.7" />
            <path d="M 40 40 L 55 60 A 30 30 0 0 1 15 50 Z" fill="currentColor" opacity="0.5" />
            <path d="M 40 40 L 15 50 A 30 30 0 0 1 40 10 Z" fill="currentColor" opacity="0.3" />
          </svg>
        </div>
        <div className="financial-element pie-chart-2">
          <svg viewBox="0 0 70 70" xmlns="http://www.w3.org/2000/svg">
            <path d="M 35 35 L 35 10 A 25 25 0 0 1 55 25 Z" fill="currentColor" />
            <path d="M 35 35 L 55 25 A 25 25 0 0 1 50 55 Z" fill="currentColor" opacity="0.6" />
            <path d="M 35 35 L 50 55 A 25 25 0 1 1 35 10 Z" fill="currentColor" opacity="0.4" />
          </svg>
        </div>

        {/* Trend Arrows */}
        <div className="financial-element trend-up-1">
          <svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
            <path d="M 30 10 L 45 30 L 35 30 L 35 50 L 25 50 L 25 30 L 15 30 Z" fill="currentColor" />
          </svg>
        </div>
        <div className="financial-element trend-up-2">
          <svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
            <path d="M 25 8 L 38 22 L 30 22 L 30 42 L 20 42 L 20 22 L 12 22 Z" fill="currentColor" />
          </svg>
        </div>
        <div className="financial-element trend-down-1">
          <svg viewBox="0 0 55 55" xmlns="http://www.w3.org/2000/svg">
            <path d="M 27 45 L 12 25 L 22 25 L 22 5 L 32 5 L 32 25 L 42 25 Z" fill="currentColor" />
          </svg>
        </div>

        {/* Dollar Signs */}
        <div className="financial-element dollar-1">
          <svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
            <path d="M 20 5 L 20 35 M 15 10 Q 15 5 20 5 Q 25 5 25 10 Q 25 12 22 14 Q 18 16 18 20 Q 18 25 23 25 Q 25 25 25 27 Q 25 30 20 30 Q 15 30 15 25" 
              fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </div>
        <div className="financial-element dollar-2">
          <svg viewBox="0 0 35 35" xmlns="http://www.w3.org/2000/svg">
            <path d="M 17 4 L 17 31 M 13 8 Q 13 4 17 4 Q 21 4 21 8 Q 21 10 19 12 Q 16 14 16 17 Q 16 21 19 21 Q 21 21 21 23 Q 21 26 17 26 Q 13 26 13 22" 
              fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>

        {/* Percentage Symbols */}
        <div className="financial-element percent-1">
          <svg viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2" />
            <circle cx="33" cy="33" r="4" fill="none" stroke="currentColor" strokeWidth="2" />
            <line x1="35" y1="10" x2="10" y2="35" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </div>
        <div className="financial-element percent-2">
          <svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
            <circle cx="11" cy="11" r="3.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
            <circle cx="29" cy="29" r="3.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
            <line x1="31" y1="9" x2="9" y2="31" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>

        {/* Graph Lines */}
        <div className="financial-element graph-line-1">
          <svg viewBox="0 0 140 4" xmlns="http://www.w3.org/2000/svg">
            <polyline points="0,2 20,1.5 40,1 60,0.5 80,1 100,1.5 120,2 140,1.5" 
              fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>
        </div>
        <div className="financial-element graph-line-2">
          <svg viewBox="0 0 160 4" xmlns="http://www.w3.org/2000/svg">
            <polyline points="0,1.5 25,1 50,0.5 75,1 100,1.5 125,2 150,1.5 160,1" 
              fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>
        </div>

        {/* Additional Bar Charts */}
        <div className="financial-element bar-chart-3">
          <svg viewBox="0 0 90 75" xmlns="http://www.w3.org/2000/svg">
            <rect x="8" y="20" width="10" height="45" fill="currentColor" />
            <rect x="22" y="30" width="10" height="35" fill="currentColor" />
            <rect x="36" y="15" width="10" height="50" fill="currentColor" />
            <rect x="50" y="40" width="10" height="25" fill="currentColor" />
            <rect x="64" y="25" width="10" height="40" fill="currentColor" />
          </svg>
        </div>
        <div className="financial-element bar-chart-4">
          <svg viewBox="0 0 110 85" xmlns="http://www.w3.org/2000/svg">
            <rect x="10" y="30" width="12" height="45" fill="currentColor" />
            <rect x="26" y="20" width="12" height="55" fill="currentColor" />
            <rect x="42" y="40" width="12" height="35" fill="currentColor" />
            <rect x="58" y="25" width="12" height="50" fill="currentColor" />
            <rect x="74" y="35" width="12" height="40" fill="currentColor" />
            <rect x="90" y="45" width="12" height="30" fill="currentColor" />
          </svg>
        </div>

        {/* More Stock Charts */}
        <div className="financial-element stock-chart-4">
          <svg viewBox="0 0 160 65" xmlns="http://www.w3.org/2000/svg">
            <polyline points="10,55 25,50 40,45 55,40 70,35 85,30 100,25 115,20 130,18 145,15 160,12" 
              fill="none" stroke="currentColor" strokeWidth="2" />
            <circle cx="160" cy="12" r="3" fill="currentColor" />
          </svg>
        </div>
        <div className="financial-element stock-chart-5">
          <svg viewBox="0 0 140 55" xmlns="http://www.w3.org/2000/svg">
            <polyline points="10,40 30,35 50,30 70,25 90,20 110,18 130,15" 
              fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>
        </div>

        {/* More Dollar Signs */}
        <div className="financial-element dollar-3">
          <svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
            <path d="M 25 6 L 25 44 M 20 10 Q 20 6 25 6 Q 30 6 30 10 Q 30 13 27 15 Q 23 17 23 22 Q 23 27 28 27 Q 30 27 30 30 Q 30 33 25 33 Q 20 33 20 28" 
              fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
        </div>
        <div className="financial-element dollar-4">
          <svg viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg">
            <path d="M 22 5 L 22 40 M 18 9 Q 18 5 22 5 Q 26 5 26 9 Q 26 11 24 13 Q 20 15 20 19 Q 20 23 23 23 Q 25 23 25 26 Q 25 29 22 29 Q 18 29 18 24" 
              fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </div>

        {/* Trend Lines */}
        <div className="financial-element trend-line-1">
          <svg viewBox="0 0 180 5" xmlns="http://www.w3.org/2000/svg">
            <polyline points="0,2.5 30,2 60,1.5 90,1 120,1.5 150,2 180,2.5" 
              fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>
        </div>
        <div className="financial-element trend-line-2">
          <svg viewBox="0 0 200 5" xmlns="http://www.w3.org/2000/svg">
            <polyline points="0,1 25,0.5 50,1 75,1.5 100,2 125,1.5 150,1 175,0.5 200,1" 
              fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>
        </div>

        {/* More Additional Elements - Bar Charts */}
        <div className="financial-element bar-chart-5">
          <svg viewBox="0 0 85 80" xmlns="http://www.w3.org/2000/svg">
            <rect x="5" y="25" width="12" height="50" fill="currentColor" />
            <rect x="20" y="15" width="12" height="60" fill="currentColor" />
            <rect x="35" y="30" width="12" height="45" fill="currentColor" />
            <rect x="50" y="20" width="12" height="55" fill="currentColor" />
            <rect x="65" y="35" width="12" height="40" fill="currentColor" />
          </svg>
        </div>
        <div className="financial-element bar-chart-6">
          <svg viewBox="0 0 100 90" xmlns="http://www.w3.org/2000/svg">
            <rect x="8" y="35" width="14" height="50" fill="currentColor" />
            <rect x="26" y="25" width="14" height="60" fill="currentColor" />
            <rect x="44" y="45" width="14" height="40" fill="currentColor" />
            <rect x="62" y="30" width="14" height="55" fill="currentColor" />
            <rect x="80" y="40" width="14" height="45" fill="currentColor" />
          </svg>
        </div>

        {/* More Stock Charts */}
        <div className="financial-element stock-chart-6">
          <svg viewBox="0 0 150 60" xmlns="http://www.w3.org/2000/svg">
            <polyline points="5,50 20,45 35,40 50,35 65,30 80,25 95,20 110,18 125,15 140,12 150,10" 
              fill="none" stroke="currentColor" strokeWidth="2.5" />
            <circle cx="150" cy="10" r="4" fill="currentColor" />
          </svg>
        </div>
        <div className="financial-element stock-chart-7">
          <svg viewBox="0 0 145 58" xmlns="http://www.w3.org/2000/svg">
            <polyline points="5,45 25,40 45,35 65,30 85,25 105,20 125,16 145,12" 
              fill="none" stroke="currentColor" strokeWidth="2.5" />
          </svg>
        </div>

        {/* More Dollar Signs */}
        <div className="financial-element dollar-5">
          <svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
            <path d="M 24 4 L 24 44 M 19 8 Q 19 4 24 4 Q 29 4 29 8 Q 29 11 26 13 Q 22 15 22 20 Q 22 25 26 25 Q 28 25 28 28 Q 28 31 24 31 Q 19 31 19 26" 
              fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
        </div>
        <div className="financial-element dollar-6">
          <svg viewBox="0 0 42 42" xmlns="http://www.w3.org/2000/svg">
            <path d="M 21 4 L 21 38 M 17 8 Q 17 4 21 4 Q 25 4 25 8 Q 25 10 23 12 Q 19 14 19 18 Q 19 22 21 22 Q 23 22 23 25 Q 23 28 21 28 Q 17 28 17 23" 
              fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </div>

        {/* Percentage Symbols */}
        <div className="financial-element percent-1">
          <svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
            <circle cx="10" cy="10" r="4" fill="none" stroke="currentColor" strokeWidth="2.5" />
            <circle cx="30" cy="30" r="4" fill="none" stroke="currentColor" strokeWidth="2.5" />
            <line x1="5" y1="35" x2="35" y2="5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
        </div>
        <div className="financial-element percent-2">
          <svg viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
            <circle cx="9" cy="9" r="3.5" fill="none" stroke="currentColor" strokeWidth="2" />
            <circle cx="27" cy="27" r="3.5" fill="none" stroke="currentColor" strokeWidth="2" />
            <line x1="5" y1="31" x2="31" y2="5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </div>

        {/* Pie Charts */}
        <div className="financial-element pie-chart-1">
          <svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
            <circle cx="30" cy="30" r="25" fill="none" stroke="currentColor" strokeWidth="3" />
            <path d="M 30 5 A 25 25 0 0 1 48 18 L 30 30 Z" fill="currentColor" />
            <path d="M 48 18 A 25 25 0 0 1 30 55 L 30 30 Z" fill="currentColor" opacity="0.6" />
          </svg>
        </div>
        <div className="financial-element pie-chart-2">
          <svg viewBox="0 0 55 55" xmlns="http://www.w3.org/2000/svg">
            <circle cx="27.5" cy="27.5" r="23" fill="none" stroke="currentColor" strokeWidth="2.5" />
            <path d="M 27.5 4.5 A 23 23 0 0 1 44 20 L 27.5 27.5 Z" fill="currentColor" />
            <path d="M 44 20 A 23 23 0 0 1 27.5 51.5 L 27.5 27.5 Z" fill="currentColor" opacity="0.7" />
            <path d="M 27.5 51.5 A 23 23 0 0 1 11 20 L 27.5 27.5 Z" fill="currentColor" opacity="0.5" />
          </svg>
        </div>

        {/* More Graph Lines */}
        <div className="financial-element graph-line-3">
          <svg viewBox="0 0 170 4" xmlns="http://www.w3.org/2000/svg">
            <polyline points="0,1.5 28,1 56,0.5 84,1 112,1.5 140,2 170,1.5" 
              fill="none" stroke="currentColor" strokeWidth="2.5" />
          </svg>
        </div>
        <div className="financial-element graph-line-4">
          <svg viewBox="0 0 190 4" xmlns="http://www.w3.org/2000/svg">
            <polyline points="0,2 30,1.5 60,1 90,0.5 120,1 150,1.5 180,2 190,1.8" 
              fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>
        </div>

        {/* Trend Arrows */}
        <div className="financial-element trend-arrow-1">
          <svg viewBox="0 0 35 35" xmlns="http://www.w3.org/2000/svg">
            <path d="M 5 30 L 30 5 M 25 5 L 30 5 L 30 10" 
              fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="financial-element trend-arrow-2">
          <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
            <path d="M 4 28 L 28 4 M 23 4 L 28 4 L 28 9" 
              fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      <div className="login-wrapper">
        {/* Regular User Login */}
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">
            <img src="/logo.png" alt="OpenAudit Logo" onError={(e) => { e.target.style.display = 'none'; }} />
          </div>
          <h1>Welcome to OpenAudit</h1>
          <p>Sign in to analyze your spending</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label>
              <Mail size={20} />
              Username or Email
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username or email"
              required
            />
          </div>

          <div className="form-group">
            <label>
              <Lock size={20} />
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>

          {error && (
            <div className="error">
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
          )}

          <button type="submit" className="btn btn-primary" disabled={loading}>
            <LogIn size={20} />
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="login-footer">
          <p>
            Don't have an account?{' '}
            <a href="#" onClick={(e) => { e.preventDefault(); onLogin(null); }}>
              Create one
            </a>
          </p>
          </div>
        </div>

        {/* Admin Login */}
        <div className="admin-login-card">
          <div className="admin-login-header">
            <div className="admin-icon-wrapper">
              <Shield size={48} className="admin-icon" />
              <Sparkles size={24} className="sparkle sparkle-1" />
              <Sparkles size={20} className="sparkle sparkle-2" />
              <Sparkles size={16} className="sparkle sparkle-3" />
            </div>
            <h2>Admin Login</h2>
            <p>Manage users and data</p>
          </div>

          <form onSubmit={handleAdminSubmit} className="admin-login-form">
            <div className="form-group">
              <label>
                <Shield size={18} />
                Admin Username
              </label>
              <input
                type="text"
                value={adminUsername}
                onChange={(e) => setAdminUsername(e.target.value)}
                placeholder="Enter admin username"
                required
              />
            </div>

            <div className="form-group">
              <label>
                <Lock size={18} />
                Admin Password
              </label>
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Enter admin password"
                required
              />
            </div>

            {adminError && (
              <div className="error">
                <AlertCircle size={20} />
                <span>{adminError}</span>
              </div>
            )}

            <button type="submit" className="btn btn-admin" disabled={adminLoading}>
              <Shield size={20} />
              {adminLoading ? 'Authenticating...' : 'Admin Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default Login

