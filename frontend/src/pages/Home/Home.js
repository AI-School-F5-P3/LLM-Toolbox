import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './Home.css';

// Constants for model names - matching exactly with backend expectations
const MODELS = {
  LLAMA: 'Llama Meta',
  OPENAI: 'OpenAI'
};

function Home() {
  const [currentModel, setCurrentModel] = useState('');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleModelChange = async (e) => {
    const selectedModel = e.target.value;
    if (!selectedModel) return;
    
    setCurrentModel(selectedModel);
    setIsLoading(true);
    setError(null);

    try {
      const result = await setModelDefinition(selectedModel);
      if (result.status === 'error') {
        throw new Error(result.message);
      }
      console.log(result.message);
    } catch (error) {
      setError(error.message || 'Failed to switch model. Please try again.');
      setCurrentModel(''); // Reset selection on error
    } finally {
      setIsLoading(false);
    }
  };

  const setModelDefinition = async (modelName) => {
    const endpoint = 'http://localhost:8000/model_def';

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model_name: modelName
        })
      });
      
      const result = await response.json();
      return result;

    } catch (error) {
      console.error('Error setting model definition:', error);
      throw new Error('Failed to communicate with the server. Please try again.');
    }
  };

  const renderLoading = () => (
    isLoading && <div className="loading-indicator">Switching model...</div>
  );

  const renderError = () => (
    error && <div className="error-message">{error}</div>
  );

  const renderSuccess = () => (
    currentModel && !error && !isLoading && (
      <div className="success-message">
        Currently using: {currentModel}
      </div>
    )
  );

  return (
    <div className="home">
      <section className="hero">
        <div className="hero-content">
          <h1>Welcome to the LLM Toolbox</h1>
          <h2>Try the different generation possibilities</h2>
          <Link 
            to="/blog" 
            className="cta-button"
            aria-label="Start using the LLM Toolbox"
          >
            Start
          </Link>
        </div>
      </section>

      <section className="model-selection">
        <label htmlFor="model-select" className="text-center">Choose a Model for Generation</label>
        <select
          id="model-select"
          value={currentModel}
          onChange={handleModelChange}
          disabled={isLoading}
          className={`model-select ${isLoading ? 'loading' : ''}`}
          aria-busy={isLoading}
        >
          <option value="">Models :</option>
          <option value={MODELS.LLAMA}>{MODELS.LLAMA}</option>
          <option value={MODELS.OPENAI}>{MODELS.OPENAI}</option>
        </select>
      
      </section>
    </div>
  );
}

export default Home;