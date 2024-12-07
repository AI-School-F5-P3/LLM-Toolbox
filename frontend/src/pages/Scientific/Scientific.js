import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './Scientific.css';
import { MessageCircle, Minimize2, Send } from 'lucide-react';

function Scientific() {
  const [query, setQuery] = useState('');
  const [maxResults, setMaxResults] = useState(10);
  const [papers, setPapers] = useState([]);
  const [selectedPapers, setSelectedPapers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stage, setStage] = useState('search');
  const [indexExists, setIndexExists] = useState(false);

  // New chat state
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState([]);

  const messagesEndRef = useRef(null);

  // Existing useEffect for checking index
  useEffect(() => {
    const checkExistingIndex = async () => {
      try {
        const response = await axios.get('http://localhost:8000/arxiv/existing_index');
        setIndexExists(response.data.index_exists);
      } catch (err) {
        console.error('Error checking index:', err);
      }
    };
    checkExistingIndex();
  }, []);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !indexExists) return;

    const userMessage = { text: chatInput, type: 'user' };
    setMessages(prev => [...prev, userMessage]);
    
    try {
      const response = await axios.post('http://localhost:8000/arxiv/chat', {
        query: chatInput
      });

      const botMessage = { text: response.data.response, type: 'bot' };
      setMessages(prev => [...prev, botMessage]);
    } catch (err) {
      const errorMessage = { 
        text: err.response?.data?.detail || 'Error in chat', 
        type: 'bot' 
      };
      setMessages(prev => [...prev, errorMessage]);
    }

    setChatInput('');
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setPapers([]);

    try {
      const response = await axios.post('http://localhost:8000/arxiv/search', {
        query,
        max_results: maxResults
      });

      setPapers(response.data.papers);
      setStage('process');
    } catch (err) {
      setError(err.response?.data?.detail || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handlePaperSelection = (filename) => {
    setSelectedPapers(prev => 
      prev.includes(filename)
        ? prev.filter(f => f !== filename)
        : [...prev, filename]
    );
  };

  const processPapers = async () => {
    if (selectedPapers.length === 0) {
      setError('Please select at least one paper');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await axios.post('http://localhost:8000/arxiv/process_papers', {
        filenames: selectedPapers
      });

      setStage('search');
      setIndexExists(true);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error processing papers');
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    switch(stage) {
      case 'search':
        return (
          <form onSubmit={handleSearch} className="search-form">
            <input 
              type="text" 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter search topic (e.g., quantum computing)"
              required
            />
            <div className="results-control">
              <label>
                Max Results: {maxResults}
                <input 
                  type="range" 
                  min="1" 
                  max="50" 
                  value={maxResults}
                  onChange={(e) => setMaxResults(Number(e.target.value))}
                />
              </label>
            </div>
            <button type="submit" disabled={loading}>
              {loading ? 'Searching...' : 'Search Papers'}
            </button>
          </form>
        );

      case 'process':
        return (
          <div className="paper-selection">
            <h2>Select Papers to Process</h2>
            {papers.map((paper, index) => (
              <div key={index} className="paper-selection-item">
                <input 
                  type="checkbox"
                  id={`paper-${index}`}
                  checked={selectedPapers.includes(paper.filename)}
                  onChange={() => handlePaperSelection(paper.filename)}
                />
                <label htmlFor={`paper-${index}`}>
                  {paper.title}
                </label>
              </div>
            ))}
            <button 
              onClick={processPapers} 
              disabled={loading || selectedPapers.length === 0}
            >
              {loading ? 'Processing...' : 'Process Selected Papers'}
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="scientific-page">
      <div className="scientific">
        <h1>Scientific Research Assistant</h1>
        
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {renderContent()}

        {indexExists && (
          <>
            {!isChatOpen && (
              <button 
                className="chat-toggle" 
                onClick={() => setIsChatOpen(true)}
              >
                <MessageCircle size={20} /> Chat
              </button>
            )}

            {isChatOpen && (
              <div className="chat-container active">
                <div className="chat-header">
                  <div className="chat-header-title">
                    <MessageCircle size={16} />
                    <h3>Research Chat</h3>
                  </div>
                  <button 
                    className="minimize-chat" 
                    onClick={() => setIsChatOpen(false)}
                  >
                    <Minimize2 size={16} />
                  </button>
                </div>
                
                <div className="chat-messages">
                  {messages.map((msg, index) => (
                    <div 
                      key={index} 
                      className={`message ${msg.type}`}
                    >
                      {msg.text}
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
                
                <form 
                  className="chat-input-form"
                  onSubmit={handleChatSubmit}
                >
                  <input 
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask about the papers..."
                    disabled={!indexExists}
                  />
                  <button type="submit" disabled={!indexExists}>
                    <Send size={16} />
                  </button>
                </form>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default Scientific;
