import React from 'react'
import { Award, TrendingUp, TrendingDown } from 'lucide-react'
import './ScoreDisplay.css'

function ScoreDisplay({ score }) {
  const scoreValue = score?.score || 0
  const spenderRating = score?.spender_rating || 'Moderate Spender'
  const interpretation = score?.interpretation || ''
  const recommendations = score?.recommendations || []

  const getScoreClass = () => {
    if (scoreValue >= 8.5) return 'score-excellent'
    if (scoreValue >= 7.0) return 'score-good'
    if (scoreValue >= 5.5) return 'score-fair'
    return 'score-poor'
  }

  const getRatingBadgeClass = () => {
    if (spenderRating === 'Wise Spender') return 'rating-badge-wise'
    if (spenderRating === 'Moderate Spender') return 'rating-badge-moderate'
    return 'rating-badge-over'
  }

  return (
    <div className="score-display card">
      <div className="score-header">
        <Award size={32} color="#6366f1" />
        <h2 className="section-title">Smart Spending Score</h2>
      </div>
      
      <div className="score-content">
        <div className={`score-circle ${getScoreClass()}`}>
          <div>
            <div className="score-value">{scoreValue.toFixed(1)}</div>
            <div className="score-max">/ 10</div>
          </div>
        </div>
        
        <div className={`rating-badge ${getRatingBadgeClass()}`}>
          {spenderRating}
        </div>
        
        <div className="score-interpretation">
          <p className="interpretation-text">{interpretation}</p>
        </div>
      </div>

      {recommendations.length > 0 && (
        <div className="recommendations">
          <h3 className="subtitle">Recommendations</h3>
          <ul className="recommendation-list">
            {recommendations.map((rec, index) => (
              <li key={index} className="recommendation-item">
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export default ScoreDisplay

