import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Loader2 } from 'lucide-react';

const StockAnalysis = () => {
  const [stockSymbol, setStockSymbol] = useState('');
  const [analysisResponse, setAnalysisResponse] = useState('');
  const [chartUrl, setChartUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchFundamentalAnalysis = async (symbol) => {
    try {
      const response = await fetch('http://localhost:8000/fundamental_analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          ticker: symbol.trim().toUpperCase()
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to fetch fundamental analysis');
      }
      
      const data = await response.json();
      return data.analysis;
    } catch (error) {
      console.error('Fundamental analysis error:', error);
      throw new Error(`Analysis failed: ${error.message}`);
    }
  };

  const fetchChart = async (symbol) => {
    try {
      const response = await fetch('http://localhost:8000/api/generate-chart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          ticker: symbol.trim().toUpperCase()
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate chart');
      }
      
      // Create a temporary URL for the image blob
      const imageBlob = await response.blob();
      const imageUrl = window.URL.createObjectURL(imageBlob);
      return imageUrl;
    } catch (error) {
      console.error('Chart generation error:', error);
      throw error;
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    setAnalysisResponse('');
    setChartUrl('');
    setError('');

    if (!stockSymbol.trim()) {
      setError('Please enter a stock symbol');
      setIsLoading(false);
      return;
    }

    try {
      // First try to get the analysis
      const analysis = await fetchFundamentalAnalysis(stockSymbol);
      setAnalysisResponse(analysis);

      // Then try to get the chart
      try {
        const chartBlobUrl = await fetchChart(stockSymbol);
        setChartUrl(chartBlobUrl);
      } catch (chartError) {
        console.error('Chart error:', chartError);
        setError('Chart generation failed, but analysis is available');
      }
    } catch (error) {
      console.error('Analysis error:', error);
      setError(error.message || 'Failed to fetch analysis. Please try again.');
      setAnalysisResponse('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    const element = document.createElement('a');
    const file = new Blob([analysisResponse], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `${stockSymbol.toUpperCase()}_analysis.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    URL.revokeObjectURL(element.href);
  };

  // Cleanup function for blob URLs
  React.useEffect(() => {
    return () => {
      if (chartUrl) {
        URL.revokeObjectURL(chartUrl);
      }
    };
  }, [chartUrl]);

  return (
    <div className="stock-analysis-container mt-8">
      <div className="bg-white shadow-md rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-4">Stock Analysis</h2>
        <div className="space-y-4">
          <input 
            type="text" 
            placeholder="Enter Stock Symbol (e.g., AAPL, GOOGL)" 
            value={stockSymbol}
            onChange={(e) => {
              setStockSymbol(e.target.value);
              setError('');
            }}
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          
          {error && (
            <div className="text-red-500">
              {error}
            </div>
          )}
          
          <button 
            onClick={handleSubmit} 
            disabled={isLoading || !stockSymbol.trim()}
            className="w-full bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600 disabled:bg-gray-300 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Analyzing Stock...</span>
              </>
            ) : 'Get Stock Analysis'}
          </button>

          {analysisResponse && (
            <div className="markdown-content bg-white rounded-lg p-6 shadow-sm">
              <ReactMarkdown>{analysisResponse}</ReactMarkdown>
            </div>
          )}

          {chartUrl && (
            <div className="bg-white rounded-lg shadow-sm p-4">
              <img 
                src={chartUrl} 
                alt="Stock Technical Analysis Chart"
                style={{
                  width: '800px',
                  height: 'auto',
                  margin: '0 auto',
                  display: 'block'
                }}
              />
            </div>
          )}

          {analysisResponse && (
            <button 
              onClick={handleDownload}
              className="w-full bg-gray-100 text-gray-800 py-2 rounded-md hover:bg-gray-200 transition-colors"
            >
              Download Analysis
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default StockAnalysis;