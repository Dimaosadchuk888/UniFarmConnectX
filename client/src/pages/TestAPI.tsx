import React, { useState, useEffect } from 'react';

const TestAPI: React.FC = () => {
  const [apiResults, setApiResults] = useState<{
    testJson: string | null;
    transactions: string | null;
  }>({
    testJson: null,
    transactions: null
  });

  const [loading, setLoading] = useState({
    testJson: false,
    transactions: false
  });

  const [error, setError] = useState({
    testJson: null as string | null,
    transactions: null as string | null
  });

  const fetchTestJson = async () => {
    setLoading(prev => ({ ...prev, testJson: true }));
    setError(prev => ({ ...prev, testJson: null }));
    
    try {
      console.log("Fetching /api/test-json");
      const response = await fetch('/api/test-json', {
        headers: {
          'Accept': 'application/json'
        }
      });
      
      console.log("Response status:", response.status);
      console.log("Response headers:", Object.fromEntries(response.headers.entries()));
      
      const text = await response.text();
      console.log("Response text:", text.substring(0, 200));
      
      if (response.ok) {
        setApiResults(prev => ({ ...prev, testJson: text }));
      } else {
        setError(prev => ({ ...prev, testJson: `Error ${response.status}: ${response.statusText}` }));
      }
    } catch (err) {
      console.error("Error fetching test-json:", err);
      setError(prev => ({ ...prev, testJson: err instanceof Error ? err.message : String(err) }));
    } finally {
      setLoading(prev => ({ ...prev, testJson: false }));
    }
  };

  const fetchTransactions = async () => {
    setLoading(prev => ({ ...prev, transactions: true }));
    setError(prev => ({ ...prev, transactions: null }));
    
    try {
      console.log("Fetching /api/transactions?user_id=1");
      const response = await fetch('/api/transactions?user_id=1', {
        headers: {
          'Accept': 'application/json'
        }
      });
      
      console.log("Response status:", response.status);
      console.log("Response headers:", Object.fromEntries(response.headers.entries()));
      
      const text = await response.text();
      console.log("Response text:", text.substring(0, 200));
      
      if (response.ok) {
        setApiResults(prev => ({ ...prev, transactions: text }));
      } else {
        setError(prev => ({ ...prev, transactions: `Error ${response.status}: ${response.statusText}` }));
      }
    } catch (err) {
      console.error("Error fetching transactions:", err);
      setError(prev => ({ ...prev, transactions: err instanceof Error ? err.message : String(err) }));
    } finally {
      setLoading(prev => ({ ...prev, transactions: false }));
    }
  };

  return (
    <div className="p-5">
      <h1 className="text-2xl font-bold mb-5">API Test Page</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Test JSON API */}
        <div className="bg-card p-4 rounded-xl">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-semibold">/api/test-json</h2>
            <button 
              className="px-3 py-1.5 bg-primary text-white rounded-md hover:bg-purple-700 transition-colors"
              onClick={fetchTestJson}
              disabled={loading.testJson}
            >
              {loading.testJson ? 'Loading...' : 'Test'}
            </button>
          </div>
          
          {error.testJson && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-md mb-3">
              {error.testJson}
            </div>
          )}
          
          {apiResults.testJson && (
            <div className="bg-black/30 p-3 rounded-md overflow-x-auto">
              <pre className="text-sm text-white">{apiResults.testJson}</pre>
            </div>
          )}
        </div>
        
        {/* Transactions API */}
        <div className="bg-card p-4 rounded-xl">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-semibold">/api/transactions?user_id=1</h2>
            <button 
              className="px-3 py-1.5 bg-primary text-white rounded-md hover:bg-purple-700 transition-colors"
              onClick={fetchTransactions}
              disabled={loading.transactions}
            >
              {loading.transactions ? 'Loading...' : 'Test'}
            </button>
          </div>
          
          {error.transactions && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-md mb-3">
              {error.transactions}
            </div>
          )}
          
          {apiResults.transactions && (
            <div className="bg-black/30 p-3 rounded-md overflow-x-auto max-h-[400px] overflow-y-auto">
              <pre className="text-sm text-white">{apiResults.transactions}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TestAPI;