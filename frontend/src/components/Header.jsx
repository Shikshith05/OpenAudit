import React from 'react'
import { BarChart3, LogOut, User } from 'lucide-react'
import './Header.css'

function Header({ user, onLogout }) {
  return (
    <header className="header">
      <div className="container">
        <div className="header-content">
          <div className="logo">
            <img 
              src="/logo.png" 
              alt="OpenAudit Logo" 
              className="logo-image" 
              onError={(e) => { 
                e.target.style.display = 'none'; 
                const fallback = e.target.nextElementSibling;
                if (fallback) fallback.style.display = 'flex'; 
              }} 
            />
            <BarChart3 size={32} color="#6366f1" className="logo-fallback" style={{ display: 'none' }} />
            <div>
              <h1>OpenAudit</h1>
              <p className="tagline">Analyze Your Spending • Smart Money Insights</p>
            </div>
          </div>
          <div className="header-right">
            {user && (
              <div className="user-info">
                <User size={20} />
                <span>{user.full_name || user.username}</span>
                {user.is_admin && <span className="admin-badge">Admin</span>}
                {user.account_type && (
                  <span className="type-badge">{user.account_type}</span>
                )}
              </div>
            )}
            {user && (
              <button className="logout-btn" onClick={onLogout}>
                <LogOut size={20} />
                Logout
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header
