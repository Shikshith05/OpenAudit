import React, { useState, useEffect } from 'react'
import { FileText, BarChart3, History, Lightbulb, Upload, Download, DollarSign, TrendingUp, Activity, Target, ShoppingCart, PieChart as PieChartIcon, FileSignature, Send } from 'lucide-react'
import AuditTab from './AuditTab'
import Chatbot from './Chatbot'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, AreaChart, Area } from 'recharts'
import './CompanyPortal.css'

const COLORS = [
  '#059669', '#10b981', '#2563eb', '#1e40af', 
  '#fbbf24', '#dc2626', '#8b5cf6', '#14b8a6',
  '#64748b', '#84cc16'
]

function CompanyPortal({ user }) {
  const [activeTab, setActiveTab] = useState('audit')
  const [analysisData, setAnalysisData] = useState(null)

  // Listen for tab switch events from history
  React.useEffect(() => {
    const handleTabSwitch = (event) => {
      setActiveTab(event.detail)
    }
    window.addEventListener('switchTab', handleTabSwitch)
    return () => window.removeEventListener('switchTab', handleTabSwitch)
  }, [])

  return (
    <div className="company-portal">
      <div className="neon-block-1"></div>
      <div className="neon-block-2"></div>
      <div className="neon-block-3"></div>
      <div className="company-header">
        <h1 className="company-title">
          <FileText size={40} />
          Company Financial Portal
        </h1>
        <p className="company-subtitle">Comprehensive financial analysis and insights for {user?.full_name || user?.username}</p>
      </div>

      <div className="portal-tabs">
        <button 
          className={`portal-tab ${activeTab === 'audit' ? 'active' : ''}`}
          onClick={() => setActiveTab('audit')}
        >
          <Upload size={20} />
          Audit
        </button>
        <button 
          className={`portal-tab ${activeTab === 'visualise' ? 'active' : ''}`}
          onClick={() => setActiveTab('visualise')}
        >
          <BarChart3 size={20} />
          Visualise
        </button>
        <button 
          className={`portal-tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <History size={20} />
          History
        </button>
        <button 
          className={`portal-tab ${activeTab === 'suggestions' ? 'active' : ''}`}
          onClick={() => setActiveTab('suggestions')}
        >
          <Lightbulb size={20} />
          Suggestions
        </button>
        <button 
          className={`portal-tab ${activeTab === 'contract' ? 'active' : ''}`}
          onClick={() => setActiveTab('contract')}
        >
          <FileSignature size={20} />
          Contract
        </button>
      </div>

      <div className="portal-content">
        {activeTab === 'audit' && (
          <AuditTab user={user} onAnalysisComplete={setAnalysisData} />
        )}
        {activeTab === 'visualise' && (
          <VisualiseTab analysisData={analysisData} />
        )}
        {activeTab === 'history' && (
          <HistoryTab user={user} onLoadAnalysis={setAnalysisData} />
        )}
        {activeTab === 'suggestions' && (
          <SuggestionsTab analysisData={analysisData} />
        )}
        {activeTab === 'contract' && (
          <ContractTab user={user} />
        )}
      </div>
      <Chatbot user={user} accountType="company" />
    </div>
  )
}

function ContractTab({ user }) {
  const [contract, setContract] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  useEffect(() => {
    fetchContract()
  }, [user])

  const fetchContract = async () => {
    if (!user?.id) return
    
    setLoading(true)
    try {
      const response = await fetch(`/api/company/contract/${user.id}`)
      const data = await response.json()
      if (data.status === 'success') {
        setContract(data.contract)
      }
    } catch (err) {
      console.error('Failed to fetch contract:', err)
    } finally {
      setLoading(false)
    }
  }

  const requestContract = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/company/contract/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: user?.id,
          company_name: user?.full_name || user?.username || 'Company'
        })
      })
      const data = await response.json()
      if (data.status === 'success') {
        setContract(data.contract)
        setSuccess('Contract request sent successfully!')
        setTimeout(() => setSuccess(null), 3000)
      } else {
        setError(data.error || 'Failed to request contract')
      }
    } catch (err) {
      setError('Failed to request contract')
    } finally {
      setLoading(false)
    }
  }

  const downloadContract = async (contractId, type = 'template') => {
    try {
      const response = await fetch(`/api/contract/${contractId}/download?type=${type}`)
      if (!response.ok) throw new Error('Failed to download')
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Contract_${contractId}_${type}.pdf`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      alert('Failed to download contract')
    }
  }

  const signContract = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/company/contract/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: user?.id,
          signature: `${user?.full_name || user?.username || 'Company Representative'} - ${new Date().toLocaleString()}`
        })
      })
      const data = await response.json()
      if (data.status === 'success') {
        setContract(data.contract)
        setSuccess('Contract signed successfully!')
        setTimeout(() => setSuccess(null), 3000)
      } else {
        setError(data.error || 'Failed to sign contract')
      }
    } catch (err) {
      setError('Failed to sign contract')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status) => {
    const badges = {
      pending: { text: 'Pending Admin Signature', color: '#f59e0b' },
      signed_admin: { text: 'Admin Signed - Awaiting Your Signature', color: '#2563eb' },
      active: { text: 'Active Contract', color: '#10b981' }
    }
    return badges[status] || { text: status, color: '#64748b' }
  }

  return (
    <div className="contract-tab">
      <h2 className="tab-title">Contract Management</h2>
      <p className="tab-description">Manage your data confidentiality agreement with OpenAudit</p>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: '20px', padding: '12px', background: '#fee2e2', color: '#dc2626', borderRadius: '8px' }}>
          {error}
        </div>
      )}

      {success && (
        <div className="alert alert-success" style={{ marginBottom: '20px', padding: '12px', background: '#d1fae5', color: '#059669', borderRadius: '8px' }}>
          {success}
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div className="loading-spinner">Loading...</div>
        </div>
      )}

      {!contract && !loading && (
        <div className="contract-empty-state" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <FileSignature size={64} color="#64748b" style={{ marginBottom: '20px' }} />
          <h3 style={{ marginBottom: '10px', color: '#1e293b' }}>No Contract Found</h3>
          <p style={{ marginBottom: '30px', color: '#64748b' }}>
            Request a data confidentiality agreement to get started with OpenAudit services.
          </p>
          <button
            onClick={requestContract}
            disabled={loading}
            className="btn-primary"
            style={{
              padding: '12px 24px',
              background: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '16px',
              fontWeight: 'bold'
            }}
          >
            <Send size={20} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
            Request Contract
          </button>
        </div>
      )}

      {contract && !loading && (
        <div className="contract-details" style={{ background: '#f8fafc', padding: '30px', borderRadius: '12px', marginTop: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h3 style={{ margin: '0 0 5px 0', color: '#1e293b' }}>Contract Details</h3>
              <p style={{ margin: '0', color: '#64748b', fontSize: '14px' }}>ID: {contract.id}</p>
            </div>
            <span
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                background: getStatusBadge(contract.status).color + '20',
                color: getStatusBadge(contract.status).color,
                fontWeight: 'bold',
                fontSize: '12px'
              }}
            >
              {getStatusBadge(contract.status).text}
            </span>
          </div>

          <div style={{ marginBottom: '20px', padding: '15px', background: 'white', borderRadius: '8px' }}>
            <p style={{ margin: '5px 0', color: '#475569' }}>
              <strong>Company:</strong> {contract.company_name}
            </p>
            <p style={{ margin: '5px 0', color: '#475569' }}>
              <strong>Requested:</strong> {new Date(contract.requested_at).toLocaleString()}
            </p>
            {contract.signed_admin_at && (
              <p style={{ margin: '5px 0', color: '#475569' }}>
                <strong>Admin Signed:</strong> {new Date(contract.signed_admin_at).toLocaleString()}
              </p>
            )}
            {contract.signed_company_at && (
              <p style={{ margin: '5px 0', color: '#475569' }}>
                <strong>Company Signed:</strong> {new Date(contract.signed_company_at).toLocaleString()}
              </p>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={() => downloadContract(contract.id, 'template')}
              className="btn-secondary"
              style={{
                padding: '10px 20px',
                background: '#64748b',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              <Download size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
              Download Template
            </button>

            {contract.status === 'signed_admin' && (
              <button
                onClick={signContract}
                disabled={loading}
                className="btn-primary"
                style={{
                  padding: '10px 20px',
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}
              >
                <FileSignature size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                Sign Contract
              </button>
            )}

            {contract.signed_contract_pdf_path && contract.status !== 'pending' && (
              <button
                onClick={() => downloadContract(contract.id, 'signed')}
                className="btn-primary"
                style={{
                  padding: '10px 20px',
                  background: '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}
              >
                <Download size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                Download Signed Contract
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// AuditTab is now in a separate file - AuditTab.jsx

function VisualiseTab({ analysisData }) {
  const pieData = analysisData?.visualizations?.pie_chart || []
  const barData = analysisData?.visualizations?.bar_chart || []
  const insights = analysisData?.insights || {}
  const smartScore = analysisData?.smart_score || {}

  if (!analysisData) {
    return (
      <div className="visualise-tab">
        <h2 className="tab-title">Financial Dashboard</h2>
        <p className="tab-description">Visual overview of your financial data through graphs and charts</p>
        <div className="coming-soon">
          <BarChart3 size={64} />
          <p>Please analyze files in the Audit tab first to see visualizations</p>
        </div>
      </div>
    )
  }

  // Prepare line chart data (monthly spending trend)
  const lineData = []
  if (analysisData.transactions) {
    const monthlySpending = {}
    analysisData.transactions.forEach(txn => {
      if (txn.date) {
        const date = new Date(txn.date)
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        monthlySpending[monthKey] = (monthlySpending[monthKey] || 0) + Math.abs(txn.amount || 0)
      }
    })
    lineData.push(...Object.entries(monthlySpending).map(([month, amount]) => ({
      month,
      amount: Math.round(amount)
    })).sort((a, b) => a.month.localeCompare(b.month)))
  }

  // Calculate additional metrics
  const avgTransaction = insights.total_spent && insights.transaction_count 
    ? (insights.total_spent / insights.transaction_count).toFixed(2)
    : 0
  const categoriesCount = Object.keys(insights?.category_breakdown || {}).length

  return (
    <div className="visualise-tab">
      <div className="dashboard-header-section">
        <h2 className="tab-title">Financial Dashboard</h2>
        <p className="tab-description">Comprehensive overview of your company's financial health</p>
      </div>

      {/* Key Metrics Cards */}
      <div className="dashboard-metrics-grid">
        <div className="dashboard-metric-card">
          <div className="metric-icon-wrapper" style={{ background: 'rgba(16, 185, 129, 0.15)' }}>
            <DollarSign size={28} color="#10b981" />
          </div>
          <div className="metric-details">
            <h3 className="metric-main-value">₹{insights.total_spent?.toLocaleString('en-IN') || 0}</h3>
            <p className="metric-label">Total Revenue</p>
            <div className="metric-trend-badge">
              <TrendingUp size={14} />
              <span>All Time</span>
            </div>
          </div>
        </div>

        <div className="dashboard-metric-card">
          <div className="metric-icon-wrapper" style={{ background: 'rgba(59, 130, 246, 0.15)' }}>
            <FileText size={28} color="#3b82f6" />
          </div>
          <div className="metric-details">
            <h3 className="metric-main-value">{insights.transaction_count || 0}</h3>
            <p className="metric-label">Number of Transactions</p>
            <div className="metric-trend-badge">
              <Activity size={14} />
              <span>Recorded</span>
            </div>
          </div>
        </div>

        <div className="dashboard-metric-card">
          <div className="metric-icon-wrapper" style={{ background: 'rgba(139, 92, 246, 0.15)' }}>
            <ShoppingCart size={28} color="#8b5cf6" />
          </div>
          <div className="metric-details">
            <h3 className="metric-main-value">{categoriesCount}</h3>
            <p className="metric-label">Active Categories</p>
            <div className="metric-trend-badge">
              <PieChartIcon size={14} />
              <span>Active</span>
            </div>
          </div>
        </div>

        <div className="dashboard-metric-card">
          <div className="metric-icon-wrapper" style={{ background: 'rgba(245, 158, 11, 0.15)' }}>
            <Target size={28} color="#f59e0b" />
          </div>
          <div className="metric-details">
            <h3 className="metric-main-value">{smartScore.score?.toFixed(1) || '0.0'}</h3>
            <p className="metric-label">Financial Health Score</p>
            <div className="metric-trend-badge">
              <TrendingUp size={14} />
              <span>{smartScore.spender_rating || 'Moderate'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="dashboard-charts-grid">
        {/* Donut/Pie Chart - Spending Distribution */}
        {pieData.length > 0 && (
          <div className="dashboard-chart-card">
            <div className="chart-header-row">
              <div>
                <h3 className="chart-main-title">Spending Distribution</h3>
                <p className="chart-subtitle">{pieData.reduce((sum, item) => sum + item.value, 0).toLocaleString('en-IN')} Weekly Visits</p>
              </div>
              <PieChartIcon size={24} color="var(--primary)" />
            </div>
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={110}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `₹${Number(value).toLocaleString('en-IN')}`} />
              </PieChart>
            </ResponsiveContainer>
            <div className="chart-category-list">
              {pieData.slice(0, 4).map((entry, index) => (
                <div key={index} className="category-item-row">
                  <div className="category-dot" style={{ background: COLORS[index % COLORS.length] }}></div>
                  <span className="category-name">{entry.name}</span>
                  <span className="category-amount">₹{entry.value?.toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Number of Sales Card */}
        <div className="dashboard-info-card">
          <div className="info-card-icon" style={{ background: 'rgba(16, 185, 129, 0.15)' }}>
            <DollarSign size={32} color="#10b981" />
          </div>
          <div className="info-card-content">
            <h3 className="info-card-title">Number of Sales</h3>
            <p className="info-card-value">₹{insights.total_spent?.toLocaleString('en-IN') || 0}</p>
          </div>
        </div>

        {/* Additional Stats Cards */}
        <div className="dashboard-info-card">
          <div className="info-card-icon" style={{ background: 'rgba(59, 130, 246, 0.15)' }}>
            <ShoppingCart size={32} color="#3b82f6" />
          </div>
          <div className="info-card-content">
            <h3 className="info-card-title">Number of Transactions</h3>
            <p className="info-card-value">{insights.transaction_count || 0}</p>
          </div>
        </div>

        <div className="dashboard-info-card">
          <div className="info-card-icon" style={{ background: 'rgba(245, 158, 11, 0.15)' }}>
            <BarChart3 size={32} color="#f59e0b" />
          </div>
          <div className="info-card-content">
            <h3 className="info-card-title">Total Profit</h3>
            <p className="info-card-value">₹{avgTransaction ? (avgTransaction * insights.transaction_count).toLocaleString('en-IN') : 0}</p>
            <p className="info-card-subtitle">Average per Transaction</p>
          </div>
        </div>

        {/* Line Chart - Total Profit Trend */}
        {lineData.length > 0 && (
          <div className="dashboard-chart-card full-width-chart">
            <div className="chart-header-row">
              <div>
                <h3 className="chart-main-title">Total Profit</h3>
                <p className="chart-subtitle">₹{insights.total_spent?.toLocaleString('en-IN') || 0}</p>
              </div>
              <TrendingUp size={24} color="var(--primary)" />
            </div>
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={lineData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <defs>
                  <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fill: 'var(--text-light)', fontSize: 12 }}
                  stroke="var(--border)"
                />
                <YAxis 
                  tick={{ fill: 'var(--text-light)', fontSize: 12 }}
                  stroke="var(--border)"
                />
                <Tooltip 
                  formatter={(value) => `₹${Number(value).toLocaleString('en-IN')}`}
                  contentStyle={{ 
                    background: 'var(--surface-glass)', 
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    color: 'var(--text)'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="amount" 
                  stroke="#10b981" 
                  fillOpacity={1} 
                  fill="url(#profitGradient)"
                  strokeWidth={3}
                  dot={{ fill: '#10b981', r: 4 }}
                  activeDot={{ r: 7 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Bar Chart - Category Comparison */}
        {barData.length > 0 && (
          <div className="dashboard-chart-card">
            <div className="chart-header-row">
              <div>
                <h3 className="chart-main-title">Category Comparison</h3>
                <p className="chart-subtitle">Spending by category</p>
              </div>
              <BarChart3 size={24} color="var(--secondary)" />
            </div>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={barData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis 
                  dataKey="name" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  tick={{ fill: 'var(--text-light)', fontSize: 11 }}
                  stroke="var(--border)"
                  interval={0}
                />
                <YAxis 
                  tick={{ fill: 'var(--text-light)', fontSize: 12 }}
                  stroke="var(--border)"
                />
                <Tooltip 
                  formatter={(value) => `₹${Number(value).toLocaleString('en-IN')}`}
                  contentStyle={{ 
                    background: 'var(--surface-glass)', 
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    color: 'var(--text)'
                  }}
                />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {barData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="chart-category-list">
              {barData.slice(0, 5).map((entry, index) => (
                <div key={index} className="category-item-row">
                  <div className="category-dot" style={{ background: COLORS[index % COLORS.length] }}></div>
                  <span className="category-name">{entry.name || entry.category}</span>
                  <span className="category-amount">₹{(entry.value || entry.amount)?.toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function HistoryTab({ user, onLoadAnalysis }) {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)

  React.useEffect(() => {
    // Fetch analysis history
    const fetchHistory = async () => {
      setLoading(true)
      try {
        const response = await fetch(`/api/company/history/${user?.id}`)
        if (response.ok) {
          const data = await response.json()
          setHistory(data.history || [])
        }
      } catch (err) {
        console.error('Failed to fetch history:', err)
      } finally {
        setLoading(false)
      }
    }

    if (user?.id) {
      fetchHistory()
    }
  }, [user])

  const handleViewAnalysis = async (analysisId) => {
    try {
      const response = await fetch(`/api/company/analysis/${analysisId}?user_id=${user?.id}`)
      if (response.ok) {
        const data = await response.json()
        if (data.status === 'success' && data.data) {
          // Prepare data for visualise tab
          const visualiseData = {
            ...data.data,
            insights: data.data.insights || {},
            visualizations: data.data.visualizations || {},
            smart_score: data.data.smart_score || {},
            transactions: data.data.transactions || []
          }
          if (onLoadAnalysis) {
            onLoadAnalysis(visualiseData)
            // Switch to visualise tab
            window.dispatchEvent(new CustomEvent('switchTab', { detail: 'visualise' }))
          }
        }
      }
    } catch (err) {
      console.error('Failed to load analysis:', err)
      alert('Failed to load analysis data')
    }
  }

  const handleDownloadReport = async (analysisId) => {
    try {
      const response = await fetch(`/api/company/report/${analysisId}`)
      if (!response.ok) throw new Error('Failed to download')
      
      // Get content type to determine file type
      const contentType = response.headers.get('content-type') || ''
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      
      // Use appropriate file extension based on content type
      if (contentType.includes('pdf')) {
        a.download = `Report_${analysisId}.pdf`
      } else if (contentType.includes('json')) {
        a.download = `Report_${analysisId}.json`
      } else {
        a.download = `Report_${analysisId}.txt`
      }
      
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      alert('Failed to download report: ' + err.message)
    }
  }

  return (
    <div className="history-tab">
      <h2 className="tab-title">Analysis History</h2>
      <p className="tab-description">View and download your previous financial analyses</p>

      {loading ? (
        <div className="loading">Loading history...</div>
      ) : history.length === 0 ? (
        <div className="no-history">
          <History size={64} />
          <p>No previous analyses found</p>
          <p className="hint">Start by uploading files in the Audit tab</p>
        </div>
      ) : (
        <div className="history-list">
          {history.map((item) => (
            <div key={item.id} className="history-item">
              <div className="history-info">
                <h3>{item.company_name || 'Company Analysis'} - {new Date(item.created_at).toLocaleDateString()}</h3>
                <p>Total: ₹{item.total_amount?.toLocaleString('en-IN') || 0} • Transactions: {item.total_transactions || 0}</p>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  className="btn btn-primary"
                  onClick={() => handleViewAnalysis(item.id)}
                >
                  <BarChart3 size={16} />
                  View Analysis
                </button>
                <button 
                  className="btn btn-secondary"
                  onClick={() => handleDownloadReport(item.id)}
                >
                  <Download size={16} />
                  Download Report
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SuggestionsTab({ analysisData }) {
  const [suggestions, setSuggestions] = useState(null)
  const [loading, setLoading] = useState(false)

  React.useEffect(() => {
    if (analysisData) {
      fetchSuggestions()
    }
  }, [analysisData])

  const fetchSuggestions = async () => {
    if (!analysisData) return

    setLoading(true)
    try {
      const response = await fetch('/api/company/suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          insights: analysisData.insights,
          smart_score: analysisData.smart_score,
          visualizations: analysisData.visualizations
        })
      })

      if (response.ok) {
        const data = await response.json()
        setSuggestions(data.suggestions || [])
      }
    } catch (err) {
      console.error('Failed to fetch suggestions:', err)
      // Generate default suggestions if API fails
      generateDefaultSuggestions()
    } finally {
      setLoading(false)
    }
  }

  const generateDefaultSuggestions = () => {
    if (!analysisData?.insights) return

    const suggestions = []
    const topCategory = analysisData.insights.top_category

    if (topCategory && topCategory.percentage > 30) {
      suggestions.push({
        type: 'warning',
        title: 'High Spending in ' + topCategory.name,
        message: `You're spending ${topCategory.percentage.toFixed(1)}% of your budget on ${topCategory.name}. Consider reviewing expenses in this category.`,
        priority: 'high'
      })
    }

    const categoryBreakdown = analysisData.insights.category_breakdown || {}
    const categories = Object.entries(categoryBreakdown).sort((a, b) => b[1].percentage - a[1].percentage)

    categories.slice(0, 3).forEach(([category, data]) => {
      if (data.percentage > 20) {
        suggestions.push({
          type: 'info',
          title: `Optimize ${category} Spending`,
          message: `Your ${category} expenses account for ${data.percentage.toFixed(1)}% of total spending (₹${data.amount.toLocaleString('en-IN')}). Look for opportunities to reduce costs here.`,
          priority: 'medium'
        })
      }
    })

    if (analysisData.smart_score?.score < 5) {
      suggestions.push({
        type: 'critical',
        title: 'Improve Spending Patterns',
        message: `Your Smart Spending Score is ${analysisData.smart_score.score.toFixed(1)}/10. Consider reviewing your spending habits and creating a budget.`,
        priority: 'high'
      })
    }

    setSuggestions(suggestions)
  }

  if (!analysisData) {
    return (
      <div className="suggestions-tab">
        <h2 className="tab-title">AI Suggestions</h2>
        <p className="tab-description">Get intelligent spending recommendations based on your financial patterns</p>
        <div className="coming-soon">
          <Lightbulb size={64} />
          <p>Please analyze files in the Audit tab first to get personalized suggestions</p>
        </div>
      </div>
    )
  }

  return (
    <div className="suggestions-tab">
      <h2 className="tab-title">AI Suggestions</h2>
      <p className="tab-description">Get intelligent spending recommendations based on your financial patterns</p>

      {loading ? (
        <div className="loading">Generating AI suggestions...</div>
      ) : suggestions && suggestions.length > 0 ? (
        <div className="suggestions-list">
          {suggestions.map((suggestion, index) => (
            <div key={index} className={`suggestion-card ${suggestion.type} ${suggestion.priority}`}>
              <div className="suggestion-icon">
                <Lightbulb size={24} />
              </div>
              <div className="suggestion-content">
                <h3>{suggestion.title}</h3>
                <p>{suggestion.message}</p>
                {suggestion.recommendations && (
                  <ul className="recommendations-list">
                    {suggestion.recommendations.map((rec, i) => (
                      <li key={i}>{rec}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="no-suggestions">
          <Lightbulb size={64} />
          <p>No suggestions available at the moment</p>
        </div>
      )}
    </div>
  )
}

export default CompanyPortal

