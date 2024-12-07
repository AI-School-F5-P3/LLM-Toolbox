import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import './Blog.css';

const Blog = () => {
  const [userInput, setUserInput] = useState('');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [images, setImages] = useState([]); // New state for images
  const [isImageLoading, setIsImageLoading] = useState(false); // New state for image loading

  const handleSubmit = async () => {
    setIsLoading(true);
    setImages([]); // Reset images when generating a new blog post
    try {
      const response = await fetch('http://localhost:8000/blog_request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: userInput }),
      });
      
      const data = await response.json();
      setResponse(data.message);
    } catch (error) {
      console.error('Error:', error);
      setResponse('Error processing your request');
    }
    setIsLoading(false);
  };

  const handleDownload = () => {
    const element = document.createElement('a');
    const file = new Blob([response], {type: 'text/markdown'});
    element.href = URL.createObjectURL(file);
    element.download = 'blog_post.md';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleImageGeneration = async () => {
    if (!response) {
      alert("Please generate a blog post first.");
      return;
    }
    
    setIsImageLoading(true);
    try {
      const imageResponse = await fetch('http://localhost:8000/images_request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: response }), // Send blog post content for image generation
      });
      
      if (!imageResponse.ok) {
        throw new Error("Failed to fetch images. Check your backend or network.");
      }
      
      const data = await imageResponse.json();
      
      // Handle different possible response formats
      if (Array.isArray(data.message)) {
        setImages(data.message);
      } else if (typeof data.message === 'string') {
        // If the message is a stringified list of URLs
        const parsedUrls = JSON.parse(data.message.replace(/'/g, '"'));
        setImages(parsedUrls);
      } else {
        alert("Unexpected response format from the server.");
      }
    } catch (error) {
      console.error('Error fetching images:', error);
      alert("An error occurred while fetching images. Please try again.");
    }
    setIsImageLoading(false);
  };

  return (
    <div className="blog-container">
      <div className="blog-header">
        <h1>Blog Post Generator</h1>
        <p className="blog-subtitle">Share your subject with our AI</p>
      </div>

      <div className="blog-content-wrapper">
        <div className="blog-input-section">
          <textarea
            className="blog-input"
            placeholder="Enter your blog post subject here..."
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
          />
          <button 
            className="blog-submit-button"
            onClick={handleSubmit}
            disabled={isLoading || !userInput.trim()}
          >
            {isLoading ? 'Generating...' : 'Generate Blog Post'}
          </button>
        </div>

        <div className="blog-response-section">
          <div className="blog-response-content">
            {response ? (
              <>
                <ReactMarkdown>{response}</ReactMarkdown>
                <div className="blog-actions">
                  <button
                    className="blog-download-button"
                    onClick={handleDownload}
                    disabled={!response}
                  >
                    Download Markdown
                  </button>
                  <button 
                    className="blog-generate-images-button"
                    onClick={handleImageGeneration}
                    disabled={isImageLoading}
                  >
                    {isImageLoading ? 'Generating Images...' : 'Generate Images'}
                  </button>
                </div>
              </>
            ) : (
              'Your generated blog post will appear here...'
            )}
          </div>
        </div>
      </div>

      {/* Image display section */}
      {images.length > 0 && (
        <div className="blog-images-container">
          <h2>Generated Images</h2>
          <div className="blog-image-grid">
            {images.map((image, index) => (
              <img
                key={index}
                src={image}
                alt={`Generated image ${index + 1}`}
                className="blog-generated-image"
                onError={(e) => {
                  e.target.src = 'https://via.placeholder.com/300'; // Fallback image
                  console.error('Error loading image:', image);
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Blog;