import React, { useState, useEffect, useRef } from 'react'
import { MessageCircle, X, Send } from 'lucide-react'
import './Chatbot.css'

function Chatbot({ user, accountType = 'personal' }) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)

  const [hasWelcomed, setHasWelcomed] = useState(false)

  useEffect(() => {
    if (isOpen && user?.id && !hasWelcomed) {
      setHasWelcomed(true)
      fetchHistory()
      // Add welcome message
      setMessages(prev => [...prev, { 
        text: `Hello ${user?.full_name || user?.username || 'there'}! I'm the OpenAudit assistant. I can help you with questions about your financial analysis, history, smart scores, and more. Try asking: "What's my smart score?" or "Show my history"`, 
        sender: 'bot', 
        timestamp: new Date() 
      }])
    }
  }, [isOpen, user?.id])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const fetchHistory = async () => {
    if (!user?.id) return
    
    setLoading(true)
    try {
      const endpoint = accountType === 'company' 
        ? `/api/company/history/${user.id}`
        : `/api/personal/history/${user.id}`
      
      const response = await fetch(endpoint)
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

  const addMessage = (text, sender = 'bot') => {
    setMessages(prev => [...prev, { text, sender, timestamp: new Date() }])
  }

  const findMatch = (text) => {
    const intents = {
      greetings: [/^hi|^hello|hey|good (morning|afternoon|evening)/i],
      name: [/what.*my name|who am i|my name|tell.*name/i],
      smartScore: [/smart score|score\b|what.?score|rating\b|my score/i],
      topCategory: [/top category|largest category|which category|top_cat|biggest category/i],
      recommendations: [/recommend|advice|suggest|what should|recommendations|suggestions/i],
      history: [/history|previous|past analyses|my analyses|show.*history/i],
      totalTransactions: [/total transactions|how many transactions|transactions count|number of transactions/i],
      totalAmount: [/total amount|how much total|total value|amount analyzed|total spent/i],
      help: [/help|what can you do|commands|what.*ask/i]
    }

    text = text.trim()
    for (const [key, patterns] of Object.entries(intents)) {
      for (const pattern of patterns) {
        if (pattern.test(text)) return key
      }
    }
    return null
  }

  const formatCurrency = (amount) => {
    try {
      return `₹${Number(amount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
    } catch (e) {
      return amount
    }
  }

  const botAnswer = (userText) => {
    const intent = findMatch(userText)
    
    // Get latest analysis if available
    const latestAnalysis = history.length > 0 ? history[0] : null
    const smartScore = latestAnalysis?.smart_score || {}
    const insights = latestAnalysis?.insights || {}
    
    if (intent === 'greetings') {
      return `Hello ${user?.full_name || user?.username || 'there'}! I'm the OpenAudit assistant. I can help you with questions about your financial analysis, history, smart scores, and more. Try asking: "What's my smart score?" or "Show my history"`
    }

    if (intent === 'name') {
      const name = user?.full_name || user?.username || 'User'
      return `Your name is ${name}. You're using the ${accountType === 'company' ? 'Company' : 'Personal'} portal.`
    }

    if (intent === 'smartScore') {
      if (!latestAnalysis || !smartScore.score) {
        return "I don't have your smart score data yet. Please upload and analyze your financial data first."
      }
      return `Your Smart Score is ${smartScore.score}/${smartScore.max_score || 10}. Rating: ${smartScore.spender_rating || 'N/A'}. ${smartScore.interpretation || ''}`
    }

    if (intent === 'topCategory') {
      if (!insights.category_breakdown || Object.keys(insights.category_breakdown).length === 0) {
        return "I don't have category data yet. Please analyze your spending data first."
      }
      const categories = Object.entries(insights.category_breakdown)
      const top = categories.sort((a, b) => (b[1].amount || 0) - (a[1].amount || 0))[0]
      if (top) {
        return `Your top spending category is **${top[0]}** at ${top[1].percentage?.toFixed(1) || 0}% (${formatCurrency(top[1].amount || 0)}).`
      }
      return "No category data available."
    }

    if (intent === 'recommendations') {
      if (!smartScore.recommendations || smartScore.recommendations.length === 0) {
        return "No recommendations available yet. Please analyze your spending data first."
      }
      return `Recommendations:\n${smartScore.recommendations.map(r => `• ${r}`).join('\n')}`
    }

    if (intent === 'history') {
      if (history.length === 0) {
        return "You don't have any analysis history yet. Please upload and analyze your financial data first."
      }
      const total = history.length
      const latest = history[0]
      const latestDate = latest?.created_at ? new Date(latest.created_at).toLocaleDateString() : 'N/A'
      return `You have ${total} ${total === 1 ? 'analysis' : 'analyses'} in your history. Your most recent analysis was on ${latestDate}. ${latest?.total_transactions ? `It had ${latest.total_transactions} transactions totaling ${formatCurrency(latest.total_amount || 0)}.` : ''}`
    }

    if (intent === 'totalTransactions') {
      if (!latestAnalysis) {
        return "No analysis data available. Please analyze your spending first."
      }
      const count = latestAnalysis.total_transactions || 0
      return `Your latest analysis has ${count} ${count === 1 ? 'transaction' : 'transactions'}.`
    }

    if (intent === 'totalAmount') {
      if (!latestAnalysis) {
        return "No analysis data available. Please analyze your spending first."
      }
      const amount = latestAnalysis.total_amount || 0
      return `Total amount analyzed in your latest analysis: ${formatCurrency(amount)}.`
    }

    if (intent === 'help') {
      return `I can answer questions about:
• Your name and account info
• Smart scores and ratings
• Top spending categories
• Recommendations
• Analysis history
• Total transactions and amounts

Try asking: "What's my smart score?", "Show my history", or "What's my top category?"`
    }

    // Fallback
    return `I'm not sure how to answer that. Try asking about your smart score, history, top categories, or recommendations. You can also say "help" to see what I can do.`
  }

  const handleSend = (e) => {
    e.preventDefault()
    if (!inputValue.trim()) return

    const userMessage = inputValue.trim()
    addMessage(userMessage, 'user')
    setInputValue('')

    // Simulate typing delay
    setTimeout(() => {
      const response = botAnswer(userMessage)
      addMessage(response, 'bot')
    }, 350)
  }

  const handleClose = () => {
    setIsOpen(false)
    setHasWelcomed(false)
    setMessages([])
  }

  return (
    <>
      {/* Launcher Button */}
      <div className="oa-launcher">
        <button 
          className="oa-button" 
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Open OpenAudit chat"
        >
          <MessageCircle size={24} />
        </button>
      </div>

      {/* Chat Window */}
      <aside 
        className={`oa-chat ${isOpen ? 'open' : 'closed'}`}
        role="dialog"
        aria-label="OpenAudit chat widget"
      >
        <header className="oa-header">
          <div>
            <div className="oa-title">OpenAudit Assistant</div>
            <div className="oa-sub">Ask me about your analysis or say hi 👋</div>
          </div>
          <button 
            className="oa-close" 
            onClick={handleClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </header>

        <div className="oa-messages" aria-live="polite">
          {messages.map((msg, idx) => (
            <div key={idx} className={`msg ${msg.sender}`}>
              {msg.text.split('\n').map((line, i) => (
                <React.Fragment key={i}>
                  {line}
                  {i < msg.text.split('\n').length - 1 && <br />}
                </React.Fragment>
              ))}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="hint">
          You can ask: "what's my smart score?", "show my history", "top category", or say "hello"
        </div>

        <form className="oa-input" onSubmit={handleSend}>
          <input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type a question..."
            aria-label="Chat input"
            autoComplete="off"
          />
          <button type="submit" className="oa-send-btn">
            <Send size={18} />
          </button>
        </form>
      </aside>
    </>
  )
}

export default Chatbot

