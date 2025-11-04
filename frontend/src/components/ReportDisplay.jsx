import React, { useState } from 'react'
import { FileText, ChevronDown, ChevronUp } from 'lucide-react'
import './ReportDisplay.css'

function ReportDisplay({ report }) {
  const [expanded, setExpanded] = useState(true)

  if (!report) return null

  const { full_report, summary, sections } = report

  return (
    <div className="report-display card">
      <div className="report-header" onClick={() => setExpanded(!expanded)}>
        <div className="report-title">
          <FileText size={24} color="#6366f1" />
          <h3 className="subtitle">Your Personalized Spending Report</h3>
        </div>
        {expanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
      </div>

      {expanded && (
        <div className="report-content">
          <div className="report-summary">
            <strong>Summary:</strong> {summary}
          </div>
          
          <div className="divider" />
          
          <div className="report-text">
            {full_report.split('\n\n').map((paragraph, index) => (
              <p key={index} className="report-paragraph">
                {paragraph}
              </p>
            ))}
          </div>

          {sections && (
            <div className="report-sections">
              {Object.entries(sections).map(([key, value]) => {
                if (!value) return null
                if (Array.isArray(value)) {
                  return (
                    <div key={key} className="section-block">
                      <h4 className="section-name">{key.replace('_', ' ').toUpperCase()}</h4>
                      <ul>
                        {value.map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )
                }
                return (
                  <div key={key} className="section-block">
                    <h4 className="section-name">{key.replace('_', ' ').toUpperCase()}</h4>
                    <p>{value}</p>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default ReportDisplay

