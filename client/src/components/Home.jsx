import { useState } from 'react';
import SubmitProfile from './subcomponents/SubmitProfile.jsx';
import ResultedData from './subcomponents/ResultedWindow.jsx';

export default function Home() {
  const [results, setResults] = useState([]);
  const [globalCompareList, setGlobalCompareList] = useState([]);
  const [resultsMap, setResultsMap] = useState({});
  const [associationMap, setAssociationMap] = useState({});


  const CATEGORY_ALIAS_MAP = {
    posts: ['posts'],
    comments: ['comments'],
    upvotes: ['upvotes', 'likes'],
    downvotes: ['downvotes', 'dislikes'],
  };

  const normalizeCategory = (rawCategory) => {
    for (const [canonical, aliases] of Object.entries(CATEGORY_ALIAS_MAP)) {
      if (aliases.includes(rawCategory)) return canonical;
    }
    return rawCategory;
  };



  const handleSubmitResult = (r) => {
    const windowId = `${Date.now()}`;
    const [platform, username] = r.title.split(':').map(x => x.trim());

    if (globalCompareList.length > 0) {
      // console.log('Compare mode active: Associating new data to existing compare graphs.');
      const newAssociations = {};
      Object.entries(r.content || {}).forEach(([rawCategory, dataArray]) => {
        if (Array.isArray(dataArray) && dataArray.length > 0) {
          const canonicalCategory = normalizeCategory(rawCategory);
          const matchingSubwindows = globalCompareList.filter(subId => {
            const [, subCategory] = subId.split('-').slice(-2);
            return normalizeCategory(subCategory) === canonicalCategory;
          });
          // console.log('Matching subwindows for:', category, ':', matchingSubwindows);
          matchingSubwindows.forEach(subwindowId => {
            const currentAssoc = associationMap[subwindowId] || {};
            const alreadyExists = Object.values(currentAssoc).some(
              assoc => assoc.platform === platform && assoc.username === username && assoc.category === canonicalCategory
            );

            if (!alreadyExists) {
              newAssociations[subwindowId] = {
                ...currentAssoc,
                [Object.keys(currentAssoc).length]: {
                  platform,
                  username,
                  category: canonicalCategory,
                }
              };
            }
          });
        }
      });

      if (Object.keys(newAssociations).length > 0) {
        // console.log('Before merge:', JSON.stringify(associationMap, null, 2));
        // console.log('New associations:', JSON.stringify(newAssociations, null, 2));
        setAssociationMap(prev => {
          const updated = { ...prev };

          for (const subId in newAssociations) {
            const existing = prev[subId] || {};
            const incoming = newAssociations[subId] || {};

            const merged = { ...existing };
            const alreadyExists = (entry) =>
              Object.values(merged).some(
                existing =>
                  existing.username === entry.username &&
                  existing.platform === entry.platform &&
                  existing.category === entry.category
              );
            Object.values(incoming).forEach(entry => {
              if (!alreadyExists(entry)) {
                const nextIndex = Object.keys(merged).length;
                merged[nextIndex] = entry;
              }
            });
            updated[subId] = merged;
          }
          return updated;
        });

        setTimeout(() => {
          // console.log('[S] After merge:', JSON.stringify(associationMap, null, 2));
        }, 200);
      }
      else {
        // console.log('[S] Profile already fully associated with active compare graphs.');
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
      // console.log('[N] Normal mode, creating a new window:', r);
      const newWindow = {
        id: windowId,
        title: r.title,
        content: r.content,
      };

      const newAssociations = {};
      // console.log('Adding new associations for:', platform, username);
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

  /*
  useEffect(() => {
    console.log('[M] Current Results Map:', resultsMap);
  }, [resultsMap]);

  useEffect(() => {
    console.log('[M] Current Association Map:', associationMap);
  }, [associationMap]);
  */

  const removeResult = (idToRemove) => {
    setResults(prev => prev.filter(r => r.id !== idToRemove));

    setResultsMap(prev => {
      const newMap = { ...prev };
      delete newMap[idToRemove];
      return newMap;
    });

    setAssociationMap(prev => {
      const newMap = { ...prev };
      Object.keys(newMap).forEach(subId => {
        if (subId.startsWith(`${idToRemove}-`)) {
          delete newMap[subId];
        }
      });
      return newMap;
    });

    setGlobalCompareList(prev => prev.filter(cmpId => !cmpId.startsWith(`${idToRemove}-`)));
  };


  return (
    <div>
      <SubmitProfile onResult={handleSubmitResult} />
      <ResultedData
        results={results}
        removeResult={removeResult}
        setResults={setResults}
        globalCompareList={globalCompareList}
        setGlobalCompareList={setGlobalCompareList}
        resultsMap={resultsMap}
        associationMap={associationMap}
      />
    </div>
  );
}
