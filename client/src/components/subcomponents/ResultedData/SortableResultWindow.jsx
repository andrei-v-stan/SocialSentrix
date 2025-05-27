import PropTypes from 'prop-types';
import { useState, useRef, useEffect } from 'react';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FaRegWindowClose, FaExpandArrowsAlt, FaDownload } from 'react-icons/fa';
import { FaWindowMinimize, FaWindowRestore, FaWindowMaximize } from 'react-icons/fa6';
import { MdPersonAddAlt1, MdPersonOff } from 'react-icons/md';
import SubWindow from './SubWindow';
import ChartBlock from './ChartBlock';

export default function SortableResultWindow({ id, title, content, platform, username, onClose, globalCompareList, setGlobalCompareList, associationMap, resultsMap }) {
  const [minimized, setMinimized] = useState(false);
  const [maximized, setMaximized] = useState(false);
  const [hiddenGraphs, setHiddenGraphs] = useState([]);
  const [graphOrder, setGraphOrder] = useState(() => {
    const keys = Object.keys(content || {});
    if (!keys.includes('setic')) keys.push('setic');
    return keys;
  });
  const [seticResult, setSeticResult] = useState(null);
  const [showDownloadDropdown, setShowDownloadDropdown] = useState(false);
  const windowRef = useRef();
  const dropdownRef = useRef();

  const isWindowInCompareMode = graphOrder.every(key => globalCompareList.includes(`${id}-${key}`));

  const handleMainCompareToggle = () => {
    const allGraphIds = graphOrder.map(key => `${id}-${key}`);
    if (isWindowInCompareMode) {
      setGlobalCompareList(prev => prev.filter(cmpId => !allGraphIds.includes(cmpId)));
    } else {
      setGlobalCompareList(prev => [...prev, ...allGraphIds]);
    }
  };

  const toggleSubwindowCompare = (subwindowId) => {
    setGlobalCompareList(prev => {
      if (prev.includes(subwindowId)) {
        return prev.filter(id => id !== subwindowId);
      } else {
        return [...prev, subwindowId];
      }
    });
  };

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: maximized ? 1000 : isDragging ? 10 : 1,
  };

  const handleGraphDragEnd = (event) => {
    const { active, over } = event;
    if (!active || !over || active.id === over.id) return;

    const activeKey = active.id.replace(`${id}-`, '');
    const overKey = over.id.replace(`${id}-`, '');

    const oldIndex = graphOrder.indexOf(activeKey);
    const newIndex = graphOrder.indexOf(overKey);

    if (oldIndex !== -1 && newIndex !== -1) {
      setGraphOrder(arrayMove(graphOrder, oldIndex, newIndex));
    }
  };


  const closeGraph = (key) => setHiddenGraphs(prev => [...prev, key]);
  const restoreAllGraphs = () => setHiddenGraphs([]);


  const handleDownloadAll = (selection) => {
    const subwindows = windowRef.current?.querySelectorAll('.graph-subwindow');

    subwindows?.forEach((subWin, index) => {
      const buttons = subWin.querySelectorAll('.window-controls button');
      const downloadButton = Array.from(buttons).find(btn => {
        const svg = btn.querySelector('svg');
        return svg?.closest('button')?.innerHTML.includes('Download') || svg;
      });

      if (downloadButton) {
        downloadButton.click();
      }

      setTimeout(() => {
        const dropdown = subWin.querySelector('.download-dropdown');
        if (!dropdown) return;

        const targetBtn = Array.from(dropdown.querySelectorAll('button')).find(
          btn => btn.textContent.trim().toLowerCase() === selection.trim().toLowerCase()
        );

        targetBtn?.click();
      }, 300 + index * 200);
    });

    setShowDownloadDropdown(false);
  };


  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDownloadDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);


  const handleCalculateSETIC = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/reddit/calculate-setic?username=${username}`, {
        credentials: 'include'
      });
      const data = await response.json();
      if (data.error) {
        console.error('SETIC calculation failed:', data.error);
        return;
      }
      setSeticResult(data);
    } catch (error) {
      console.error('SETIC fetch error:', error);
    }
  };

  const renderSETICBar = (label, value) => (
    <div className="setic-bar-wrapper">
      <div className="setic-bar-label">{label}: {value}%</div>
      <div className="setic-bar-track">
        <div
          className="setic-bar-fill"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );

  return (
    <div
      ref={(el) => {
        setNodeRef(el);
        windowRef.current = el;
      }}
      style={style}
      className={`result-window ${minimized ? 'minimized' : ''} ${maximized ? 'maximized' : ''}`}
    >

      <div className="window-bar" {...attributes}>
        <div className="window-controls">
          <button onClick={() => setShowDownloadDropdown(prev => !prev)}>
            <FaDownload />
          </button>
          {showDownloadDropdown && (
            <div className="download-dropdown" ref={dropdownRef}>
              <button onClick={() => handleDownloadAll('PNG Selection')}>PNG Selection</button>
              <button onClick={() => handleDownloadAll('PNG Full')}>PNG Full</button>
              <button onClick={() => handleDownloadAll('SVG Selection')}>SVG Selection</button>
              <button onClick={() => handleDownloadAll('SVG Full')}>SVG Full</button>
              <button onClick={() => handleDownloadAll('CSV')}>CSV</button>
            </div>
          )}
          <button onClick={handleMainCompareToggle}>
            {isWindowInCompareMode ? <MdPersonOff /> : <MdPersonAddAlt1 />}
          </button>
        </div>
        <span className="window-title" {...listeners}>{title}</span>
        <div className="window-controls">
          <button
            onClick={() => {
              if (maximized) setMaximized(false);
              setMinimized(prev => !prev);
            }}
          >
            {minimized ? <FaWindowMaximize /> : <FaWindowMinimize />}
          </button>
          <button
            onClick={() => {
              if (minimized) setMinimized(false);
              setMaximized(prev => !prev);
            }}
          >
            {maximized ? <FaWindowRestore /> : <FaExpandArrowsAlt />}
          </button>

          <button onClick={onClose}>
            <FaRegWindowClose style={{ fontSize: '2rem', fontWeight: 'bold' }} />
          </button>
        </div>
      </div>

      {!minimized && (
        <div className="window-content">
          <DndContext collisionDetection={closestCenter} onDragEnd={handleGraphDragEnd}>
            <SortableContext
              items={graphOrder.map(key => `${id}-${key}`)}
              strategy={verticalListSortingStrategy}
            >

              {graphOrder.map((category) => {
                const subwindowId = `${id}-${category}`;
                if (hiddenGraphs.includes(category)) return null;

                let graphTitle = category.charAt(0).toUpperCase() + category.slice(1);

                if (category === 'setic') {
                  graphTitle = 'SETIC Calculator';
                  return (
                    <SubWindow
                      key={subwindowId}
                      id={subwindowId}
                      title={graphTitle}
                      onClose={() => closeGraph(category)}
                      compareModeList={globalCompareList}
                      toggleCompare={toggleSubwindowCompare}
                    >
                      {!seticResult ? (
                        <div className="setic-wrapper">
                          <button onClick={handleCalculateSETIC}>
                            Calculate SETIC
                          </button>
                        </div>
                      ) : (
                        <div className="setic-result">
                          <p>- S.E.T.I.C. Scores -</p>
                          {renderSETICBar('Sentiment', seticResult.S)}
                          {renderSETICBar('Engagement', seticResult.E)}
                          {renderSETICBar('Trustworthiness', seticResult.T)}
                          {renderSETICBar('Influence', seticResult.I)}
                          {renderSETICBar('Consistency', seticResult.C)}
                        </div>
                      )}
                    </SubWindow>
                  );
                }

                let graphData = [];
                if (globalCompareList.includes(subwindowId)) {
                  const associatedProfiles = associationMap[subwindowId] || {};
                  Object.values(associatedProfiles).forEach(({ platform, username, category }) => {
                    const foundWindow = Object.values(resultsMap).find(w => w.platform === platform && w.username === username);
                    if (foundWindow?.content?.[category]) {
                      graphData.push({
                        label: `${platform}: ${username}`,
                        data: foundWindow.content[category],
                      });
                    }
                  });
                } else {
                  graphData.push({
                    label: `${platform}: ${username}`,
                    data: content[category] || [],
                  });
                }

                if (graphData.every(g => g.data.length === 0)) return null;

                return (
                  <SubWindow
                    key={subwindowId}
                    id={subwindowId}
                    title={graphTitle}
                    onClose={() => closeGraph(category)}
                    compareModeList={globalCompareList}
                    toggleCompare={toggleSubwindowCompare}
                  >
                    <ChartBlock datasets={graphData} category={category} />
                  </SubWindow>
                );
              })}
            </SortableContext>
          </DndContext>

          {hiddenGraphs.length > 0 && (
            <div className='restore-all-button-wrapper'>
              <button onClick={restoreAllGraphs}>Restore All Graphs</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

SortableResultWindow.propTypes = {
  id: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  content: PropTypes.object.isRequired,
  platform: PropTypes.string.isRequired,
  username: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
  globalCompareList: PropTypes.array.isRequired,
  setGlobalCompareList: PropTypes.func.isRequired,
  associationMap: PropTypes.object.isRequired,
  resultsMap: PropTypes.object.isRequired,
};