import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import './Post.css';

function Post() {
  const [userInput, setUserInput] = useState('');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [images, setImages] = useState([]);
  const [isImageLoading, setIsImageLoading] = useState(false);

  const handleSubmit = async () => {
    setIsLoading(true);
    setError(null);
    setImages([]);
    try {
      const response = await fetch('http://localhost:8000/posts_request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: userInput }),
      });
      
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      
      const data = await response.json();
      setResponse(data.message);
    } catch (error) {
      console.error('Error:', error);
      setError('Error processing your request');
    }
    setIsLoading(false);
  };

  const handleDownload = () => {
    if (!response) return;

    const blob = new Blob([response], { type: 'text/markdown' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    
    const filename = userInput 
      ? `${userInput.slice(0, 20).replace(/[^a-z0-9]/gi, '_')}.md`
      : 'social_post.md';
    
    link.download = filename;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(link.href);
  };

  const handleImageGeneration = async () => {
    if (!response) {
      setError("Please generate a post first.");
      return;
    }
    setIsImageLoading(true);
    setError(null);
    try {
      const imageResponse = await fetch('http://localhost:8000/images_request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: response }),
      });
      if (!imageResponse.ok) {
        throw new Error("Failed to fetch images. Check your backend or network.");
      }
      const data = await imageResponse.json();
      if (Array.isArray(data.message)) {
        setImages(data.message);
      } else if (typeof data.message === 'string') {
        const parsedUrls = JSON.parse(data.message.replace(/'/g, '"'));
        setImages(parsedUrls);
      } else {
        throw new Error("Unexpected response format from the server.");
      }
    } catch (error) {
      console.error('Error fetching images:', error);
      setError("An error occurred while fetching images. Please try again.");
    }
    setIsImageLoading(false);
  };

  return (
    <div className="post-container">
      <div className="post-header">
        <h1>Social Media Post Generator</h1>
        <p className="post-subtitle">Share your subject with our AI</p>
      </div>

      <div className="post-content-wrapper">
        <div className="post-input-section">
          <textarea
            className="post-input"
            placeholder="Enter your social media post subject here..."
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
          />
          <button 
            className={`post-submit-button ${isLoading ? 'post-loading' : ''}`}
            onClick={handleSubmit}
            disabled={isLoading || !userInput.trim()}
          >
            {isLoading ? 'Generating...' : 'Generate Post'}
          </button>
        </div>

        <div className="post-response-section">
          {isLoading ? (
            <div className="post-loading-indicator">Generating post...</div>
          ) : error ? (
            <div className="post-error-message">{error}</div>
          ) : response ? (
            <>
              <div className="post-response-content">
                <ReactMarkdown>{response}</ReactMarkdown>
              </div>
              <button 
                className="post-download-button"
                onClick={handleDownload}
              >
                Download Markdown
              </button>
              <button
                className="post-generate-images-button"
                onClick={handleImageGeneration}
                disabled={isImageLoading}
              >
                {isImageLoading ? 'Generating Images...' : 'Generate Images'}
              </button>
            </>
          ) : (
            <div className="post-placeholder-text">
              Your generated social media post will appear here...
            </div>
          )}
        </div>
      </div>

      {images.length > 0 && (
        <div className="post-images-container">
          <h2>Generated Images</h2>
          <div className="post-image-grid">
            {images.map((imageUrl, index) => (
              <img 
                key={index} 
                src={imageUrl} 
                alt={`Generated image ${index + 1}`} 
                className="post-generated-image"
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Post;