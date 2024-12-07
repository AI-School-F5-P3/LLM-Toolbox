import React, { useState } from 'react';
import LatestNews from './LatestNews';
import StockAnalysis from './StockAnalysis';
import './Financial.css';

const Financial = () => {
  const [selectedOption, setSelectedOption] = useState('');

  const handleOptionChange = (e) => {
    setSelectedOption(e.target.value);
  };

  return (
    <div className="financial-container">
      <div className="financial-header">
        <h1 className="text-3xl font-bold text-center mb-4">Financial News and Stock Analysis</h1>
        <p className="text-xl text-center text-gray-600 mb-8">Obtain the Latest Financial Insights</p>
      </div>

      <div className="bg-white shadow-md rounded-lg p-6 max-w-2xl mx-auto">
        <h2 className="text-xl font-semibold mb-4">Select Option</h2>
        <select 
          value={selectedOption}
          onChange={handleOptionChange}
          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Choose an analysis type</option>
          <option value="latest-news">Latest News</option>
          <option value="stock-analysis">Stock Analysis</option>
        </select>
      </div>

      {selectedOption === 'latest-news' && <LatestNews />}
      {selectedOption === 'stock-analysis' && <StockAnalysis />}
    </div>
  );
};

export default Financial;
