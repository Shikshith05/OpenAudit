import React, { useState } from 'react'
import { Upload, FileText, Download, AlertCircle, CheckCircle, XCircle, TrendingUp, Shield, FileSignature, Activity, Target, BarChart3 } from 'lucide-react'
import './CompanyPortal.css'

function AuditTab({ user, onAnalysisComplete }) {
  const [files, setFiles] = useState([])
  const [analyzing, setAnalyzing] = useState(false)
  const [auditResult, setAuditResult] = useState(null)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [missingValues, setMissingValues] = useState([])
  
  // Company information form
  const [companyInfo, setCompanyInfo] = useState({
    company_name: user?.full_name || '',
    industry: '',
    company_size: 'Medium',
    location: '',
    fiscal_year: new Date().getFullYear().toString(),
    accounting_standards: 'IFRS',
    regulatory_framework: 'India'
  })

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files)
    const validFiles = selectedFiles.filter(file => {
      const ext = file.name.split('.').pop().toLowerCase()
      return ['jpg', 'jpeg', 'png', 'txt', 'xlsx', 'xls', 'csv', 'pdf'].includes(ext)
    })
    setFiles(prev => [...prev, ...validFiles])
  }

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleCompanyInfoChange = (field, value) => {
    setCompanyInfo(prev => ({ ...prev, [field]: value }))
  }

  const handleAudit = async () => {
    if (files.length === 0) {
      setError('Please upload at least one financial file')
      return
    }

    if (!companyInfo.company_name) {
      setError('Company name is required')
      return
    }

    if (!companyInfo.industry) {
      setError('Industry is required')
      return
    }

    if (!companyInfo.location) {
      setError('Location is required')
      return
    }

    setAnalyzing(true)
    setError(null)
    setSuccess(null)

    try {
      const formData = new FormData()
      files.forEach(file => {
        formData.append('files', file)
      })
      
      formData.append('user_id', user?.id || '')
      formData.append('company_name', companyInfo.company_name)
      formData.append('industry', companyInfo.industry)
      formData.append('company_size', companyInfo.company_size)
      formData.append('location', companyInfo.location)
      formData.append('fiscal_year', companyInfo.fiscal_year)
      formData.append('accounting_standards', companyInfo.accounting_standards)
      formData.append('regulatory_framework', companyInfo.regulatory_framework)

      const response = await fetch('/api/company/audit', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        let errorMessage = 'Audit failed'
        try {
          const errorData = await response.json()
          errorMessage = errorData.detail || errorData.message || errorMessage
        } catch (e) {
          errorMessage = response.statusText || errorMessage
        }
        throw new Error(errorMessage)
      }

      const result = await response.json()
      
      if (result.status === 'success') {
        setAuditResult(result)
        setSuccess('AI Audit completed successfully!')
        
        // Get missing values data for table display (separate case - doesn't affect processing)
        const missingValuesData = result.missing_values || []
        if (missingValuesData.length > 0) {
          setMissingValues(missingValuesData)
        }
        
        // Prepare data for visualise tab - merge audit report with visualization data
        const visualiseData = {
          ...result,
          insights: result.insights || {},
          visualizations: result.visualizations || {},
          smart_score: result.smart_score || {},
          transactions: result.transactions || []
        }
        
        if (onAnalysisComplete) {
          onAnalysisComplete(visualiseData)
        }
      } else {
        throw new Error(result.message || 'Audit failed')
      }
    } catch (err) {
      setError(err.message || 'Failed to perform audit')
      console.error('Audit error:', err)
    } finally {
      setAnalyzing(false)
    }
  }

  const getRiskColor = (score) => {
    if (score >= 80) return '#10b981' // Green
    if (score >= 60) return '#f59e0b' // Yellow
    if (score >= 40) return '#ef4444' // Red
    return '#dc2626' // Dark red
  }

  const getStatusBadge = (status) => {
    const badges = {
      'PASS': { text: 'Pass', color: '#10b981', icon: CheckCircle },
      'FAIL': { text: 'Fail', color: '#ef4444', icon: XCircle },
      'CONDITIONAL': { text: 'Conditional', color: '#f59e0b', icon: AlertCircle }
    }
    return badges[status] || badges['CONDITIONAL']
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

  const auditReport = auditResult?.audit_report

  return (
    <div className="audit-tab">
      <div className="audit-header">
        <h2 className="tab-title">
          <Shield size={32} />
          AI-Powered Financial Audit
        </h2>
        <p className="tab-description">
          Comprehensive AI audit for compliance, fraud detection, risk assessment, and regulatory analysis
        </p>
      </div>

      {error && (
        <div className="alert alert-error">
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          <CheckCircle size={20} />
          {success}
        </div>
      )}

      {missingValues.length > 0 && (
        <div className="missing-values-section" style={{ 
          marginTop: '24px',
          marginBottom: '24px',
          background: 'linear-gradient(135deg, rgba(51, 65, 85, 0.95) 0%, rgba(30, 41, 59, 0.98) 100%)',
          borderRadius: '16px',
          padding: '24px',
          border: '2px solid rgba(251, 191, 36, 0.3)'
        }}>
          <h3 style={{ 
            marginBottom: '20px', 
            color: '#fbbf24',
            fontSize: '20px',
            fontWeight: '700',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <AlertCircle size={24} />
            Missing Values
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              background: 'rgba(15, 23, 42, 0.5)',
              borderRadius: '12px',
              overflow: 'hidden'
            }}>
              <thead>
                <tr style={{ background: 'rgba(251, 191, 36, 0.2)' }}>
                  <th style={{ padding: '12px', textAlign: 'left', color: '#fbbf24', fontWeight: '700', fontSize: '14px' }}>File</th>
                  <th style={{ padding: '12px', textAlign: 'left', color: '#fbbf24', fontWeight: '700', fontSize: '14px' }}>Column No.</th>
                  <th style={{ padding: '12px', textAlign: 'left', color: '#fbbf24', fontWeight: '700', fontSize: '14px' }}>Column Name</th>
                  <th style={{ padding: '12px', textAlign: 'left', color: '#fbbf24', fontWeight: '700', fontSize: '14px' }}>Missing Rows</th>
                  <th style={{ padding: '12px', textAlign: 'left', color: '#fbbf24', fontWeight: '700', fontSize: '14px' }}>Count</th>
                </tr>
              </thead>
              <tbody>
                {missingValues.map((item, idx) => (
                  <tr key={idx} style={{
                    borderBottom: '1px solid rgba(251, 191, 36, 0.1)',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(251, 191, 36, 0.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '12px', color: '#e6eef6', fontSize: '14px' }}>{item.filename}</td>
                    <td style={{ padding: '12px', color: '#e6eef6', fontSize: '14px', fontWeight: '600' }}>{item.column_number}</td>
                    <td style={{ padding: '12px', color: '#e6eef6', fontSize: '14px' }}>{item.column_name}</td>
                    <td style={{ padding: '12px', color: '#e6eef6', fontSize: '14px' }}>
                      {item.missing_rows && item.missing_rows.length > 0 
                        ? (item.missing_rows.length > 10 
                            ? `${item.missing_rows.slice(0, 10).join(', ')}... (${item.missing_rows.length} total)`
                            : item.missing_rows.join(', '))
                        : 'N/A'}
                    </td>
                    <td style={{ padding: '12px', color: '#fbbf24', fontSize: '14px', fontWeight: '600' }}>{item.missing_count || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!auditResult ? (
        <div className="audit-form-container">
          {/* Company Information Form */}
          <div className="company-info-section">
            <h3 className="section-title">Company Information</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Company Name *</label>
                <input
                  type="text"
                  value={companyInfo.company_name}
                  onChange={(e) => handleCompanyInfoChange('company_name', e.target.value)}
                  placeholder="Enter company name"
                  required
                />
              </div>

              <div className="form-group">
                <label>Industry *</label>
                <select
                  value={companyInfo.industry}
                  onChange={(e) => handleCompanyInfoChange('industry', e.target.value)}
                  required
                >
                  <option value="">Select Industry</option>
                  <option value="Manufacturing">Manufacturing</option>
                  <option value="Technology">Technology</option>
                  <option value="Finance">Finance</option>
                  <option value="Healthcare">Healthcare</option>
                  <option value="Retail">Retail</option>
                  <option value="Real Estate">Real Estate</option>
                  <option value="Education">Education</option>
                  <option value="Hospitality">Hospitality</option>
                  <option value="Transportation">Transportation</option>
                  <option value="Energy">Energy</option>
                  <option value="Agriculture">Agriculture</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label>Company Size *</label>
                <select
                  value={companyInfo.company_size}
                  onChange={(e) => handleCompanyInfoChange('company_size', e.target.value)}
                >
                  <option value="Small">Small (1-50 employees)</option>
                  <option value="Medium">Medium (51-250 employees)</option>
                  <option value="Large">Large (251+ employees)</option>
                </select>
              </div>

              <div className="form-group">
                <label>Location *</label>
                <input
                  type="text"
                  value={companyInfo.location}
                  onChange={(e) => handleCompanyInfoChange('location', e.target.value)}
                  placeholder="City, State, Country"
                  required
                />
              </div>

              <div className="form-group">
                <label>Fiscal Year</label>
                <input
                  type="number"
                  value={companyInfo.fiscal_year}
                  onChange={(e) => handleCompanyInfoChange('fiscal_year', e.target.value)}
                  min="2020"
                  max="2030"
                />
              </div>

              <div className="form-group">
                <label>Accounting Standards</label>
                <select
                  value={companyInfo.accounting_standards}
                  onChange={(e) => handleCompanyInfoChange('accounting_standards', e.target.value)}
                >
                  <option value="IFRS">IFRS</option>
                  <option value="GAAP">GAAP</option>
                  <option value="Ind AS">Ind AS (India)</option>
                </select>
              </div>

              <div className="form-group">
                <label>Regulatory Framework</label>
                <select
                  value={companyInfo.regulatory_framework}
                  onChange={(e) => handleCompanyInfoChange('regulatory_framework', e.target.value)}
                >
                  <option value="India">India</option>
                  <option value="US">United States</option>
                  <option value="EU">European Union</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
          </div>

          {/* File Upload Section */}
          <div className="file-upload-section">
            <h3 className="section-title">Upload Financial Documents</h3>
            <p className="section-description">
              Upload your financial statements, transaction records, bank statements, and related documents.
              Supported formats: CSV, Excel (XLSX, XLS), PDF, TXT, Images (JPG, PNG)
            </p>

            <div className="file-upload-area">
              <input
                type="file"
                id="audit-file-upload"
                multiple
                accept=".jpg,.jpeg,.png,.txt,.xlsx,.xls,.csv,.pdf"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
              <label htmlFor="audit-file-upload" className="upload-label">
                <Upload size={48} />
                <span>Click to select files or drag and drop</span>
                <small>You can upload multiple files at once</small>
              </label>
            </div>

            {files.length > 0 && (
              <div className="files-list">
                <h4>Selected Files ({files.length})</h4>
                <div className="files-grid">
                  {files.map((file, index) => (
                    <div key={index} className="file-item">
                      <FileText size={20} />
                      <span className="file-name" title={file.name}>{file.name}</span>
                      <span className="file-size">{(file.size / 1024).toFixed(1)} KB</span>
                      <button className="remove-file-btn" onClick={() => removeFile(index)}>×</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              className="btn btn-primary btn-large audit-btn"
              onClick={handleAudit}
              disabled={analyzing || files.length === 0}
            >
              {analyzing ? (
                <>
                  <Activity size={20} className="spinning" />
                  Running AI Audit...
                </>
              ) : (
                <>
                  <Shield size={20} />
                  Start AI Audit
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="audit-results">
          {auditReport?.audit_summary && (
            <div className="audit-summary-card">
              <div className="summary-header">
                <h3>Audit Summary</h3>
                {(() => {
                  const badge = getStatusBadge(auditReport.audit_summary.audit_status)
                  const Icon = badge.icon
                  return (
                    <span className="status-badge" style={{ background: badge.color + '20', color: badge.color }}>
                      <Icon size={16} />
                      {badge.text}
                    </span>
                  )
                })()}
              </div>

              <div className="score-cards-flex">
                <div className="score-card-flex">
                  <div className="score-label-flex">Overall Risk Score</div>
                  <div className="score-value-flex" style={{ color: getRiskColor(auditReport.audit_summary.overall_risk_score) }}>
                    {auditReport.audit_summary.overall_risk_score}/100
                  </div>
                </div>
                <div className="score-card-flex">
                  <div className="score-label-flex">Compliance Score</div>
                  <div className="score-value-flex" style={{ color: getRiskColor(auditReport.audit_summary.compliance_score) }}>
                    {auditReport.audit_summary.compliance_score}/100
                  </div>
                </div>
                <div className="score-card-flex">
                  <div className="score-label-flex">Financial Health Score</div>
                  <div className="score-value-flex" style={{ color: getRiskColor(auditReport.audit_summary.financial_health_score) }}>
                    {auditReport.audit_summary.financial_health_score}/100
                  </div>
                </div>
              </div>

              <div className="summary-info">
                <p><strong>Company:</strong> {auditReport.audit_summary.company_name}</p>
                <p><strong>Audit Date:</strong> {new Date(auditReport.audit_summary.audit_date).toLocaleString()}</p>
                <p><strong>Fiscal Year:</strong> {auditReport.audit_summary.fiscal_year}</p>
              </div>
            </div>
          )}

          {/* Financial Compliance */}
          {auditReport?.financial_compliance && (
            <div className="audit-section-card">
              <h3><Shield size={20} /> Financial Compliance</h3>
              <div className="compliance-status">
                <span className={`status-badge ${auditReport.financial_compliance.gaap_compliance.toLowerCase().replace('_', '-')}`}>
                  {auditReport.financial_compliance.gaap_compliance}
                </span>
              </div>
              {auditReport.financial_compliance.issues?.length > 0 && (
                <div className="issues-list">
                  <h4>Issues Found:</h4>
                  <ul>
                    {auditReport.financial_compliance.issues.map((issue, idx) => (
                      <li key={idx}>{issue}</li>
                    ))}
                  </ul>
                </div>
              )}
              {auditReport.financial_compliance.recommendations?.length > 0 && (
                <div className="recommendations-list">
                  <h4>Recommendations:</h4>
                  <ul>
                    {auditReport.financial_compliance.recommendations.map((rec, idx) => (
                      <li key={idx}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* AI Analysis Section - Large Font */}
          {auditReport?.fraud_detection?.findings && auditReport.fraud_detection.findings.length > 0 && (
            <div className="audit-section-card ai-analysis-section">
              <h3><Shield size={24} /> AI Analysis</h3>
              <div className="ai-analysis-content">
                {auditReport.fraud_detection.findings.map((finding, idx) => (
                  <p key={idx} className="ai-analysis-text">{finding}</p>
                ))}
              </div>
            </div>
          )}

          {/* Fraud Detection */}
          {auditReport?.fraud_detection && (
            <div className="audit-section-card">
              <h3><AlertCircle size={20} /> Fraud Detection & Anomaly Analysis</h3>
              <div className="risk-indicator">
                <span className={`risk-badge risk-${auditReport.fraud_detection.risk_level.toLowerCase()}`}>
                  Risk Level: {auditReport.fraud_detection.risk_level}
                </span>
              </div>
              {auditReport.fraud_detection.suspicious_transactions?.length > 0 && (
                <div className="suspicious-transactions-table-container">
                  <h4>Suspicious Transactions Found: {auditReport.fraud_detection.suspicious_transactions.length}</h4>
                  <table className="suspicious-transactions-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Description</th>
                        <th>Amount</th>
                        <th>Suspicion Index</th>
                        <th>Amount Score</th>
                        <th>Text Score</th>
                        <th>Risk Level</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditReport.fraud_detection.suspicious_transactions.map((txn, idx) => (
                        <tr key={idx} className={txn.risk_level?.includes('HIGH') ? 'risk-high' : txn.risk_level?.includes('MEDIUM') ? 'risk-medium' : ''}>
                          <td>{txn.date || 'N/A'}</td>
                          <td className="description-cell">{txn.description || 'N/A'}</td>
                          <td className="amount-cell">₹{typeof txn.amount === 'number' ? txn.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : txn.amount || 'N/A'}</td>
                          <td>{txn.suspicion_index?.toFixed(4) || 'N/A'}</td>
                          <td>{txn.amount_score?.toFixed(4) || 'N/A'}</td>
                          <td>{txn.text_score?.toFixed(4) || 'N/A'}</td>
                          <td className="risk-level-cell">
                            <span className={`risk-badge-small ${txn.risk_level?.includes('HIGH') ? 'high' : txn.risk_level?.includes('MEDIUM') ? 'medium' : 'normal'}`}>
                              {txn.risk_level || 'N/A'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Risk Assessment */}
          {auditReport?.risk_assessment && (
            <div className="audit-section-card">
              <h3><Target size={20} /> Risk Assessment</h3>
              <div className="overall-risk">
                <span className={`risk-badge risk-${auditReport.risk_assessment.overall_risk_level.toLowerCase()}`}>
                  Overall Risk: {auditReport.risk_assessment.overall_risk_level}
                </span>
              </div>
              {auditReport.risk_assessment.financial_risks?.length > 0 && (
                <div className="risks-list">
                  <h4>Financial Risks:</h4>
                  <ul>
                    {auditReport.risk_assessment.financial_risks.map((risk, idx) => (
                      <li key={idx}>{risk}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Recommendations */}
          {auditReport?.recommendations && (
            <div className="audit-section-card recommendations-card">
              <h3><TrendingUp size={20} /> Recommendations</h3>
              {auditReport.recommendations.critical?.length > 0 && (
                <div className="recommendations-section critical">
                  <h4 className="priority-critical">🔴 Critical</h4>
                  <ul>
                    {auditReport.recommendations.critical.map((rec, idx) => (
                      <li key={idx}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
              {auditReport.recommendations.high_priority?.length > 0 && (
                <div className="recommendations-section high">
                  <h4 className="priority-high">🟠 High Priority</h4>
                  <ul>
                    {auditReport.recommendations.high_priority.map((rec, idx) => (
                      <li key={idx}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
              {auditReport.recommendations.medium_priority?.length > 0 && (
                <div className="recommendations-section medium">
                  <h4 className="priority-medium">🟡 Medium Priority</h4>
                  <ul>
                    {auditReport.recommendations.medium_priority.map((rec, idx) => (
                      <li key={idx}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="audit-actions">
            <button
              className="btn btn-secondary"
              onClick={() => {
                setAuditResult(null)
                setFiles([])
                setSuccess(null)
                setError(null)
              }}
            >
              Start New Audit
            </button>
            <button 
              className="btn btn-primary"
              onClick={() => auditResult?.id && handleDownloadReport(auditResult.id)}
              disabled={!auditResult?.id}
            >
              <Download size={20} />
              Download Audit Report (PDF)
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default AuditTab

