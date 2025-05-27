import PropTypes from 'prop-types';
import { useState, useRef, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FaExpandArrowsAlt, FaRegWindowClose, FaDownload } from 'react-icons/fa';
import { FaWindowMinimize, FaWindowRestore, FaWindowMaximize } from 'react-icons/fa6';
import { MdPersonAddAlt1, MdPersonOff } from 'react-icons/md';
import { format } from 'date-fns';
import { toPng, toSvg } from 'html-to-image';
import download from 'downloadjs';

export default function SubWindow({ id, title, children, onClose, compareModeList, toggleCompare }) {
  const [minimized, setMinimized] = useState(false);
  const [maximized, setMaximized] = useState(false);
  const [showDownload, setShowDownload] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const contentRef = useRef();
  const dropdownRef = useRef();

  const isCompared = compareModeList.includes(id);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: maximized ? 100 : isDragging ? 10 : 1,
  };

  useEffect(() => {
    if (maximized) {
      document.body.classList.add('subwindow-maximized');
    } else {
      document.body.classList.remove('subwindow-maximized');
    }

    return () => document.body.classList.remove('subwindow-maximized');
  }, [maximized]);


  const waitForSvgToBeFullyRendered = (svgNode, timeout = 2000, stableDelay = 200) => {
    return new Promise(resolve => {
      if (!svgNode) return resolve();

      let lastBBox = svgNode.getBBox?.() || svgNode.getBoundingClientRect();
      let lastSerialized = svgNode.outerHTML;
      let stableTimer = null;

      const checkStability = () => {
        const currentBBox = svgNode.getBBox?.() || svgNode.getBoundingClientRect();
        const currentSerialized = svgNode.outerHTML;

        const bboxStable =
          currentBBox.width === lastBBox.width &&
          currentBBox.height === lastBBox.height;
        const domStable = currentSerialized === lastSerialized;

        if (bboxStable && domStable) {
          clearTimeout(stableTimer);
          stableTimer = setTimeout(() => {
            observer.disconnect();
            resolve();
          }, stableDelay);
        } else {
          lastBBox = currentBBox;
          lastSerialized = currentSerialized;
          clearTimeout(stableTimer);
        }
      };

      const observer = new MutationObserver(checkStability);
      observer.observe(svgNode, {
        childList: true,
        subtree: true,
        attributes: true,
        characterData: true,
      });

      setTimeout(() => {
        observer.disconnect();
        resolve();
      }, timeout);
    });
  };



  const handleDownload = async (format, mode) => {
    if (!contentRef.current) return;
    const node = contentRef.current.querySelector('.chart-capture-target');
    if (!node) return;

    const chartBlock = node.closest('.chart-block');
    const dataAttr = chartBlock?.getAttribute('data-chart') || '{}';
    const { labels = [], data = [] } = JSON.parse(dataAttr);

    const originalStyle = {
      width: node.style.width,
      overflow: node.style.overflow
    };

    let renderTarget = node;
    if (mode === 'full') {
      const xPoints = Array.isArray(data) ? data.length : 0;
      const targetWidth = Math.max(400, xPoints * 25);
      node.style.width = `${targetWidth}px`;
      node.style.overflow = 'visible';
    } else {
      node.style.width = 'fit-content';
      node.style.overflow = 'visible';
    }

    try {
      setShowDownload(false);

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

      switch (`${format}-${mode}`) {
        case 'png-full':
        case 'svg-full': {
          const svg = node.querySelector('div.recharts-wrapper');
          if (!svg) {
            console.warn('SVG surface not found for export');
            return;
          }

          await waitForSvgToBeFullyRendered(svg);

          if (format === 'png') {
            const dataUrl = await toPng(svg, { pixelRatio: 3 });
            download(dataUrl, `${fileName}.png`);
          } else {
            const dataUrl = await toSvg(svg);
            download(dataUrl, `${fileName}.svg`);
          }
          break;
        }
        case 'png-selection': {
          const dataUrl = await toPng(renderTarget, { pixelRatio: 3 });
          download(dataUrl, `${fileName}.png`);
          break;
        }
        case 'svg-selection': {
          const dataUrl = await toSvg(renderTarget);
          download(dataUrl, `${fileName}.svg`);
          break;
        }
        case 'csv-full': {
          const csvData = generateCSVFromChart(renderTarget);
          const blob = new Blob([csvData], { type: 'text/csv' });
          download(blob, `${fileName}.csv`);
          break;
        }
        default:
          console.warn('Unsupported format/mode combo:', format, mode);
      }

    } catch (err) {
      console.error('Download failed:', err);
    }

    node.style.width = originalStyle.width;
    node.style.overflow = originalStyle.overflow;
  };


  const generateCSVFromChart = (node) => {
    const formatLabel = (timestamp, granularity) => {
      const date = new Date(timestamp);
      switch (granularity) {
        case 'minute':
        case 'hour': return format(date, 'HH:mm:ss | dd/MM/yyyy');
        case 'day': return format(date, 'dd/MM/yyyy');
        case 'week': return `Week ${format(date, 'II')} | ${format(date, 'yyyy')}`;
        case 'month': return format(date, 'MM/yyyy');
        case 'year': return format(date, 'yyyy');
        default: return timestamp.toString();
      }
    };

    const chartBlock = node.closest('.chart-block');
    const dataAttr = chartBlock?.getAttribute('data-chart') || '{}';
    const yAxis = chartBlock?.querySelector('.chart-dropdown-controls .dropdown-group:nth-child(1) > div')?.textContent?.trim() || 'value';
    const granularity = chartBlock?.querySelector('.chart-dropdown-controls .dropdown-group:nth-child(2) > div')?.textContent?.trim() || 'month';

    try {
      const parsed = JSON.parse(dataAttr);
      const headers = [`timestamp/${yAxis}`, ...parsed.labels];

      const rows = parsed.data.map(row => {
        const timestampStr = formatLabel(row.timestamp, granularity);
        const labelValues = parsed.labels.map(label => {
          const val = row[label] ?? 0;
          return typeof val === 'string' && val.includes(',') ? `"${val}"` : val;
        });
        return [timestampStr, ...labelValues];
      });

      return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    } catch (err) {
      console.warn('CSV generation failed:', err);
      return 'timestamp,value\n';
    }
  };


  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDownload(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);


  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`graph-subwindow ${minimized ? 'minimized' : ''} ${maximized ? 'maximized' : ''}`}
    >
      <div className="window-bar" {...attributes}>
        <div className="window-controls">
          {!id.endsWith('-setic') && (
            <button onClick={() => setShowDownload(prev => !prev)}>
              <FaDownload />
            </button>
          )}
          {showDownload && (
            <div className="download-dropdown" ref={dropdownRef}>
              <button onClick={() => handleDownload('png', 'selection')}>PNG Selection</button>
              <button onClick={() => handleDownload('png', 'full')}>PNG Full</button>
              <button onClick={() => handleDownload('svg', 'selection')}>SVG Selection</button>
              <button onClick={() => handleDownload('svg', 'full')}>SVG Full</button>
              <button onClick={() => handleDownload('csv', 'full')}>CSV</button>
            </div>
          )}
          {!id.endsWith('-setic') && (
            <button onClick={() => toggleCompare(id)}>
              {isCompared ? <MdPersonOff /> : <MdPersonAddAlt1 />}
            </button>
          )}
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
            <FaRegWindowClose style={{ fontSize: '1.5rem', fontWeight: 'bold' }} />
          </button>
        </div>
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