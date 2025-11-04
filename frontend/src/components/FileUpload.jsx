import React, { useState } from 'react'
import axios from 'axios'
import { Upload, FileText, AlertCircle, ArrowLeft } from 'lucide-react'
import './FileUpload.css'

function FileUpload({ onAnalysisComplete, loading, setLoading, onBack }) {
  const [file, setFile] = useState(null)
  const [pdfPassword, setPdfPassword] = useState('')
  const [isPdf, setIsPdf] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [missingValues, setMissingValues] = useState([])

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile) {
      setFile(selectedFile)
      const fileExtension = selectedFile.name.toLowerCase().split('.').pop()
      const isPdfFile = fileExtension === 'pdf'
      setIsPdf(isPdfFile)
      setPdfPassword('')
      setError(null)
      setSuccess(null)
    } else {
      setFile(null)
      setIsPdf(false)
      setPdfPassword('')
      setError(null)
      setSuccess(null)
    }
  }

  const handleUpload = async () => {
    if (!file) {
      setError('⚠️ No file selected. Please select a bank statement file to analyze.')
      setSuccess(null)
      return
    }

    // Note: PDF password validation happens on backend
    // Frontend allows empty password or "NA" - backend will validate if PDF is actually protected

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      // Always send password field for PDFs (even if empty or "NA")
      if (isPdf) {
        formData.append('pdf_password', pdfPassword || 'NA')
      }

      const response = await axios.post('/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      if (response.data.status === 'success') {
        setSuccess('File uploaded successfully! Analyzing data...')
        
        // Process the uploaded data
        const processedData = response.data.data
        
        // Get missing values data for table display (separate case - doesn't affect processing)
        const missingValuesData = processedData.missing_values || []
        if (missingValuesData.length > 0) {
          setMissingValues(missingValuesData)
        }
        
        // Analyze the financial data
        const analysisResponse = await axios.post('/api/analyze', {
          transactions: processedData.transactions
        })

        if (analysisResponse.data.status === 'success') {
          setSuccess('Analysis complete!')
          
          // Save analysis to history for personal users
          const user = JSON.parse(localStorage.getItem('user') || '{}')
          if (user?.id && user?.account_type === 'personal') {
            try {
              await axios.post('/api/personal/analyze', {
                user_id: user.id,
                analysis_data: {
                  ...analysisResponse.data,
                  total_transactions: processedData.transactions?.length || 0,
                  total_amount: processedData.transactions?.reduce((sum, t) => sum + Math.abs(t.amount || 0), 0) || 0,
                  date_range: processedData.transactions?.length > 0 ? {
                    start: processedData.transactions[0]?.date,
                    end: processedData.transactions[processedData.transactions.length - 1]?.date
                  } : {}
                }
              })
            } catch (historyErr) {
              console.error('Failed to save to history:', historyErr)
              // Don't block the user flow if history save fails
            }
          }
          
          onAnalysisComplete(analysisResponse.data)
        } else {
          setError('Failed to analyze data')
        }
      }
    } catch (err) {
      setError(
        err.response?.data?.detail || 
        err.message || 
        'An error occurred while uploading the file'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="file-upload">
      {onBack && (
        <button 
          className="back-btn" 
          onClick={onBack}
          style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer' }}
        >
          <ArrowLeft size={20} />
          Back
        </button>
      )}
      <div className="card">
        <h2 className="section-title">Upload Your Bank Statement</h2>
        <p className="text-light" style={{ fontSize: '16px', marginBottom: '20px' }}>
          Simply upload your bank statement file to get instant insights about your spending habits.
        </p>
        
        <div className="user-friendly-info">
          <div className="info-box">
            <h3>📄 What is a Bank Statement?</h3>
            <p>Your bank statement is a record of all transactions from your account. Most banks let you download it as a CSV or Excel file from:</p>
            <ul>
              <li>🔹 Your bank's mobile app (usually under "Statements" or "Transactions")</li>
              <li>🔹 Your bank's website (login → Account → Download Statement)</li>
              <li>🔹 Email statements from your bank</li>
            </ul>
          </div>
          
          <div className="info-box">
            <h3>✅ What We Support:</h3>
            <ul>
              <li>✅ Bank Statements (CSV/Excel files)</li>
              <li>✅ PDF statements and documents</li>
              <li>✅ Image files (JPG, JPEG, PNG) of statements</li>
              <li>✅ Word documents (DOC, DOCX)</li>
              <li>✅ UPI/E-wallet transaction exports (CSV)</li>
              <li>✅ Google Pay, PhonePe, Paytm transaction files</li>
            </ul>
            <p style={{ marginTop: '12px', fontSize: '14px' }}>
              <strong>Don't worry about column names</strong> - we automatically detect Date, Description, and Amount from your file!
            </p>
          </div>
        </div>

        <div className="upload-area">
          <input
            type="file"
            id="file-input"
            accept=".csv,.json,.xlsx,.xls,.pdf,.jpg,.jpeg,.png,.doc,.docx"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
          <label htmlFor="file-input" className="upload-button">
            <Upload size={24} />
            {file ? file.name : 'Choose File'}
          </label>
        </div>

        {file && (
          <div className="file-info">
            <FileText size={20} />
            <span>{file.name}</span>
            <span className="file-size">
              {(file.size / 1024).toFixed(2)} KB
            </span>
          </div>
        )}

        {isPdf && (
          <div className="pdf-password-section" style={{ marginTop: '24px' }}>
            <label htmlFor="pdf-password" style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: 'var(--text)' }}>
              PDF Password
            </label>
            <input
              type="password"
              id="pdf-password"
              value={pdfPassword}
              onChange={(e) => setPdfPassword(e.target.value)}
              placeholder="Enter password or 'NA' if not protected"
              className="pdf-password-input"
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px solid var(--border)',
                borderRadius: '8px',
                fontSize: '16px',
                transition: 'all 0.2s'
              }}
            />
            <p style={{ marginTop: '8px', fontSize: '14px', color: 'var(--text-light)' }}>
              💡 Enter the password if the PDF is protected, or enter "NA" if it's not protected.
            </p>
          </div>
        )}

        {error && (
          <div className="error" style={{ marginTop: '20px' }}>
            <AlertCircle size={24} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="success" style={{ marginTop: '20px' }}>
            <span>{success}</span>
          </div>
        )}

        {missingValues.length > 0 && (
          <div className="missing-values-section" style={{ 
            marginTop: '24px',
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

        <button
          className="btn btn-primary"
          onClick={handleUpload}
          disabled={loading}
          style={{ fontSize: '18px', padding: '16px 32px', marginTop: '24px' }}
        >
          {loading ? 'Analyzing Your Spending...' : '📊 Analyze My Spending'}
        </button>

        <div className="help-section">
          <h3 className="subtitle">💡 Need Help Getting Your Bank Statement?</h3>
          <div className="help-steps">
            <div className="step">
              <div className="step-number">1</div>
              <div>
                <strong>Open your bank's app or website</strong>
                <p>Log in to your account</p>
              </div>
            </div>
            <div className="step">
              <div className="step-number">2</div>
              <div>
                <strong>Find "Statements" or "Transactions"</strong>
                <p>Look for options like "Download Statement" or "Export Transactions"</p>
              </div>
            </div>
            <div className="step">
              <div className="step-number">3</div>
              <div>
                <strong>Select date range and download</strong>
                <p>Choose CSV or Excel format if available</p>
              </div>
            </div>
            <div className="step">
              <div className="step-number">4</div>
              <div>
                <strong>Upload the file here</strong>
                <p>That's it! We'll analyze your spending automatically</p>
              </div>
            </div>
          </div>
          
          <div className="note-box">
            <p><strong>Note:</strong> We don't store your bank statements. All analysis happens securely and your data stays private.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FileUpload

