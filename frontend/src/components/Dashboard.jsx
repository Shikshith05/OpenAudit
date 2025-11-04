import React, { useState, useEffect } from 'react'
import { PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { TrendingUp, DollarSign, FileText, Download, ArrowLeft, History, PieChart as PieChartIcon, Activity, Target, ShoppingCart, BarChart3 } from 'lucide-react'
import ScoreDisplay from './ScoreDisplay'
import ReportDisplay from './ReportDisplay'
import Chatbot from './Chatbot'
import './Dashboard.css'

const COLORS = [
  '#6366f1', '#8b5cf6', '#06b6d4', '#10b981', 
  '#f59e0b', '#ef4444', '#ec4899', '#14b8a6',
  '#64748b', '#84cc16'
]

function Dashboard({ data, user, onBack, initialTab = 'dashboard' }) {
  // Check if we should show history tab from sessionStorage
  const shouldShowHistory = sessionStorage.getItem('fromReports') === 'true'
  const [activeTab, setActiveTab] = useState(shouldShowHistory ? 'history' : initialTab)
  const [isDownloading, setIsDownloading] = React.useState(false)
  const [backendCharts, setBackendCharts] = React.useState({ pie_chart: null, bar_chart: null })
  const [loadingCharts, setLoadingCharts] = React.useState(false)
  
  // Handle case where data might be null or undefined
  const insights = data?.insights || {}
  const smart_score = data?.smart_score || {}
  const report = data?.report || {}
  const visualizations = data?.visualizations || {}
  
  // Check if data came from history (for View Reports - show history tab)
  React.useEffect(() => {
    // If navigated from View Reports, default to history tab
    const fromReports = sessionStorage.getItem('fromReports')
    if (fromReports === 'true') {
      setActiveTab('history')
      sessionStorage.removeItem('fromReports')
    }
  }, [])
  
  // If activeTab is history, always show HistoryTab regardless of data
  if (activeTab === 'history') {
    return (
      <div className="dashboard">
        {onBack && (
          <button className="back-btn" onClick={onBack}>
            <ArrowLeft size={20} />
            Back to Home
          </button>
        )}
        
        <div className="dashboard-header">
          <div>
            <h1 className="dashboard-title">Financial Analysis Dashboard</h1>
            <p className="dashboard-subtitle">View your analysis history and download reports</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="dashboard-tabs" style={{ display: 'flex', gap: '12px', marginBottom: '32px', position: 'relative', zIndex: 10 }}>
          <button
            className={`dashboard-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
            style={{
              padding: '12px 24px',
              background: activeTab === 'dashboard' 
                ? 'linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)' 
                : 'linear-gradient(135deg, rgba(51, 65, 85, 0.95) 0%, rgba(30, 41, 59, 0.98) 100%)',
              border: `2px solid ${activeTab === 'dashboard' ? 'rgba(16, 185, 129, 1)' : 'rgba(16, 185, 129, 0.4)'}`,
              borderRadius: '12px',
              color: activeTab === 'dashboard' ? 'white' : 'var(--text)',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.3s ease',
              boxShadow: activeTab === 'dashboard' 
                ? '0 4px 16px rgba(16, 185, 129, 0.5), 0 0 40px rgba(16, 185, 129, 0.3)' 
                : '0 2px 8px rgba(0, 0, 0, 0.2)'
            }}
          >
            <BarChart3 size={20} />
            Dashboard
          </button>
          <button
            className={`dashboard-tab ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
            style={{
              padding: '12px 24px',
              background: activeTab === 'history' 
                ? 'linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)' 
                : 'linear-gradient(135deg, rgba(51, 65, 85, 0.95) 0%, rgba(30, 41, 59, 0.98) 100%)',
              border: `2px solid ${activeTab === 'history' ? 'rgba(16, 185, 129, 1)' : 'rgba(16, 185, 129, 0.4)'}`,
              borderRadius: '12px',
              color: activeTab === 'history' ? 'white' : 'var(--text)',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.3s ease',
              boxShadow: activeTab === 'history' 
                ? '0 4px 16px rgba(16, 185, 129, 0.5), 0 0 40px rgba(16, 185, 129, 0.3)' 
                : '0 2px 8px rgba(0, 0, 0, 0.2)'
            }}
          >
            <History size={20} />
            History
          </button>
        </div>

        {/* History Tab Content */}
        <HistoryTab user={user} />
        <Chatbot user={user} accountType="personal" />
      </div>
    )
  }
  
  const pieData = visualizations?.pie_chart || []
  const barData = visualizations?.bar_chart || []
  
  // Load backend-generated charts when viewing previous analysis from history
  React.useEffect(() => {
    const loadBackendCharts = async () => {
      // Try to get analysis ID from data
      if (!data || loadingCharts) return
      
      // If data has id and we have visualization data, try to generate charts
      const analysisId = data.id
      if (analysisId && (pieData.length > 0 || barData.length > 0 || Object.keys(insights).length > 0)) {
        setLoadingCharts(true)
        try {
          const response = await fetch(`/api/personal/visualizations/${analysisId}`)
          if (response.ok) {
            const chartData = await response.json()
            setBackendCharts({
              pie_chart: chartData.pie_chart,
              bar_chart: chartData.bar_chart
            })
          }
        } catch (err) {
          console.error('Failed to load backend charts:', err)
          // Fallback to frontend charts - will use recharts
        } finally {
          setLoadingCharts(false)
        }
      }
    }
    
    loadBackendCharts()
  }, [data?.id, pieData.length, barData.length, insights])
  
  // Prepare line chart data for spending trends
  const lineData = React.useMemo(() => {
    // Try to get transactions from insights first, then from data.transactions, then from data itself
    const transactions = data?.insights?.transactions || data?.transactions || []
    if (!transactions || transactions.length === 0) return []
    const dailySpending = {}
    transactions.forEach(txn => {
      if (txn.date) {
        const date = new Date(txn.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        const amount = Math.abs(txn.amount || txn.amount_abs || 0)
        dailySpending[date] = (dailySpending[date] || 0) + amount
      }
    })
    return Object.entries(dailySpending)
      .map(([date, amount]) => ({ date, amount: Math.round(amount) }))
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(-30) // Last 30 days
  }, [data?.insights?.transactions, data?.transactions])
  
  // Calculate trends
  const avgDailySpending = insights?.total_spent ? (insights.total_spent / (insights.transaction_count || 1)) : 0
  const topCategoriesCount = Object.keys(insights?.category_breakdown || {}).length

  const downloadReport = async () => {
    if (isDownloading) return // Prevent multiple clicks
    
    console.log('Download button clicked')
    setIsDownloading(true)
    let reportDiv = null
    try {
      // Use jspdf and html2canvas directly for better reliability
      console.log('Importing libraries...')
      const { default: jsPDF } = await import('jspdf')
      const html2canvas = (await import('html2canvas')).default
      console.log('Libraries imported successfully')
      
      // Create a temporary div to hold the report content
      reportDiv = document.createElement('div')
      reportDiv.style.position = 'absolute'
      reportDiv.style.left = '-9999px'
      reportDiv.style.width = '210mm' // A4 width
      reportDiv.style.padding = '20mm'
      reportDiv.style.fontFamily = 'Arial, sans-serif'
      reportDiv.style.backgroundColor = '#ffffff'
      reportDiv.style.color = '#000000'
      
      reportDiv.innerHTML = `
        <div style="text-align: center; margin-bottom: 40px;">
          <img src="/logo.png" alt="OpenAudit Logo" style="width: 100px; height: 100px; margin: 0 auto 20px;" onerror="this.style.display='none'">
          <div style="font-size: 32px; font-weight: bold; color: #6366f1; margin-bottom: 10px;">OpenAudit</div>
          <div style="font-size: 18px; color: #64748b;">Financial Spending Analysis Report</div>
          <div style="margin-top: 20px; color: #64748b; font-size: 14px;">
            Generated on: ${new Date().toLocaleString()}
          </div>
        </div>

        <div style="margin: 30px 0;">
          <h2 style="color: #1e293b; border-bottom: 2px solid #6366f1; padding-bottom: 10px; font-size: 24px;">Smart Spending Score</h2>
          <div style="font-size: 48px; font-weight: bold; color: #6366f1; text-align: center; margin: 20px 0;">
            ${smart_score?.score?.toFixed(1) || '0.0'}/10
          </div>
          <div style="text-align: center; font-size: 18px; color: #64748b; margin: 10px 0;">
            ${smart_score?.spender_rating || 'Moderate Spender'}
          </div>
          <div style="text-align: center; color: #1e293b; margin: 15px 0; line-height: 1.6;">
            ${smart_score?.interpretation || ''}
          </div>
        </div>

        <div style="margin: 30px 0;">
          <h2 style="color: #1e293b; border-bottom: 2px solid #6366f1; padding-bottom: 10px; font-size: 24px;">Financial Summary</h2>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin: 20px 0;">
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; text-align: center;">
              <div style="font-size: 28px; font-weight: bold; color: #6366f1;">₹${insights?.total_spent?.toLocaleString('en-IN') || 0}</div>
              <div style="color: #64748b; margin-top: 8px;">Total Spent</div>
            </div>
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; text-align: center;">
              <div style="font-size: 28px; font-weight: bold; color: #6366f1;">${insights?.transaction_count || 0}</div>
              <div style="color: #64748b; margin-top: 8px;">Transactions</div>
            </div>
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; text-align: center;">
              <div style="font-size: 20px; font-weight: bold; color: #6366f1;">${insights?.top_category?.name || 'N/A'}</div>
              <div style="color: #64748b; margin-top: 8px;">Top Category</div>
            </div>
          </div>
        </div>

        <div style="margin: 30px 0;">
          <h2 style="color: #1e293b; border-bottom: 2px solid #6366f1; padding-bottom: 10px; font-size: 24px;">Category Breakdown</h2>
          ${Object.entries(insights?.category_breakdown || {}).map(([category, data]) => `
            <div style="margin: 15px 0; padding: 15px; background: #f8fafc; border-radius: 8px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-weight: bold; font-size: 18px;">${category}</span>
                <span style="font-size: 18px; color: #6366f1;">₹${data.amount?.toLocaleString('en-IN') || 0}</span>
              </div>
              <div style="margin-top: 8px; color: #64748b;">${data.percentage?.toFixed(1)}% of total spending</div>
            </div>
          `).join('')}
        </div>

        <div style="margin: 30px 0;">
          <h2 style="color: #1e293b; border-bottom: 2px solid #6366f1; padding-bottom: 10px; font-size: 24px;">Detailed Report</h2>
          <div style="line-height: 1.8; color: #1e293b; margin-top: 15px;">
            ${(report?.full_report || '').replace(/\n/g, '<br>')}
          </div>
        </div>

        <div style="margin: 30px 0;">
          <h2 style="color: #1e293b; border-bottom: 2px solid #6366f1; padding-bottom: 10px; font-size: 24px;">Recommendations</h2>
          <ul style="line-height: 2; margin-top: 15px;">
            ${(smart_score?.recommendations || []).map(rec => `<li style="margin: 10px 0;">${rec}</li>`).join('')}
          </ul>
        </div>

        <div style="margin-top: 60px; text-align: center; padding-top: 20px; border-top: 2px solid #e2e8f0; color: #64748b;">
          <div style="margin-bottom: 10px;">
            <strong>OpenAudit - Financial Analysis Platform</strong>
          </div>
          <div style="margin-top: 20px; font-size: 12px;">
            © ${new Date().getFullYear()} OpenAudit. All rights reserved.<br>
            This report is generated for personal use only.
          </div>
        </div>
      `
      
      document.body.appendChild(reportDiv)
      
      // Wait a moment for images to load
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Convert HTML to canvas
      const canvas = await html2canvas(reportDiv, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: reportDiv.offsetWidth,
        height: reportDiv.offsetHeight
      })
      
      // Create PDF
      const imgData = canvas.toDataURL('image/png', 1.0)
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })
      
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()
      const imgWidth = canvas.width
      const imgHeight = canvas.height
      
      // Calculate dimensions to fit page width
      const ratio = pdfWidth / imgWidth
      const imgScaledWidth = pdfWidth
      const imgScaledHeight = imgHeight * ratio
      
      // If content fits on one page, add it
      if (imgScaledHeight <= pdfHeight) {
        pdf.addImage(imgData, 'PNG', 0, 0, imgScaledWidth, imgScaledHeight)
      } else {
        // Content is taller than one page - split into multiple pages
        const totalPages = Math.ceil(imgScaledHeight / pdfHeight)
        const pageHeight = imgScaledHeight / totalPages
        
        for (let i = 0; i < totalPages; i++) {
          if (i > 0) {
            pdf.addPage()
          }
          
          // Calculate position for this page
          const yOffset = -i * pdfHeight
          
          pdf.addImage(
            imgData,
            'PNG',
            0,
            yOffset,
            imgScaledWidth,
            imgScaledHeight
          )
        }
      }
      
      // Save the PDF
      const filename = `OpenAudit_Report_${new Date().toISOString().split('T')[0]}.pdf`
      pdf.save(filename)
      
      console.log('PDF generated successfully')
      
      // Clean up - remove temporary div
      setTimeout(() => {
        if (reportDiv && document.body.contains(reportDiv)) {
          document.body.removeChild(reportDiv)
        }
      }, 1000)
    } catch (error) {
      console.error('Error downloading report:', error)
      console.error('Error details:', error.message, error.stack)
      // Clean up even on error
      if (reportDiv && document.body.contains(reportDiv)) {
        document.body.removeChild(reportDiv)
      }
      // Fallback: Use browser's print dialog
      alert(`Error generating PDF: ${error.message}\n\nPlease use the browser's print function (Ctrl+P / Cmd+P) and save as PDF.`)
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <div className="dashboard">
      {onBack && (
        <button className="back-btn" onClick={onBack}>
          <ArrowLeft size={20} />
          Back to Home
        </button>
      )}
      
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Financial Analysis Dashboard</h1>
          <p className="dashboard-subtitle">Comprehensive overview of your spending patterns and financial health</p>
        </div>
        {activeTab === 'dashboard' && (
          <button 
            className="btn btn-primary download-btn" 
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              downloadReport()
            }}
            type="button"
            disabled={isDownloading}
          >
            <Download size={20} />
            {isDownloading ? 'Generating...' : 'Download Report'}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="dashboard-tabs" style={{ display: 'flex', gap: '12px', marginBottom: '32px', position: 'relative', zIndex: 10 }}>
        <button
          className={`dashboard-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
          style={{
            padding: '12px 24px',
            background: activeTab === 'dashboard' 
              ? 'linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)' 
              : 'linear-gradient(135deg, rgba(51, 65, 85, 0.95) 0%, rgba(30, 41, 59, 0.98) 100%)',
            border: `2px solid ${activeTab === 'dashboard' ? 'rgba(16, 185, 129, 1)' : 'rgba(16, 185, 129, 0.4)'}`,
            borderRadius: '12px',
            color: activeTab === 'dashboard' ? 'white' : 'var(--text)',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.3s ease',
            boxShadow: activeTab === 'dashboard' 
              ? '0 4px 16px rgba(16, 185, 129, 0.5), 0 0 40px rgba(16, 185, 129, 0.3)' 
              : '0 2px 8px rgba(0, 0, 0, 0.2)'
          }}
        >
          <BarChart3 size={20} />
          Dashboard
        </button>
        <button
          className={`dashboard-tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
          style={{
            padding: '12px 24px',
            background: activeTab === 'history' 
              ? 'linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)' 
              : 'linear-gradient(135deg, rgba(51, 65, 85, 0.95) 0%, rgba(30, 41, 59, 0.98) 100%)',
            border: `2px solid ${activeTab === 'history' ? 'rgba(16, 185, 129, 1)' : 'rgba(16, 185, 129, 0.4)'}`,
            borderRadius: '12px',
            color: activeTab === 'history' ? 'white' : 'var(--text)',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.3s ease',
            boxShadow: activeTab === 'history' 
              ? '0 4px 16px rgba(16, 185, 129, 0.5), 0 0 40px rgba(16, 185, 129, 0.3)' 
              : '0 2px 8px rgba(0, 0, 0, 0.2)'
          }}
        >
          <History size={20} />
          History
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'history' ? (
        <HistoryTab user={user} />
      ) : !data ? (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <BarChart3 size={64} color="#64748b" style={{ marginBottom: '20px' }} />
          <h3 style={{ marginBottom: '10px', color: 'var(--text)' }}>No Analysis Data</h3>
          <p style={{ color: 'var(--text-light)', marginBottom: '24px' }}>
            Please analyze your files first or check the History tab for previous analyses.
          </p>
          <button 
            className="btn btn-primary"
            onClick={() => setActiveTab('history')}
          >
            <History size={20} />
            View History
          </button>
        </div>
      ) : (
        <>

      {/* Key Metrics Cards - Top Row */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon" style={{ background: 'rgba(16, 185, 129, 0.1)' }}>
            <DollarSign size={24} color="#10b981" />
          </div>
          <div className="metric-content">
            <h3 className="metric-value">₹{insights?.total_spent?.toLocaleString('en-IN') || 0}</h3>
            <p className="metric-label">Total Spent</p>
            <div className="metric-trend">
              <Activity size={14} />
              <span>All Time</span>
            </div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon" style={{ background: 'rgba(59, 130, 246, 0.1)' }}>
            <FileText size={24} color="#3b82f6" />
          </div>
          <div className="metric-content">
            <h3 className="metric-value">{insights?.transaction_count || 0}</h3>
            <p className="metric-label">Transactions</p>
            <div className="metric-trend">
              <TrendingUp size={14} color="#10b981" />
              <span>Recorded</span>
            </div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon" style={{ background: 'rgba(139, 92, 246, 0.1)' }}>
            <ShoppingCart size={24} color="#8b5cf6" />
          </div>
          <div className="metric-content">
            <h3 className="metric-value">{topCategoriesCount}</h3>
            <p className="metric-label">Categories</p>
            <div className="metric-trend">
              <PieChartIcon size={14} />
              <span>Active</span>
            </div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon" style={{ background: 'rgba(245, 158, 11, 0.1)' }}>
            <Target size={24} color="#f59e0b" />
          </div>
          <div className="metric-content">
            <h3 className="metric-value">{smart_score?.score?.toFixed(1) || '0.0'}</h3>
            <p className="metric-label">Smart Score</p>
            <div className="metric-trend">
              <TrendingUp size={14} color="#10b981" />
              <span>{smart_score?.spender_rating || 'Moderate'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="charts-grid">
        {/* Pie Chart - Spending Distribution */}
        {(backendCharts.pie_chart || (pieData && pieData.length > 0)) && (
          <div className="chart-card">
            <div className="chart-header">
              <h3 className="chart-title">Spending Distribution</h3>
              <PieChartIcon size={20} color="var(--primary)" />
            </div>
            {loadingCharts ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '60px 20px' }}>
                <div>Loading charts...</div>
              </div>
            ) : backendCharts.pie_chart ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
                <img 
                  src={backendCharts.pie_chart} 
                  alt="Spending Distribution Pie Chart" 
                  style={{ maxWidth: '100%', height: 'auto', borderRadius: '8px', boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)' }}
                />
              </div>
            ) : pieData && pieData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={320}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                      outerRadius={110}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `₹${Number(value).toLocaleString('en-IN')}`} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="chart-legend">
                  {pieData.slice(0, 5).map((entry, index) => (
                    <div key={index} className="legend-item">
                      <div className="legend-color" style={{ background: COLORS[index % COLORS.length] }}></div>
                      <span>{entry.name}</span>
                      <span style={{ marginLeft: 'auto', color: 'var(--text-light)' }}>
                        ₹{entry.value?.toLocaleString('en-IN') || 0}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : null}
          </div>
        )}

        {/* Bar Chart - Category Comparison */}
        {(backendCharts.bar_chart || (barData && barData.length > 0)) && (
          <div className="chart-card">
            <div className="chart-header">
              <h3 className="chart-title">Category Comparison</h3>
              <Activity size={20} color="var(--secondary)" />
            </div>
            {loadingCharts ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '60px 20px' }}>
                <div>Loading charts...</div>
              </div>
            ) : backendCharts.bar_chart ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
                <img 
                  src={backendCharts.bar_chart} 
                  alt="Category Comparison Bar Chart" 
                  style={{ maxWidth: '100%', height: 'auto', borderRadius: '8px', boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)' }}
                />
              </div>
            ) : barData && barData.length > 0 ? (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis 
                    dataKey="category" 
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
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="amount" fill="#3b82f6" radius={[8, 8, 0, 0]}>
                    {barData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : null}
          </div>
        )}

        {/* Line Chart - Spending Trend */}
        {lineData && lineData.length > 0 && (
          <div className="chart-card full-width">
            <div className="chart-header">
              <h3 className="chart-title">Spending Trend</h3>
              <TrendingUp size={20} color="var(--primary)" />
            </div>
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={lineData}>
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis 
                  dataKey="date" 
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
                    borderRadius: '8px'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="amount" 
                  stroke="#10b981" 
                  fillOpacity={1} 
                  fill="url(#colorAmount)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Category Breakdown */}
      <div className="card">
        <h3 className="subtitle">Detailed Category Breakdown</h3>
        <p className="text-light" style={{ marginBottom: '16px' }}>
          See exactly how much you're spending in each category and how it compares to ideal spending patterns.
        </p>
        <div className="category-list">
          {Object.entries(insights?.category_breakdown || {}).map(([category, data]) => (
            <div key={category} className="category-item">
              <div className="category-header">
                <span className="category-name">{category}</span>
                <span className="category-amount">₹{data.amount.toLocaleString('en-IN')}</span>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{
                    width: `${data.percentage}%`,
                    background: COLORS[Object.keys(insights?.category_breakdown || {}).indexOf(category) % COLORS.length]
                  }}
                />
              </div>
              <div className="category-footer">
                <span className="category-percentage">{data.percentage.toFixed(1)}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Natural Language Report */}
      <ReportDisplay report={report} />
        </>
      )}
      <Chatbot user={user} accountType="personal" />
    </div>
  )
}

function HistoryTab({ user }) {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchHistory = async () => {
      if (!user?.id) return
      
      setLoading(true)
      try {
        const response = await fetch(`/api/personal/history/${user.id}`)
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

    fetchHistory()
  }, [user])

  const handleDownloadReport = async (analysisId) => {
    try {
      const response = await fetch(`/api/personal/report/${analysisId}`)
      if (!response.ok) throw new Error('Failed to download')
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `OpenAudit_Report_${analysisId}.pdf`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      alert('Failed to download report')
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div className="loading-spinner">Loading history...</div>
      </div>
    )
  }

  if (history.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <History size={64} color="#64748b" style={{ marginBottom: '20px' }} />
        <h3 style={{ marginBottom: '10px', color: 'var(--text)' }}>No Analysis History</h3>
        <p style={{ color: 'var(--text-light)' }}>
          Upload and analyze files to see your history here
        </p>
      </div>
    )
  }

  return (
    <div className="history-content">
      <h2 style={{ marginBottom: '24px', color: 'var(--text)', fontSize: '28px' }}>Analysis History</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {history.map((item) => (
          <div
            key={item.id}
            style={{
              background: 'linear-gradient(135deg, rgba(51, 65, 85, 0.95) 0%, rgba(30, 41, 59, 0.98) 100%)',
              border: '2px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '16px',
              padding: '24px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.6)'
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(16, 185, 129, 0.3)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.3)'
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <FileText size={20} color="#10b981" />
                <h3 style={{ margin: 0, color: 'var(--text)', fontSize: '18px' }}>
                  Analysis - {new Date(item.created_at).toLocaleDateString()}
                </h3>
              </div>
              <div style={{ display: 'flex', gap: '24px', marginTop: '12px', flexWrap: 'wrap' }}>
                <div>
                  <span style={{ color: 'var(--text-light)', fontSize: '14px' }}>Transactions: </span>
                  <span style={{ color: 'var(--text)', fontWeight: '600' }}>{item.total_transactions || 0}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-light)', fontSize: '14px' }}>Total Amount: </span>
                  <span style={{ color: 'var(--text)', fontWeight: '600' }}>
                    ₹{item.total_amount?.toLocaleString('en-IN') || 0}
                  </span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-light)', fontSize: '14px' }}>Score: </span>
                  <span style={{ color: '#10b981', fontWeight: '600' }}>
                    {item.smart_score?.score?.toFixed(1) || 'N/A'}/10
                  </span>
                </div>
              </div>
              <div style={{ marginTop: '8px', color: 'var(--text-muted)', fontSize: '12px' }}>
                {new Date(item.created_at).toLocaleString()}
              </div>
            </div>
            <button
              onClick={() => handleDownloadReport(item.id)}
              style={{
                padding: '10px 20px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)'
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.5)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              <Download size={16} />
              Download PDF
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Dashboard

