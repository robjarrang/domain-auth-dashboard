import { useState, useEffect } from 'react';

export default function Home() {
  const [results, setResults] = useState([]);
  const [notificationPermission, setNotificationPermission] = useState('default');

  useEffect(() => {
    checkNotificationPermission();
  }, []);

  function checkNotificationPermission() {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }

  async function requestNotificationPermission() {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
    }
  }

  async function fetchResults() {
    const response = await fetch('/api/daily-check');
    const data = await response.json();
    setResults(data.results);

    const failedDomains = data.results.filter(result => 
      !result.dkim || !result.spf || !result.dmarc
    );

    if (failedDomains.length > 0 && notificationPermission === 'granted') {
      new Notification('Domain Authentication Alert', {
        body: `${failedDomains.length} domain(s) have failed authentication checks.`,
      });
    }
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Domain Authentication Dashboard</h1>
      <div className="mb-4">
        <button 
          onClick={fetchResults}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mr-2"
        >
          Run Check
        </button>
        {notificationPermission !== 'granted' && (
          <button 
            onClick={requestNotificationPermission}
            className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
          >
            Enable Notifications
          </button>
        )}
      </div>
      <table className="w-full">
        <thead>
          <tr>
            <th className="text-left">Domain</th>
            <th className="text-left">DKIM</th>
            <th className="text-left">SPF</th>
            <th className="text-left">DMARC</th>
          </tr>
        </thead>
        <tbody>
          {results.map((result, index) => (
            <tr key={index}>
              <td>{result.domain}</td>
              <td>{result.dkim ? '✅' : '❌'}</td>
              <td>{result.spf ? '✅' : '❌'}</td>
              <td>{result.dmarc ? '✅' : '❌'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}