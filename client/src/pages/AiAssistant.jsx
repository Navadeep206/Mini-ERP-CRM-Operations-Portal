import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, RefreshCw, Sparkles, Database, Brain, Search, Info, HelpCircle } from 'lucide-react';
import { aiService } from '../services/ai';

export default function AiAssistant() {
  const [question, setQuestion] = useState('');
  const [chatLog, setChatLog] = useState([
    {
      sender: 'ai',
      text: 'Hello! I am your Mini ERM Operations Assistant. You can ask me questions about active products count, low stock items, similar product searches, or forecasted inventory risk reports.',
      timestamp: new Date().toLocaleTimeString(),
      sources: null
    }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const chatEndRef = useRef(null);

  // Auto scroll to latest messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatLog]);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!question.trim() || isSubmitting) return;

    const userText = question.trim();
    setQuestion('');
    setErrorMsg('');
    setIsSubmitting(true);

    // Append user query to log
    setChatLog(prev => [...prev, {
      sender: 'user',
      text: userText,
      timestamp: new Date().toLocaleTimeString()
    }]);

    try {
      const res = await aiService.askAssistant(userText);
      
      // Append AI response
      setChatLog(prev => [...prev, {
        sender: 'ai',
        text: res.answer || 'I could not retrieve an answer for this.',
        timestamp: new Date().toLocaleTimeString(),
        sources: res.sources
      }]);
    } catch (err) {
      setErrorMsg(err.message || 'Error executing assistant query. Make sure the backend server is active.');
      setChatLog(prev => [...prev, {
        sender: 'ai',
        text: 'Sorry, I encountered a communication error trying to connect to the operations engine. Please make sure the service is online.',
        timestamp: new Date().toLocaleTimeString(),
        isError: true
      }]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSuggestClick = (suggestion) => {
    setQuestion(suggestion);
  };

  const suggestions = [
    "How many products do we have?",
    "Which products are low in stock?",
    "Which products may run out next week?",
    "Find products similar to Shirts"
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: 'calc(100vh - 120px)' }}>
      {/* Title block */}
      <div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Sparkles style={{ color: 'var(--accent-cyan)' }} size={24} />
          <span>AI Operations Assistant</span>
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
          Retrieval-Augmented Generation (RAG) agent integrating relational inventory records, local vector indices, and time-series forecasts.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '3fr 1.25fr', gap: '24px', flex: 1, minHeight: 0 }}>
        
        {/* Chat window panel */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', padding: '20px', minHeight: 0 }}>
          {/* Messages list */}
          <div style={{ flex: 1, overflowY: 'auto', paddingRight: '8px', display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '20px' }}>
            {chatLog.map((msg, index) => (
              <div 
                key={index} 
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start'
                }}
              >
                {/* Message Header info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px', paddingLeft: msg.sender === 'user' ? 0 : '8px' }}>
                  {msg.sender === 'ai' ? (
                    <>
                      <Bot size={14} style={{ color: msg.isError ? 'var(--danger)' : 'var(--accent-cyan)' }} />
                      <strong style={{ color: 'var(--text-secondary)' }}>Operations AI</strong>
                    </>
                  ) : (
                    <strong>You</strong>
                  )}
                  <span>•</span>
                  <span>{msg.timestamp}</span>
                </div>

                {/* Message content bubble */}
                <div 
                  style={{ 
                    backgroundColor: msg.sender === 'user' ? 'rgba(6,182,212,0.15)' : 'rgba(255,255,255,0.02)',
                    border: msg.sender === 'user' ? '1px solid var(--primary)' : '1px solid var(--border-glass)',
                    color: msg.isError ? 'var(--danger)' : 'var(--text-primary)',
                    borderRadius: msg.sender === 'user' ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                    padding: '14px 18px',
                    fontSize: '0.9rem',
                    lineHeight: '1.5',
                    whiteSpace: 'pre-wrap'
                  }}
                >
                  {msg.text}
                </div>

                {/* Metadata source pills (AI responses only) */}
                {msg.sender === 'ai' && msg.sources && (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px', paddingLeft: '8px' }}>
                    <span 
                      style={{ 
                        fontSize: '0.7rem', 
                        padding: '2px 8px', 
                        borderRadius: '4px', 
                        backgroundColor: 'rgba(255,255,255,0.03)', 
                        border: '1px solid var(--border-glass)',
                        color: 'var(--text-secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      {msg.sources.routedPath === 'DATABASE_STATS' && (
                        <>
                          <Database size={12} style={{ color: 'var(--success)' }} />
                          <span>Structured Database Router</span>
                        </>
                      )}
                      {msg.sources.routedPath === 'VECTOR_SEARCH' && (
                        <>
                          <Search size={12} style={{ color: 'var(--accent-cyan)' }} />
                          <span>Semantic Vector Database</span>
                        </>
                      )}
                      {msg.sources.routedPath === 'ML_FORECAST_RISK' && (
                        <>
                          <Brain size={12} style={{ color: 'var(--primary)' }} />
                          <span>AI Demand Forecasting</span>
                        </>
                      )}
                      {msg.sources.routedPath === 'COMBINED' && (
                        <>
                          <Sparkles size={12} style={{ color: 'var(--warning)' }} />
                          <span>Combined Intelligence Context</span>
                        </>
                      )}
                    </span>
                  </div>
                )}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Form input field */}
          <form onSubmit={handleSubmit} style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '16px', display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Ask about active products, low stock, or forecasted risk projections..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                disabled={isSubmitting}
                style={{ width: '100%', paddingRight: '40px', marginTop: 0 }}
                required
              />
              {isSubmitting && (
                <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                  <RefreshCw size={16} className="spin" />
                </div>
              )}
            </div>
            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={isSubmitting || !question.trim()}
              style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '8px', padding: '0 20px', marginTop: 0 }}
            >
              <Send size={16} />
              <span>Ask AI</span>
            </button>
          </form>

          {errorMsg && (
            <div style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Info size={14} />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Suggestion list panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '10px', color: 'var(--accent-cyan)' }}>
              <HelpCircle size={18} />
              <span>Suggested Queries</span>
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {suggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSuggestClick(suggestion)}
                  disabled={isSubmitting}
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.01)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: 'var(--border-radius-md)',
                    padding: '12px',
                    textAlign: 'left',
                    fontSize: '0.82rem',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    lineHeight: '1.4'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--primary)';
                    e.currentTarget.style.backgroundColor = 'rgba(6,182,212,0.03)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-glass)';
                    e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.01)';
                  }}
                >
                  "{suggestion}"
                </button>
              ))}
            </div>
          </div>

          <div className="glass-card" style={{ padding: '20px', fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: '1.5', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <h4 style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>How grounding works:</h4>
            <p>Your questions are routed to specialized search adapters. Relational statistics use Prisma DB queries, text keywords trigger cosine similarity document matching, and risk alerts integrate Python forecasting results.</p>
          </div>
        </div>

      </div>
    </div>
  );
}
