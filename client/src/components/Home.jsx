import { useState, useEffect } from 'react';
import SubmitProfile from './subcomponents/SubmitProfile.jsx';
import ResultedData from './subcomponents/ResultedWindow.jsx';

export default function Home() {
  const [results, setResults] = useState([]);
  const [globalCompareList, setGlobalCompareList] = useState([]);
  const [resultsMap, setResultsMap] = useState({});
  const [associationMap, setAssociationMap] = useState({});

  const handleSubmitResult = (r) => {
    const windowId = `${Date.now()}`;
    const [platform, username] = r.title.split(':').map(x => x.trim());

    if (globalCompareList.length > 0) {
      console.log('⚡ Compare mode active, associating new data to existing compare graphs (without duplicates)');

      const newAssociations = {};

      Object.entries(r.content || {}).forEach(([category, dataArray]) => {
        if (Array.isArray(dataArray) && dataArray.length > 0) {
          const matchingSubwindows = globalCompareList.filter(subId => subId.endsWith(`-${category}`));
          matchingSubwindows.forEach(subwindowId => {
            const currentAssoc = associationMap[subwindowId] || {};
            const alreadyExists = Object.values(currentAssoc).some(
              assoc => assoc.platform === platform && assoc.username === username && assoc.category === category
            );

            if (!alreadyExists) {
              newAssociations[subwindowId] = {
                ...currentAssoc,
                [Object.keys(currentAssoc).length]: {
                  platform,
                  username,
                  category,
                }
              };
            }
          });
        }
      });

      if (Object.keys(newAssociations).length > 0) {
        setAssociationMap(prev => ({
          ...prev,
          ...newAssociations
        }));
      } else {
        console.log('✅ Profile already fully associated with active compare graphs, no update needed.');
      }

      setResultsMap(prev => ({
        ...prev,
        [windowId]: {
          platform,
          username,
          content: r.content,
        }
      }));

    } else {
      console.log('✨ Normal mode, creating a new window:', r);

      const newWindow = {
        id: windowId,
        title: r.title,
        content: r.content,
      };

      const newAssociations = {};

      Object.entries(r.content || {}).forEach(([category, dataArray]) => {
        if (Array.isArray(dataArray) && dataArray.length > 0) {
          const subwindowId = `${windowId}-${category}`;
          newAssociations[subwindowId] = {
            0: {
              platform,
              username,
              category,
            }
          };
        }
      });

      setResults(prev => [...prev, newWindow]);

      setAssociationMap(prev => ({
        ...prev,
        ...newAssociations
      }));

      setResultsMap(prev => ({
        ...prev,
        [windowId]: {
          platform,
          username,
          content: r.content,
        }
      }));
    }
  };

  useEffect(() => {
    console.log('📋 Current Results Map:', resultsMap);
  }, [resultsMap]);

  useEffect(() => {
    console.log('📋 Current Association Map:', associationMap);
  }, [associationMap]);

  return (
    <div>
      <SubmitProfile onResult={handleSubmitResult} />
      <ResultedData
        results={results}
        removeResult={(id) => setResults(prev => prev.filter(r => r.id !== id))}
        setResults={setResults}
        globalCompareList={globalCompareList}
        setGlobalCompareList={setGlobalCompareList}
        resultsMap={resultsMap}
        associationMap={associationMap}
      />
    </div>
  );
}
