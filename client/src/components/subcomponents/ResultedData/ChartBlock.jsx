import { useState, useRef, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, parseISO } from 'date-fns';
import DatePicker from 'react-datepicker';
import PropTypes from 'prop-types';
import 'react-datepicker/dist/react-datepicker.css';


const groupBy = (data, interval) => {
    const grouped = new Map();
    data.forEach(item => {
      const date = new Date(item.timestamp);
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
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(item);
    });
  
    return Array.from(grouped.entries())
      .map(([timestamp, items]) => ({
        timestamp,
        value: items.length,
        items
      }))
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  };
  

  export default function ChartBlock({ rawData }) {
    const [granularity, setGranularity] = useState('month');
    const [pointSpacing, setPointSpacing] = useState(60);
    const [dateRange, setDateRange] = useState([null, null]);
    const [minDate, setMinDate] = useState(null);
    const [maxDate, setMaxDate] = useState(null);
    const [selectedPoint, setSelectedPoint] = useState(null);
  
    const scrollRef = useRef(null);
  
    useEffect(() => {
      if (rawData.length > 0 && (!minDate || !maxDate)) {
        const timestamps = rawData.map(r => parseISO(r.createdAt)).sort((a, b) => a - b);
        setMinDate(timestamps[0]);
        setMaxDate(timestamps[timestamps.length - 1]);
        setDateRange([timestamps[0], timestamps[timestamps.length - 1]]);
      }
    }, [rawData, minDate, maxDate]);
  
    const filteredData = (() => {
      if (!rawData.length) return [];
      const items = rawData.map((item, i) => ({
        index: i,
        timestamp: format(new Date(item.createdAt), "yyyy-MM-dd'T'HH:mm:ss.SSS"),
        value: item.upvotes || item.comments || 1,
        label: item.title || item.text || 'Untitled',
        raw: item
      }));
  
      const [start, end] = dateRange;
      const filtered = items.filter(r => {
        const date = parseISO(r.timestamp);
        if (!start || !end) return true;
        return date >= start && date <= end;
      });
  
      return groupBy(filtered, granularity, 'count');
    })();
  
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
  
    return (
      <div className="chart-block">
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
  
          <div className="zoom-controls">
            <strong>Zoom:</strong>
            <button onClick={() => setPointSpacing(prev => Math.max(5, prev - 10))}>-</button>
            <input
              type="number"
              value={pointSpacing}
              min={5}
              step={10}
              onChange={(e) => setPointSpacing(Math.max(5, parseInt(e.target.value) || 5))}
            />
            <button onClick={() => setPointSpacing(prev => prev + 10)}>+</button>
          </div>
  
          <div className="date-pickers">
            <div className="single-picker">
              <label>Start</label>
              <DatePicker
                selected={dateRange[0]}
                onChange={(date) => {
                  const endDate = dateRange[1];
                  if (!date) {
                    setDateRange([minDate, endDate]);
                  } else if (endDate && date > endDate) {
                    setDateRange([endDate, date]);
                  } else {
                    setDateRange([date, endDate]);
                  }
                }}
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
                onChange={(date) => {
                  const startDate = dateRange[0];
                  if (!date) {
                    setDateRange([startDate, maxDate]);
                  } else if (startDate && date < startDate) {
                    setDateRange([date, startDate]);
                  } else {
                    setDateRange([startDate, date]);
                  }
                }}
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
  
        <div
          ref={scrollRef}
          style={{ overflowX: 'auto', overflowY: 'hidden', marginTop: '10px' }}
        >
          <div style={{ minWidth: `${Math.max(filteredData.length * pointSpacing, 800)}px`, height: '250px', position: 'relative' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={filteredData}
                onClick={(e) => {
                  if (e && e.activePayload) {
                    setSelectedPoint({
                      timestamp: e.activeLabel,
                      items: e.activePayload[0]?.payload.items || []
                    });
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" tickFormatter={formatXAxis} tick={{ fontSize: 10 }} />
                <YAxis />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e1e1e',
                    border: '1px solid #444',
                    borderRadius: '8px',
                    color: '#eee',
                    fontSize: '0.85rem',
                    boxShadow: '0 0 8px rgba(0, 0, 0, 0.6)'
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#8884d8"
                  dot
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
  
            {filteredData.length === 0 && (
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                color: '#aaa',
                fontSize: '1rem',
                textAlign: 'center',
                pointerEvents: 'none'
              }}>
                No data for selected time range
              </div>
            )}
          </div>
        </div>
  
        {selectedPoint && (
          <div className="point-details dark-mode">
            <h5>Data for {selectedPoint.timestamp}</h5>
            {selectedPoint.items.map((item, idx) => (
              <div key={idx} className="point-entry">
                <strong>{item.label}</strong>
                <pre>{JSON.stringify(item.raw, null, 2)}</pre>
              </div>
            ))}
            <button onClick={() => setSelectedPoint(null)}>Close</button>
          </div>
        )}
      </div>
    );
  }
  
  ChartBlock.propTypes = {
    rawData: PropTypes.array.isRequired,
    category: PropTypes.string.isRequired,
  };