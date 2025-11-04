import React, { useState } from 'react'
import axios from 'axios'
import { UserPlus, Mail, Lock, User, Phone, Building2, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react'
import './Signup.css'

function Signup({ onBackToLogin, onVerifyOTP }) {
  const [step, setStep] = useState(1) // 1: Registration, 2: OTP Verification
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    account_type: 'personal',
    full_name: '',
    contact_number: ''
  })
  const [otp, setOtp] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [registeredEmail, setRegisteredEmail] = useState('')

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setError(null)
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long')
      return
    }

    setLoading(true)

    try {
      const response = await axios.post('/api/auth/register', {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        account_type: formData.account_type,
        full_name: formData.full_name,
        contact_number: formData.contact_number
      })

      if (response.data.status === 'success') {
        setRegisteredEmail(formData.email)
        setStep(2)
        // In production, OTP would be sent via SMS/Email
        // For now, we show it (remove in production)
        if (response.data.otp) {
          alert(`OTP: ${response.data.otp} (This is only for development)`)
        }
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOTP = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const response = await axios.post('/api/auth/verify-otp', {
        email: registeredEmail,
        otp: otp
      })

      if (response.data.status === 'success') {
        onVerifyOTP(true)
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid OTP')
    } finally {
      setLoading(false)
    }
  }

  const handleResendOTP = async () => {
    setError(null)
    try {
      const response = await axios.post('/api/auth/resend-otp', {
        email: registeredEmail
      })
      if (response.data.status === 'success' && response.data.otp) {
        alert(`New OTP: ${response.data.otp} (This is only for development)`)
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to resend OTP')
    }
  }

  if (step === 2) {
    return (
      <div className="signup-container">
      <div className="signup-card">
        <button className="back-to-login-btn" onClick={() => setStep(1)}>
          <ArrowLeft size={20} />
          Back
        </button>
        
        <div className="signup-header">
          <div className="signup-logo">
            <img src="/logo.png" alt="OpenAudit Logo" onError={(e) => { e.target.style.display = 'none'; }} />
          </div>
          <h1>Verify Your Account</h1>
          <p>Enter the OTP sent to your contact number</p>
        </div>

          <form onSubmit={handleVerifyOTP} className="signup-form">
            <div className="form-group">
              <label>Enter OTP</label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="Enter 6-digit OTP"
                maxLength="6"
                required
                style={{ textAlign: 'center', fontSize: '24px', letterSpacing: '8px' }}
              />
            </div>

            {error && (
              <div className="error">
                <AlertCircle size={20} />
                <span>{error}</span>
              </div>
            )}

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>

            <button
              type="button"
              onClick={handleResendOTP}
              className="btn btn-secondary"
              style={{ marginTop: '12px' }}
            >
              Resend OTP
            </button>
          </form>

          <div className="signup-footer">
            <button 
              type="button"
              onClick={() => setStep(1)}
              className="btn btn-secondary"
              style={{ marginTop: '16px' }}
            >
              <ArrowLeft size={18} />
              Back to Registration
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="signup-container">
      <div className="signup-card">
        <button className="back-to-login-btn" onClick={onBackToLogin}>
          <ArrowLeft size={20} />
          Back to Login
        </button>
        
        <div className="signup-header">
          <div className="signup-logo">
            <img src="/logo.png" alt="OpenAudit Logo" onError={(e) => { e.target.style.display = 'none'; }} />
          </div>
          <h1>Create Account</h1>
          <p>Join OpenAudit to start analyzing your spending</p>
        </div>

        <form onSubmit={handleRegister} className="signup-form">
          <div className="form-group">
            <label>
              <Building2 size={20} />
              Account Type
            </label>
            <select
              name="account_type"
              value={formData.account_type}
              onChange={handleInputChange}
              required
            >
              <option value="personal">Personal</option>
              <option value="company">Company</option>
            </select>
          </div>

          <div className="form-group">
            <label>
              <User size={20} />
              Full Name
            </label>
            <input
              type="text"
              name="full_name"
              value={formData.full_name}
              onChange={handleInputChange}
              placeholder="Enter your full name"
              required
            />
          </div>

          <div className="form-group">
            <label>
              <User size={20} />
              Username
            </label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              placeholder="Choose a username"
              required
            />
          </div>

          <div className="form-group">
            <label>
              <Mail size={20} />
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="Enter your email"
              required
            />
          </div>

          <div className="form-group">
            <label>
              <Phone size={20} />
              Contact Number
            </label>
            <input
              type="tel"
              name="contact_number"
              value={formData.contact_number}
              onChange={handleInputChange}
              placeholder="Enter your contact number"
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
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="Create a password (min. 6 characters)"
              required
            />
          </div>

          <div className="form-group">
            <label>
              <Lock size={20} />
              Confirm Password
            </label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              placeholder="Confirm your password"
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
            <UserPlus size={20} />
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <div className="signup-footer">
          <p>
            Already have an account?{' '}
            <a href="#" onClick={(e) => { e.preventDefault(); onBackToLogin(); }}>
              Sign in
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Signup

