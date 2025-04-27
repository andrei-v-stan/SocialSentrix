import { useState } from 'react';
import SubmitProfile from './subcomponents/SubmitProfile.jsx';
import ResultedData from './subcomponents/ResultedWindow.jsx';

export default function Home() {
  const [results, setResults] = useState([]);

  return (
    <div>
      <SubmitProfile onResult={(r) => setResults(prev => [...prev, { ...r, id: Date.now() }])} />
      <ResultedData results={results} removeResult={(id) => setResults(prev => prev.filter(r => r.id !== id))} setResults={setResults} />
    </div>
  );
}