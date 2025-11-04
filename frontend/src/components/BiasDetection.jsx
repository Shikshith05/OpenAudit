import React, { useState } from 'react'
import axios from 'axios'
import { Shield, Upload, AlertTriangle, CheckCircle } from 'lucide-react'
import './BiasDetection.css'

function BiasDetection({ loading, setLoading }) {
  const [file, setFile] = useState(null)
  const [sensitiveAttributes, setSensitiveAttributes] = useState('')
  const [decisionAttribute, setDecisionAttribute] = useState('approved')
  const [biasResults, setBiasResults] = useState(null)
  const [error, setError] = useState(null)

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile) {
      setFile(selectedFile)
      setError(null)
      setBiasResults(null)
    }
  }

  const handleAnalyze = async () => {
    if (!file) {
      setError('Please select a file to upload')
      return
    }

    setLoading(true)
    setError(null)
    setBiasResults(null)

    try {
      // Read file as JSON
      const fileContent = await file.text()
      let dataset
      
      try {
        dataset = JSON.parse(fileContent)
      } catch {
        // Try as CSV
        const lines = fileContent.split('\n')
        const headers = lines[0].split(',')
        dataset = lines.slice(1).map(line => {
          const values = line.split(',')
          return Object.fromEntries(headers.map((h, i) => [h.trim(), values[i]?.trim()]))
        }).filter(row => Object.values(row).some(v => v))
      }

      // Parse sensitive attributes
      const attrs = sensitiveAttributes.split(',').map(a => a.trim()).filter(a => a)

      const response = await axios.post('/api/bias-detection', {
        dataset,
        sensitive_attributes: attrs,
        decision_attribute: decisionAttribute
      })

      if (response.data.status === 'success') {
        setBiasResults(response.data)
      } else {
        setError('Failed to analyze bias')
      }
    } catch (err) {
      setError(
        err.response?.data?.detail || 
        err.message || 
        'An error occurred while analyzing bias'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bias-detection">
      <div className="card">
        <div className="bias-header">
          <Shield size={32} color="#6366f1" />
          <div>
            <h2 className="section-title">Bias & Inequality Detection</h2>
            <p className="text-light">
              Upload your decision dataset to detect potential bias based on sensitive attributes
            </p>
          </div>
        </div>

        <div className="form-group">
          <label>Upload Dataset (JSON or CSV)</label>
          <input
            type="file"
            accept=".json,.csv"
            onChange={handleFileChange}
            className="input"
          />
          {file && <p className="file-name">Selected: {file.name}</p>}
        </div>

        <div className="form-group">
          <label>
            Sensitive Attributes <span className="hint">(comma-separated, e.g., gender, region, income)</span>
          </label>
          <input
            type="text"
            value={sensitiveAttributes}
            onChange={(e) => setSensitiveAttributes(e.target.value)}
            placeholder="gender, region, income_level"
            className="input"
          />
        </div>

        <div className="form-group">
          <label>Decision Attribute</label>
          <input
            type="text"
            value={decisionAttribute}
            onChange={(e) => setDecisionAttribute(e.target.value)}
            placeholder="approved"
            className="input"
          />
          <span className="hint">The column that represents the decision outcome (e.g., approved, hired)</span>
        </div>

        {error && (
          <div className="error">
            <AlertTriangle size={20} />
            <span>{error}</span>
          </div>
        )}

        <button
          className="btn btn-primary"
          onClick={handleAnalyze}
          disabled={!file || loading}
        >
          {loading ? 'Analyzing...' : 'Analyze for Bias'}
        </button>

        {/* Sample Format */}
        <div className="sample-format">
          <h3 className="subtitle">Sample JSON Format:</h3>
          <pre>
{`[
  {
    "gender": "male",
    "region": "urban",
    "income_level": "high",
    "approved": 1
  },
  {
    "gender": "female",
    "region": "rural",
    "income_level": "low",
    "approved": 0
  }
]`}
          </pre>
        </div>
      </div>

      {/* Bias Results */}
      {biasResults && (
        <div className="bias-results">
          <div className="card">
            <h3 className="subtitle">Bias Analysis Results</h3>
            
            <div className={`bias-alert ${biasResults.bias_analysis.bias_detected ? 'alert-danger' : 'alert-success'}`}>
              {biasResults.bias_analysis.bias_detected ? (
                <AlertTriangle size={24} />
              ) : (
                <CheckCircle size={24} />
              )}
              <div>
                <strong>{biasResults.bias_analysis.summary}</strong>
                <p>Severity: {biasResults.bias_analysis.severity}</p>
              </div>
            </div>

            {/* Bias Metrics */}
            {Object.entries(biasResults.bias_analysis.bias_metrics || {}).map(([attr, analysis]) => (
              <div key={attr} className="bias-metric-card">
                <h4 className="metric-title">{attr.toUpperCase()}</h4>
                
                <div className="metric-details">
                  <div className="metric-item">
                    <span>Disparity Ratio:</span>
                    <strong>{analysis.disparity_ratio}</strong>
                  </div>
                  <div className="metric-item">
                    <span>Disparity %:</span>
                    <strong>{analysis.disparity_percentage}%</strong>
                  </div>
                  <div className="metric-item">
                    <span>Bias Level:</span>
                    <strong className={`bias-level-${analysis.bias_level}`}>
                      {analysis.bias_level.toUpperCase()}
                    </strong>
                  </div>
                </div>

                {/* Group Statistics */}
                <div className="group-stats">
                  <h5>Group Statistics:</h5>
                  {Object.entries(analysis.group_statistics || {}).map(([group, stats]) => (
                    <div key={group} className="group-stat-item">
                      <span className="group-name">{group}</span>
                      <span className="group-rate">{stats.positive_rate}% positive rate</span>
                      <span className="group-count">({stats.total} total)</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Recommendations */}
            {biasResults.recommendations && biasResults.recommendations.length > 0 && (
              <div className="recommendations-section">
                <h4 className="subtitle">Recommendations</h4>
                <ul className="recommendation-list">
                  {biasResults.recommendations.map((rec, index) => (
                    <li key={index} className="recommendation-item">
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default BiasDetection

