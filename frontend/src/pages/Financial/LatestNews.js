import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';

const LatestNews = () => {
  const [sectorOrCountry, setSectorOrCountry] = useState('');
  const [newsResponse, setNewsResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    setIsLoading(true);
    setNewsResponse(''); // Reset previous response
    try {
      const response = await fetch('http://localhost:8000/latest_news', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          sector_or_country: sectorOrCountry 
        }),
      });
      
      const data = await response.json();
      setNewsResponse(data.news || 'No news available');
    } catch (error) {
      console.error('Error:', error);
      setNewsResponse('Error processing your request');
    }
    setIsLoading(false);
  };

  const handleDownload = () => {
    const element = document.createElement('a');
    const file = new Blob([newsResponse], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = 'financial_news.txt';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="latest-news-container mt-8">
      <div className="bg-white shadow-md rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-4">Latest Financial News</h2>
        <div className="space-y-4">
          <input 
            type="text" 
            placeholder="Enter Sector or Country" 
            value={sectorOrCountry}
            onChange={(e) => setSectorOrCountry(e.target.value)}
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button 
            onClick={handleSubmit} 
            disabled={isLoading || !sectorOrCountry}
            className="w-full bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600 disabled:bg-gray-300"
          >
            {isLoading ? 'Fetching News...' : 'Get Latest News'}
          </button>
          
          <div className="markdown-content">
            <ReactMarkdown>{newsResponse}</ReactMarkdown>
          </div>
          
          {newsResponse && (
            <button 
              onClick={handleDownload}
              className="w-full bg-gray-200 text-black py-2 rounded-md hover:bg-gray-300"
            >
              Download News
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default LatestNews;