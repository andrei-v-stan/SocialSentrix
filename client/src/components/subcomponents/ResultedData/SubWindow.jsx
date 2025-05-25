import PropTypes from 'prop-types';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FaExpandArrowsAlt, FaRegWindowClose, FaDownload } from 'react-icons/fa';
import { FaWindowMinimize, FaWindowRestore, FaWindowMaximize } from 'react-icons/fa6';
import { MdPersonAddAlt1, MdPersonOff } from 'react-icons/md';
import { useState, useRef } from 'react';
import { toPng, toSvg } from 'html-to-image';
import download from 'downloadjs';

export default function SubWindow({ id, title, children, onClose, compareModeList, toggleCompare }) {
  const [minimized, setMinimized] = useState(false);
  const [maximized, setMaximized] = useState(false);
  const [showDownload, setShowDownload] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const contentRef = useRef();

  const isCompared = compareModeList.includes(id);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: maximized ? 100 : isDragging ? 10 : 1,
  };

const handleDownload = async (format) => {
  if (!contentRef.current) return;
  const node = contentRef.current.querySelector('.chart-capture-target');
  if (!node) return;

  const chartBlock = node.closest('.chart-block');
  const dataAttr = chartBlock?.getAttribute('data-chart') || '{}';
  const { labels = [] } = JSON.parse(dataAttr);

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

  const safeTitle = title.replace(/[^a-zA-Z0-9-]/g, '_');
  const fileName = `${safeTitle}=${labelPart}`;

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
      const csvData = generateCSVFromChart(node);
      const blob = new Blob([csvData], { type: 'text/csv' });
      download(blob, `${fileName}.${format}`);
    }
  } catch (err) {
    console.error('Download failed:', err);
  }

  node.style.width = originalStyle.width;
  node.style.overflow = originalStyle.overflow;

  setShowDownload(false);
};



  const generateCSVFromChart = (node) => {
    const chartBlock = node.closest('.chart-block');
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


  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`graph-subwindow ${minimized ? 'minimized' : ''} ${maximized ? 'maximized' : ''}`}
    >
      <div className="window-bar" {...attributes}>
        <span className="window-title" {...listeners}>{title}</span>
        <div className="window-controls">
          {!id.endsWith('-setic') && (
            <button onClick={() => toggleCompare(id)}>
              {isCompared ? <MdPersonOff /> : <MdPersonAddAlt1 />}
            </button>
          )}
          <button onClick={() => setMinimized(prev => !prev)}>
            {minimized ? <FaWindowMaximize /> : <FaWindowMinimize />}
          </button>
          <button onClick={() => setMaximized(prev => !prev)}>
            {maximized ? <FaWindowRestore /> : <FaExpandArrowsAlt />}
          </button>
          <button onClick={() => setShowDownload(prev => !prev)}>
            <FaDownload />
          </button>
          <button onClick={onClose}>
            <FaRegWindowClose style={{ fontSize: '1.5rem', fontWeight: 'bold' }} />
          </button>
        </div>
        {showDownload && (
          <div className="download-dropdown">
            <button onClick={() => handleDownload('png')}>Save as PNG</button>
            <button onClick={() => handleDownload('svg')}>Save as SVG</button>
            <button onClick={() => handleDownload('csv')}>Export CSV</button>
          </div>
        )}
      </div>

      {!minimized && (
        <div className="window-content" ref={contentRef}>
          {children}
        </div>
      )}
    </div>
  );
}

SubWindow.propTypes = {
  id: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
  onClose: PropTypes.func.isRequired,
  compareModeList: PropTypes.array.isRequired,
  toggleCompare: PropTypes.func.isRequired,
};
