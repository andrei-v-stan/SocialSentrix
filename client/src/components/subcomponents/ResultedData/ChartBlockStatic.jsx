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
      case 'week': key = format(date, 'yyyy-ww'); break;
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
        group.sum += item.comments || 0;
      } else if (selectedYAxis === 'upvotes') {
        group.sum += item.upvotes || 0;
      }
      group.posts.push(item);
    } else if (category === 'comments') {
      if (selectedYAxis === 'comments') {
        group.sum += 1;
      } else if (selectedYAxis === 'upvotes') {
        group.sum += item.upvotes || 0;
      }
      group.posts.push(item);
    } else if (category === 'upvotes' || category === 'downvotes') {
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
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [selectedYAxis, setSelectedYAxis] = useState(() => {
    if (category === 'posts') return 'posts';
    if (category === 'comments') return 'comments';
    return 'count';
  });
  const scrollRef = useRef(null);

  const availableYAxisOptions = (() => {
    if (category === 'posts') return ['posts', 'comments', 'upvotes'];
    if (category === 'comments') return ['comments', 'upvotes'];
    return [];
  })();

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

  const mergeDatasetsByTimestamp = (datasets) => {
    const merged = {};

    datasets.forEach(({ label, data }) => {
      data.forEach(({ timestamp, value, items = [] }) => {
        if (!merged[timestamp]) {
          merged[timestamp] = { timestamp, __items: {} };
        }
        merged[timestamp][label] = value;
        merged[timestamp].__items[label] = items;
      });
    });

    return Object.values(merged).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  };


  const mergedData = mergeDatasetsByTimestamp(filteredDatasets);

  const formatXAxis = (tick) => {
    try {
      const date = parseISO(tick);
      switch (granularity) {
        case 'minute':
        case 'hour':
          return format(date, 'HH:mm:ss | dd/MM/yyyy');
        case 'day':
          return format(date, 'dd/MM/yyyy');
        case 'week':
          return `Week ${format(date, 'II')} | ${format(date, 'yyyy')}`;
        case 'month':
          return format(date, 'MM/yyyy');
        case 'year':
          return format(date, 'yyyy');
        default:
          return format(date, 'dd/MM/yyyy');
      }
    } catch {
      return tick;
    }
  };

  const colorForIndex = (idx) => `hsl(${(idx * 60) % 360}, 70%, 50%)`;

  const chartExportData = {
    labels: filteredDatasets.map(d => d.label),
    data: mergedData
  };

  const chartRef = useRef();

  return (
    <div className="chart-block" data-chart={JSON.stringify(chartExportData)}>

      <div className="chart-controls">
        <span>Granularity:</span>
        {['minute', 'hour', 'day', 'week', 'month', 'year'].map(g => (
          <button
            key={g}
            onClick={() => setGranularity(g)}
            className={granularity === g ? 'active' : ''}
          >
            {g}
          </button>
        ))}

        {availableYAxisOptions.length > 0 && (
          <div className="y-axis-controls">
            <span>Y-Axis:</span>
            {availableYAxisOptions.map(option => (
              <button
                key={option}
                onClick={() => setSelectedYAxis(option)}
                className={selectedYAxis === option ? 'active' : ''}
              >
                {option}
              </button>
            ))}
          </div>
        )}

        <div className="date-pickers">
          <div className="single-picker">
            <label>Start</label>
            <DatePicker
              selected={dateRange[0]}
              onChange={(date) => setDateRange([date, dateRange[1]])}
              selectsStart
              startDate={dateRange[0]}
              endDate={dateRange[1]}
              minDate={minDate}
              maxDate={maxDate}
              showTimeSelect={granularity === 'minute' || granularity === 'hour'}
              dateFormat={granularity === 'minute' ? 'dd/MM/yyyy HH:mm' :
                granularity === 'hour' ? 'dd/MM/yyyy HH' :
                  granularity === 'day' ? 'dd/MM/yyyy' :
                    granularity === 'week' || granularity === 'month' ? 'MM/yyyy' :
                      'yyyy'}
              placeholderText="Select start date"
              isClearable
            />
          </div>

          <div className="single-picker">
            <label>End</label>
            <DatePicker
              selected={dateRange[1]}
              onChange={(date) => setDateRange([dateRange[0], date])}
              selectsEnd
              startDate={dateRange[0]}
              endDate={dateRange[1]}
              minDate={minDate}
              maxDate={maxDate}
              showTimeSelect={granularity === 'minute' || granularity === 'hour'}
              dateFormat={granularity === 'minute' ? 'dd/MM/yyyy HH:mm' :
                granularity === 'hour' ? 'dd/MM/yyyy HH' :
                  granularity === 'day' ? 'dd/MM/yyyy' :
                    granularity === 'week' || granularity === 'month' ? 'MM/yyyy' :
                      'yyyy'}
              placeholderText="Select end date"
              isClearable
            />
          </div>
        </div>
      </div>

      <div ref={scrollRef} className='chart-block-horizontal-scroll-container'>
        <div className='chart-block-horizontal-scroll'>
          <div
            ref={chartRef}
            className="chart-capture-target"
          >
            <ResponsiveContainer className="chart-block-container">
              <LineChart
                data={mergedData}
                onClick={(e) => {
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

                    setSelectedPoint({
                      timestamp,
                      groupedItems,
                    });
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" tickFormatter={formatXAxis} tick={{ fontSize: 10 }} />
                <YAxis />
                <Tooltip contentStyle={{}} wrapperClassName="chart-block-point-tooltip"/>
                <Legend />
                {filteredDatasets.map(({ label }, idx) => (
                  <Line
                    key={idx}
                    type="monotone"
                    dataKey={label}
                    name={label}
                    stroke={colorForIndex(idx)}
                    dot
                    isAnimationActive={false}
                    connectNulls={true}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
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
            <button onClick={() => setSelectedPoint(null)}>
              <img src="src/assets/Close Icon.png"></img>
            </button>
          </div>

          {Object.entries(selectedPoint.groupedItems).map(([label, items]) => (
            <div key={label} className="user-section">
              <p>--- {label} ---</p>

              {items.map((item, idx) => {
                const post = item.raw || item;
                return (
                  <div key={idx} className="point-entry">
                    <p>
                      {post.permalink && (
                        <a
                          href={`https://reddit.com${post.permalink}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="post-link-title"
                        >
                          {post.title || post.text || 'Untitled'}
                        </a>
                      )}
                    </p>
                    <p>Upvotes: {post.upvotes ?? 0}</p>
                    <p>Comments: {post.comments ?? 0}</p>
                    {post.subreddit ? (
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
                    ) : (
                      <p>Subreddit: Unknown</p>
                    )}

                    <p>Created At: {post.createdAt ? new Date(post.createdAt).toLocaleString() : 'N/A'}</p>
                  </div>
                );
              })}

            </div>
          ))}

        </div>
      )}

    </div>
  );
}

ChartBlock.propTypes = {
  datasets: PropTypes.array.isRequired,
  category: PropTypes.string.isRequired,
};
