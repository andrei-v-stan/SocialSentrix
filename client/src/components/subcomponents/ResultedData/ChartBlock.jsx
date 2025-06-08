
import { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, parseISO } from 'date-fns';
import DatePicker from 'react-datepicker';
import PropTypes from 'prop-types';
import 'react-datepicker/dist/react-datepicker.css';

const groupBy = (data, interval, selectedYAxis, category) => {
  const grouped = new Map();

  data.forEach(item => {
    const date = new Date(item.createdAt || item.timestamp);
    let key;
    switch (interval) {
      case 'minute': key = format(date, 'yyyy-MM-dd HH:mm'); break;
      case 'hour': key = format(date, 'yyyy-MM-dd HH'); break;
      case 'day': key = format(date, 'yyyy-MM-dd'); break;
      case 'week': {
        const weekStart = new Date(date);
        const day = weekStart.getUTCDay();
        const diff = (day === 0 ? -6 : 1) - day;
        weekStart.setUTCDate(weekStart.getUTCDate() + diff);
        weekStart.setUTCHours(0, 0, 0, 0);
        key = weekStart.toISOString();
        break;
      }
      case 'month': key = format(date, 'yyyy-MM'); break;
      case 'year': key = format(date, 'yyyy'); break;
      default: key = format(date, 'yyyy-MM-dd HH:mm');
    }

    if (!grouped.has(key)) grouped.set(key, { posts: [], sum: 0 });

    const group = grouped.get(key);

    if (category === 'posts') {
      if (selectedYAxis === 'posts') {
        group.sum += 1;
      } else if (selectedYAxis === 'comments') {
        group.sum += item.comments ?? item.replyCount ?? 0;
      } else if (selectedYAxis === 'upvotes') {
        group.sum += item.upvotes ?? item.likeCount ?? 0;
      } else if (selectedYAxis === 'reposts') {
        group.sum += item.repostCount ?? 0;
      }
      group.posts.push(item);

    } else if (category === 'comments') {
      if (selectedYAxis === 'comments') {
        group.sum += 1;
      } else if (selectedYAxis === 'upvotes') {
        group.sum += item.upvotes ?? item.likeCount ?? 0;
      }
      group.posts.push(item);
    } else if (category === 'upvotes' || category === 'downvotes' || category === 'reposts') {
      group.sum += 1;
      group.posts.push(item);
    }

  });

  return Array.from(grouped.entries())
    .map(([timestamp, { posts, sum }]) => ({
      timestamp,
      value: sum,
      items: posts,
    }))
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
};

export default function ChartBlock({ datasets, category }) {
  const [granularity, setGranularity] = useState('month');
  const [dateRange, setDateRange] = useState([null, null]);
  const [minDate, setMinDate] = useState(null);
  const [maxDate, setMaxDate] = useState(null);
  const [selectedYAxis, setSelectedYAxis] = useState(() => {
    if (category === 'posts') return 'posts';
    if (category === 'comments') return 'comments';
    return 'count';
  });

  const [viewBox, setViewBox] = useState([0, 100]);
  const [dragStart, setDragStart] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [visibleCountMap, setVisibleCountMap] = useState({});
  const chartContainerRef = useRef();
  const xAxisRef = useRef(null);
  const yAxisRef = useRef(null);
  const dateRef = useRef(null);

  const labelMap = {
    posts: 'Posts',
    comments: 'Comments',
    upvotes: 'Upvotes',
    downvotes: 'Downvotes',
    reposts: 'Reposts'
  };

  const availableYAxisOptions = (() => {
    if (category === 'posts') return ['posts', 'comments', 'upvotes', 'reposts'];
    if (category === 'comments') return ['comments', 'upvotes'];
    if (category === 'upvotes') return ['upvotes'];
    if (category === 'reposts') return ['reposts'];
    return [];
  })();


  useEffect(() => {
    if (isFocused) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isFocused]);

  useEffect(() => {
    if (datasets.length > 0) {
      const timestamps = datasets.flatMap(({ data }) => data.map(d => parseISO(d.createdAt || d.timestamp)));
      if (timestamps.length > 0) {
        timestamps.sort((a, b) => a - b);
        setMinDate(timestamps[0]);
        setMaxDate(timestamps[timestamps.length - 1]);
        setDateRange([timestamps[0], timestamps[timestamps.length - 1]]);
      }
    }
  }, [datasets]);

  const filteredDatasets = datasets.map(({ label, data }) => {
    let filtered = data.map(item => ({
      ...item,
      timestamp: format(new Date(item.createdAt || item.timestamp), "yyyy-MM-dd'T'HH:mm:ss.SSS"),
    }));

    const [start, end] = dateRange;
    if (start && end) {
      filtered = filtered.filter(item => {
        const date = parseISO(item.timestamp);
        return date >= start && date <= end;
      });
    }

    return {
      label,
      data: groupBy(filtered, granularity, selectedYAxis, category),
    };
  });

  const mergedData = (() => {
    const merged = {};
    filteredDatasets.forEach(({ label, data }) => {
      data.forEach(({ timestamp, value, items = [] }) => {
        if (!merged[timestamp]) {
          merged[timestamp] = { timestamp, __items: {} };
        }
        merged[timestamp][label] = value;
        merged[timestamp].__items[label] = items;
      });
    });
    return Object.values(merged).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  })();

  const visibleData = mergedData.slice(
    Math.floor((viewBox[0] / 100) * mergedData.length),
    Math.ceil((viewBox[1] / 100) * mergedData.length)
  );

  const handleWheel = (e) => {
    if (!isFocused) return;
    // e.preventDefault();
    const direction = e.deltaY > 0 ? 1 : -1;
    const [start, end] = viewBox;
    const center = (start + end) / 2;
    let newStart = center - ((center - start) * (1 + 0.1 * direction));
    let newEnd = center + ((end - center) * (1 + 0.1 * direction));
    newStart = Math.max(0, newStart);
    newEnd = Math.min(100, newEnd);
    if (newEnd - newStart >= 5) setViewBox([newStart, newEnd]);
  };

  const handleMouseDown = (e) => {
    setDragStart(e.clientX);
    setIsDragging(false);
    document.body.style.userSelect = 'none';
  };

  const handleMouseMove = (e) => {
    if (dragStart !== null && chartContainerRef.current) {
      const dx = e.clientX - dragStart;
      if (Math.abs(dx) > 2) setIsDragging(true);
      const percentDx = (dx / chartContainerRef.current.offsetWidth) * 100;
      const range = viewBox[1] - viewBox[0];
      let newStart = Math.max(0, Math.min(100 - range, viewBox[0] - percentDx));
      setViewBox([newStart, newStart + range]);
      setDragStart(e.clientX);
    }
  };

  const handleMouseUp = () => {
    setDragStart(null);
    document.body.style.userSelect = '';
  };

  useEffect(() => {
    if (selectedPoint) {
      const counts = {};
      for (const label in selectedPoint.groupedItems) {
        counts[label] = 10;
      }
      setVisibleCountMap(counts);
    }
  }, [selectedPoint]);


  const handleChartClick = (e) => {
    if (!isFocused || isDragging) return;
    if (e && e.activePayload) {
      const timestamp = e.activeLabel;
      const payload = e.activePayload[0]?.payload;
      const groupedItems = {};
      if (payload && payload.__items) {
        for (const [label, items] of Object.entries(payload.__items)) {
          if (items && items.length > 0) {
            groupedItems[label] = items.map(item => ({
              label: item.title || item.text || 'Untitled',
              raw: item,
            }));
          }
        }
      }
      setSelectedPoint({ timestamp, groupedItems });
    }
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;

    let formattedLabel = label;
    if (granularity === 'week') {
      const date = new Date(label);
      formattedLabel = `Week ${format(date, 'II')} | ${format(date, 'yyyy')}`;
    }

    return (
      <div className="chart-block-point-tooltip">
        <p>{formattedLabel}</p>
        {payload.map((entry, idx) => (
          <div key={idx} className="flex justify-between gap-4" style={{ color: entry.color }}>
            <span>{entry.name} ({entry.value})</span>
          </div>
        ))}
      </div>
    );
  };

  CustomTooltip.propTypes = {
    active: PropTypes.bool,
    payload: PropTypes.arrayOf(PropTypes.shape({
      name: PropTypes.string,
      value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    })),
    label: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  };


  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        xAxisRef.current?.contains(event.target) ||
        yAxisRef.current?.contains(event.target) ||
        dateRef.current?.contains(event.target)
      ) {
        return;
      }
      setOpenDropdown(null);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const formatXAxis = (tick) => {
    try {
      const date = typeof tick === 'string' ? parseISO(tick) : new Date(tick);
      switch (granularity) {
        case 'minute':
        case 'hour': return format(date, 'HH:mm:ss | dd/MM/yyyy');
        case 'day': return format(date, 'dd/MM/yyyy');
        case 'week':
          return `Week ${format(date, 'II')} | ${format(date, 'yyyy')}`;
        case 'month': return format(date, 'MM/yyyy');
        case 'year': return format(date, 'yyyy');
        default: return format(date, 'dd/MM/yyyy');
      }
    } catch {
      return tick;
    }
  };


  const colorForIndex = (idx) => {
    const hue = (idx * 45) % 360;
    const saturation = 60 + (idx * 7) % 20;
    const lightness = 45 + (idx * 5) % 15;
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  };

  const chartRef = useRef();
  const chartMeta = {
    labels: datasets.map(d => d.label),
    data: mergedData,
  };



  return (
    <div className="chart-block" data-chart={JSON.stringify(chartMeta)}>
      <div className="chart-dropdown-controls">

        {availableYAxisOptions.length > 1 && (
          <div className="dropdown-group" ref={yAxisRef}>
            <button onClick={() => setOpenDropdown(openDropdown === 'y' ? null : 'y')}>Y-Axis</button>
            <div style={{ textAlign: 'center' }}>{labelMap[selectedYAxis] || selectedYAxis}</div>
            {openDropdown === 'y' && (
              <div className="dropdown-panel">
                {availableYAxisOptions.map(option => (
                  <button key={option} onClick={() => { setSelectedYAxis(option); setOpenDropdown(null); }} className={selectedYAxis === option ? 'active' : ''}>{labelMap[option] || option}</button>
                ))}
              </div>
            )}
          </div>
        )}


        <div className="dropdown-group" ref={xAxisRef}>
          <button onClick={() => setOpenDropdown(openDropdown === 'x' ? null : 'x')}>X-Axis</button>
          <div style={{ textAlign: 'center' }}>{granularity}</div>
          {openDropdown === 'x' && (
            <div className="dropdown-panel">
              {['minute', 'hour', 'day', 'week', 'month', 'year'].map(g => (
                <button key={g} onClick={() => { setGranularity(g); setOpenDropdown(null); }} className={granularity === g ? 'active' : ''}>{g}</button>
              ))}
            </div>
          )}
        </div>

        <div className="dropdown-group" ref={dateRef}>
          <button onClick={() => setOpenDropdown(openDropdown === 'date' ? null : 'date')}>Date</button>
          <div style={{ textAlign: 'center' }}>
            {dateRange[0] ? formatXAxis(dateRange[0]) : 'Start'} - {dateRange[1] ? formatXAxis(dateRange[1]) : 'End'}
          </div>

          {openDropdown === 'date' && (
            <div className="dropdown-panel date-panel">
              <div className="date-row">
                <label className="date-label">Start</label>
                <DatePicker
                  portalId="datepicker-portal"
                  selected={dateRange[0]}
                  onChange={(date) => setDateRange([date ?? minDate, dateRange[1]])}
                  selectsStart
                  startDate={dateRange[0]}
                  endDate={dateRange[1]}
                  minDate={minDate}
                  maxDate={maxDate}
                  showTimeSelect={['minute', 'hour'].includes(granularity)}
                  dateFormat={
                    granularity === 'minute'
                      ? 'dd/MM/yyyy HH:mm'
                      : granularity === 'hour'
                        ? 'dd/MM/yyyy HH'
                        : granularity === 'day'
                          ? 'dd/MM/yyyy'
                          : ['week', 'month'].includes(granularity)
                            ? 'MM/yyyy'
                            : 'yyyy'
                  }
                  placeholderText="Select start date"
                  isClearable
                  className="w-full"
                />
              </div>

              <div className="date-row">
                <label className="date-label">End</label>
                <DatePicker
                  portalId="datepicker-portal"
                  selected={dateRange[1]}
                  onChange={(date) => setDateRange([dateRange[0], date ?? maxDate])}
                  selectsEnd
                  startDate={dateRange[0]}
                  endDate={dateRange[1]}
                  minDate={minDate}
                  maxDate={maxDate}
                  showTimeSelect={['minute', 'hour'].includes(granularity)}
                  dateFormat={
                    granularity === 'minute'
                      ? 'dd/MM/yyyy HH:mm'
                      : granularity === 'hour'
                        ? 'dd/MM/yyyy HH'
                        : granularity === 'day'
                          ? 'dd/MM/yyyy'
                          : ['week', 'month'].includes(granularity)
                            ? 'MM/yyyy'
                            : 'yyyy'
                  }
                  placeholderText="Select end date"
                  isClearable
                  className="w-full"
                />
              </div>
            </div>
          )}

        </div>
      </div>

      <div
        ref={chartContainerRef}
        tabIndex={0}
        className={`chart-interactive-container ${isFocused ? 'focused' : ''}`}
        style={{ width: '100%', height: '40vh', minHeight: '250px', maxHeight: '600px', padding: '3rem 3rem 0 0', touchAction: 'none', outline: 'none', border: isFocused ? '2px solid #c4c4c4' : '2px solid transparent' }}
        onClick={() => setIsFocused(true)}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setIsFocused(false)}
      >
        <div ref={chartRef} className="chart-capture-target">
          <ResponsiveContainer>
            <LineChart data={visibleData} onClick={handleChartClick}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="timestamp" tickFormatter={formatXAxis} tick={{ fontSize: 10 }} />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              {filteredDatasets.map(({ label }, idx) => (
                <Line
                  key={idx}
                  type="monotone"
                  dataKey={label}
                  stroke={colorForIndex(idx)}
                  dot={{
                    fill: colorForIndex(idx),
                    stroke: 'Lavender',
                    strokeWidth: 1,
                    r: 3
                  }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
          {filteredDatasets.every(d => d.data.length === 0) && (
            <div className='chart-block-time-range-empty'>
              No data for the selected time range
            </div>
          )}
        </div>
      </div>

      {selectedPoint && (
        <div className="point-details">
          <div className="point-details-topbar">
            <p>Data for {selectedPoint.timestamp}</p>
            <button onClick={() => setSelectedPoint(null)}>X</button>
          </div>
          {Object.entries(selectedPoint.groupedItems).map(([label, items]) => {
            const visibleCount = visibleCountMap[label] || 10;
            const visibleItems = items.slice(0, visibleCount);

            const handleScroll = (e) => {
              const target = e.target;
              if (target.scrollTop + target.clientHeight >= target.scrollHeight - 20) {
                setVisibleCountMap(prev => ({
                  ...prev,
                  [label]: prev[label] + 10
                }));
              }
            };

            return (
              <div key={label} className="user-section">
                <p>--- {label} ---</p>
                <div
                  className="point-entry-list"
                  style={{ maxHeight: '200px', overflowY: 'auto', paddingRight: '8px' }}
                  onScroll={handleScroll}
                >
                  {visibleItems.map((item, idx) => {
                    const post = item.raw || item;
                    const isReddit = !!post.permalink;
                    const isBluesky = !!post.uri;
                    const title = post.title || post.text || 'Untitled';

                    const postUrl = isReddit
                      ? `https://reddit.com${post.permalink}`
                      : isBluesky
                        ? `https://bsky.app/profile/${post.author?.handle || post.uri?.split('/')[2]}/post/${post.uri?.split('/').pop()}`
                        : null;

                    return (
                      <div key={idx} className="point-entry">
                        <p>
                          {postUrl ? (
                            <a
                              href={postUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="post-link-title"
                            >
                              {title}
                            </a>
                          ) : (
                            title
                          )}
                        </p>
                        <p>Upvotes / Likes: {post.upvotes ?? post.likeCount ?? 0}</p>
                        <p>Comments / Replies: {post.comments ?? post.replyCount ?? 0}</p>
                        {isReddit && post.subreddit && (
                          <p>
                            Subreddit:{' '}
                            <a
                              href={`https://www.reddit.com/r/${post.subreddit}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="post-link"
                            >
                              r/{post.subreddit}
                            </a>
                          </p>
                        )}
                        {isBluesky && post.author?.handle && <p>Author: {post.author.handle}</p>}
                        <p>Created At: {post.createdAt ? new Date(post.createdAt).toLocaleString() : 'N/A'}</p>
                      </div>
                    );
                  })}
                  {visibleItems.length < items.length && (
                    <p className="loading-more-indicator">Scroll to load more...</p>
                  )}
                </div>
              </div>
            );
          })}

        </div>
      )}
    </div>
  );
}

ChartBlock.propTypes = {
  datasets: PropTypes.array.isRequired,
  category: PropTypes.string.isRequired,
};
