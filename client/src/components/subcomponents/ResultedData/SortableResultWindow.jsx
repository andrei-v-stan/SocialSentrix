import PropTypes from 'prop-types';
import { useState, useRef } from 'react';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FaRegWindowClose, FaExpandArrowsAlt, FaDownload } from 'react-icons/fa';
import { FaWindowMinimize, FaWindowRestore, FaWindowMaximize } from 'react-icons/fa6';
import { MdPersonAddAlt1, MdPersonOff } from 'react-icons/md';
import { toPng, toSvg } from 'html-to-image';
import download from 'downloadjs';
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
    const oldIndex = graphOrder.indexOf(active.id);
    const newIndex = graphOrder.indexOf(over.id);
    if (oldIndex !== -1 && newIndex !== -1) {
      setGraphOrder(arrayMove(graphOrder, oldIndex, newIndex));
    }
  };

  const closeGraph = (key) => setHiddenGraphs(prev => [...prev, key]);
  const restoreAllGraphs = () => setHiddenGraphs([]);

  const handleDownloadAll = async (format) => {
    if (!windowRef.current) return;
    const nodes = windowRef.current.querySelectorAll('.chart-capture-target');

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const chartBlock = node.closest('.chart-block');
      const dataAttr = chartBlock?.getAttribute('data-chart') || '{}';
      const { labels = [] } = JSON.parse(dataAttr);

      const subwindowTitle = chartBlock?.closest('.graph-subwindow')?.querySelector('.window-title')?.textContent?.trim() || `Graph_${i + 1}`;
      const titlePart = subwindowTitle.replace(/[^a-zA-Z0-9-]/g, '_');
      const platformMap = {};

      labels.forEach(label => {
        const [platform, user] = label.split(':').map(s => s.trim());
        if (!platform || !user) return;
        if (!platformMap[platform]) platformMap[platform] = [];
        platformMap[platform].push(user);
      });

      const labelPart = Object.entries(platformMap)
        .map(([platform, users]) => `[${platform}]-(${users.join('+')})`)
        .join('&');

      const fileName = `${titlePart}=${labelPart}`;

      const originalStyle = {
        width: node.style.width,
        overflow: node.style.overflow
      };

      node.style.width = 'fit-content';
      node.style.overflow = 'visible';

      try {
        if (format === 'png') {
          const dataUrl = await toPng(node, { pixelRatio: 3 });
          download(dataUrl, `${fileName}.${format}`);
        } else if (format === 'svg') {
          const dataUrl = await toSvg(node);
          download(dataUrl, `${fileName}.${format}`);
        } else if (format === 'csv') {
          const csvData = generateCSVFromChart(chartBlock);
          const blob = new Blob([csvData], { type: 'text/csv' });
          download(blob, `${fileName}.${format}`);

        }
      } catch (err) {
        console.error(`Failed to download graph ${i + 1}:`, err);
      }

      node.style.width = originalStyle.width;
      node.style.overflow = originalStyle.overflow;
    }

    setShowDownloadDropdown(false);
  };

  const generateCSVFromChart = (chartBlock) => {
    const dataAttr = chartBlock?.getAttribute('data-chart') || '{}';
    try {
      const parsed = JSON.parse(dataAttr);
      const headers = ['timestamp', ...parsed.labels];
      const rows = parsed.data.map(row => [row.timestamp, ...parsed.labels.map(l => row[l] || 0)]);
      return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    } catch {
      return 'timestamp,value\n';
    }
  };

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
    <div style={{ marginBottom: '1rem' }}>
      <div style={{ fontSize: '1rem', marginBottom: '0.3rem' }}>{label}: {value}%</div>
      <div style={{
        background: '#333',
        borderRadius: '8px',
        overflow: 'hidden',
        height: '10px',
        width: '100%'
      }}>
        <div style={{
          height: '100%',
          width: `${value}%`,
          backgroundColor: '#4dabf7',
          transition: 'width 0.5s ease'
        }} />
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
          <button onClick={handleMainCompareToggle}>
            {isWindowInCompareMode ? <MdPersonOff /> : <MdPersonAddAlt1 />}
          </button>
        </div>
        <span className="window-title" {...listeners}>{title}</span>
        <div className="window-controls">
          <button onClick={() => setMinimized(prev => !prev)}>
            {minimized ? <FaWindowMaximize /> : <FaWindowMinimize />}
          </button>
          <button onClick={() => setMaximized(prev => !prev)}>
            {maximized ? <FaWindowRestore /> : <FaExpandArrowsAlt />}
          </button>
          <button onClick={onClose}>
            <FaRegWindowClose style={{ fontSize: '2rem', fontWeight: 'bold' }} />
          </button>
        </div>
        {showDownloadDropdown && (
          <div className="download-dropdown">
            <button onClick={() => handleDownloadAll('png')}>Download All as PNG</button>
            <button onClick={() => handleDownloadAll('svg')}>Download All as SVG</button>
            <button onClick={() => handleDownloadAll('csv')}>Export All as CSV</button>
          </div>
        )}

      </div>

      {!minimized && (
        <div className="window-content">
          <DndContext collisionDetection={closestCenter} onDragEnd={handleGraphDragEnd}>
            <SortableContext items={graphOrder} strategy={verticalListSortingStrategy}>
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
                        <div style={{ padding: '1rem', textAlign: 'center' }}>
                          <button
                            onClick={handleCalculateSETIC}
                            style={{
                              padding: '0.8rem 1.2rem',
                              fontSize: '1rem',
                              backgroundColor: '#4dabf7',
                              color: 'white',
                              border: 'none',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              fontWeight: 'bold'
                            }}
                          >
                            Calculate SETIC
                          </button>
                        </div>
                      ) : (
                        <div style={{ padding: '1rem' }}>
                          <h4 style={{ marginBottom: '1rem', color: '#4dabf7' }}>SETIC Scores</h4>
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
            <div style={{ marginTop: '1rem', textAlign: 'center' }}>
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
