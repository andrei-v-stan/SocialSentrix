import PropTypes from 'prop-types';
import { useState, useRef, useEffect } from 'react';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FaRegWindowClose, FaExpandArrowsAlt, FaDownload } from 'react-icons/fa';
import { FaWindowMinimize, FaWindowRestore, FaWindowMaximize } from 'react-icons/fa6';
import { MdPersonAddAlt1, MdPersonOff } from 'react-icons/md';
import DatePicker from 'react-datepicker';
import { format } from 'date-fns';
import SubWindow from './SubWindow';
import ChartBlock from './ChartBlock';
import 'react-datepicker/dist/react-datepicker.css';

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


  const allTimestamps = [
    ...(content?.posts || []),
    ...(content?.comments || [])
  ]
    .map(item => new Date(item.createdAt))
    .filter(date => !isNaN(date));

  const defaultStart = allTimestamps.length
    ? new Date(Math.min(...allTimestamps))
    : new Date('2000-01-01T00:00:00Z');

  const defaultEnd = allTimestamps.length
    ? new Date(Math.max(...allTimestamps))
    : new Date();


  const [startDateSETIC, setStartDateSETIC] = useState(defaultStart.toISOString().slice(0, 16));
  const [endDateSETIC, setEndDateSETIC] = useState(defaultEnd.toISOString().slice(0, 16));
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const dateDropdownRef = useRef(null);
  const dateButtonRef = useRef(null);


  useEffect(() => {
    const handleClickOutside = (e) => {
      const isClickInside =
        dateDropdownRef.current?.contains(e.target) ||
        dateButtonRef.current?.contains(e.target) ||
        document.querySelector('.react-datepicker')?.contains(e.target);

      if (!isClickInside) {
        setShowDateDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);


  const [loadingSetic, setLoadingSetic] = useState(false);
  const handleCalculateSETIC = async () => {
    setLoadingSetic(true);
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('username', username);
      if (startDateSETIC) queryParams.append('start', new Date(startDateSETIC).toISOString());
      if (endDateSETIC) queryParams.append('end', new Date(endDateSETIC).toISOString());

      if (platform === 'reddit') {
        const dryRunParams = new URLSearchParams(queryParams);
        dryRunParams.append('dryRun', 'true');

        const dryRunRes = await fetch(
          `${import.meta.env.VITE_API_URL}/api/${platform}/setic?${dryRunParams.toString()}`,
          { credentials: 'include' }
        );
        const dryRunData = await dryRunRes.json();

        if (dryRunData.error) {
          console.error('SETIC dry run failed:', dryRunData.error);
          alert(`Error: ${dryRunData.error}`);
          return;
        }

        const { status, etaSeconds, etaMaxSeconds } = dryRunData;

        let message = '';
        switch (status) {
          case 'loggedInWithToken':
            message = `✅ You are logged in with a valid Reddit token.\n⌛ Estimated time: ${etaSeconds}s ~ ${etaMaxSeconds}s.\n\nProceed?`;
            break;
          case 'loggedInNoToken':
            message = `⚠️ No Reddit token found.\n⏳ Estimated time: ${etaSeconds}s ~ ${etaMaxSeconds}s.\n\nProceed anyway?`;
            break;
          case 'notLoggedIn':
          default:
            message = `⚠️ You are not logged in.\n⏳ Estimated time: ${etaSeconds}s ~ ${etaMaxSeconds}s.\n\nProceed anyway?`;
            break;
        }

        const proceed = window.confirm(message);
        if (!proceed) return;
      }

      const fullRes = await fetch(
        `${import.meta.env.VITE_API_URL}/api/${platform}/setic?${queryParams.toString()}`,
        { credentials: 'include' }
      );

      const data = await fullRes.json();
      if (data.error) {
        console.error('SETIC calculation failed:', data.error);
      } else {
        setSeticResult(data);
      }
    } catch (error) {
      console.error('SETIC fetch error:', error);
    } finally {
      setLoadingSetic(false);
    }
  };

  const [showSETICBreakdown, setShowSETICBreakdown] = useState(false);
  const [showSentimentBreakdown, setShowSentimentBreakdown] = useState(false);
  const [showEngagementBreakdown, setShowEngagementBreakdown] = useState(false);
  const [showTrustworthinessBreakdown, setShowTrustworthinessBreakdown] = useState(false);
  const [showInfluenceBreakdown, setShowInfluenceBreakdown] = useState(false);
  const [showConsistencyBreakdown, setShowConsistencyBreakdown] = useState(false);

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

  function formatNumber(value) {
    const rounded = Math.ceil(value * 100) / 100;
    return Number.isInteger(rounded) ? rounded : rounded.toFixed(2);
  }

  const formatDateTime = (isoString) => {
    if (!isoString) return 'N/A';
    const date = new Date(isoString);
    const time = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    const day = date.toLocaleDateString('en-GB');
    return `${time} ${day}`;
  };


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
                      title="SETIC Calculator"
                      onClose={() => closeGraph(category)}
                      compareModeList={globalCompareList}
                      toggleCompare={toggleSubwindowCompare}
                    >
                      <div className="setic-wrapper">

                        <div className="dropdown-group" ref={dateDropdownRef}>
                          <button
                            ref={dateButtonRef}
                            onClick={() => setShowDateDropdown(prev => !prev)}
                          >
                            Date
                          </button>
                          <div style={{ textAlign: 'center' }}>
                            {startDateSETIC ? format(new Date(startDateSETIC), 'dd/MM/yyyy') : 'Start'}{' '}-{' '}
                            {endDateSETIC ? format(new Date(endDateSETIC), 'dd/MM/yyyy') : 'End'}
                          </div>

                          {showDateDropdown && (
                            <div
                              ref={dateDropdownRef}
                              className="dropdown-panel date-panel absolute"
                            >
                              <div className="date-row">
                                <label className="date-label">Start</label>
                                <DatePicker
                                  portalId="datepicker-portal"
                                  selected={startDateSETIC ? new Date(startDateSETIC) : null}
                                  onChange={(date) =>
                                    setStartDateSETIC(date ? date.toISOString() : defaultStart.toISOString())
                                  }
                                  selectsStart
                                  startDate={startDateSETIC ? new Date(startDateSETIC) : null}
                                  endDate={endDateSETIC ? new Date(endDateSETIC) : null}
                                  showTimeSelect
                                  dateFormat="dd/MM/yyyy HH:mm"
                                  placeholderText="Select start date"
                                  isClearable
                                  className="w-full"
                                />
                              </div>
                              <div className="date-row">
                                <label className="date-label">End</label>
                                <DatePicker
                                  portalId="datepicker-portal"
                                  selected={endDateSETIC ? new Date(endDateSETIC) : null}
                                  onChange={(date) =>
                                    setEndDateSETIC(date ? date.toISOString() : defaultEnd.toISOString())
                                  }
                                  selectsEnd
                                  startDate={startDateSETIC ? new Date(startDateSETIC) : null}
                                  endDate={endDateSETIC ? new Date(endDateSETIC) : null}
                                  showTimeSelect
                                  dateFormat="dd/MM/yyyy HH:mm"
                                  placeholderText="Select end date"
                                  isClearable
                                  className="w-full"
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        <button onClick={handleCalculateSETIC} disabled={loadingSetic}>
                          {loadingSetic ? <span className="loading-spinner"></span> : 'Calculate SETIC'}
                        </button>

                        {seticResult && (
                          <div className="setic-result">
                            {seticResult && (
                              <div className="setic-result">
                                {platform === 'reddit' && (
                                  <>
                                    <div
                                      className="setic-bar-wrapper clickable"
                                      onClick={() => setShowSETICBreakdown(prev => !prev)}
                                      style={{ cursor: 'pointer' }}
                                    >
                                      <div className="setic-bar-label">Reputation: {seticResult.R ?? 'N/A'}%</div>
                                      <div className="setic-bar-track reputation">
                                        <div
                                          className="setic-bar-fill R"
                                          style={{ width: `${seticResult.R || 0}%` }}
                                        />
                                      </div>
                                    </div>

                                    {showSETICBreakdown && (
                                      <>
                                        <div
                                          className="setic-bar-wrapper clickable mt-4"
                                          onClick={() => setShowSentimentBreakdown(prev => !prev)}
                                        >
                                          <div className="setic-bar-label">
                                            Sentiment: {seticResult.S?.score ?? 'N/A'}%
                                            {showSentimentBreakdown && seticResult.S?.label ? ` (${seticResult.S.label})` : ''}
                                          </div>
                                          <div className="setic-bar-track">
                                            {showSentimentBreakdown ? (
                                              <>
                                                <div className="setic-bar-fill relative setic-bar-fill-posts">
                                                  <span className="setic-bar-label-text">
                                                    Posts: {seticResult.S?.avgPosts || 0}%
                                                  </span>
                                                </div>
                                                <div className="setic-bar-fill relative setic-bar-fill-comments">
                                                  <span className="setic-bar-label-text">
                                                    Comments: {seticResult.S?.avgComments || 0}%
                                                  </span>
                                                </div>
                                              </>
                                            ) : (
                                              <div
                                                className="setic-bar-fill S"
                                                style={{ width: `${seticResult.S?.score || 0}%` }}
                                              />
                                            )}
                                          </div>
                                        </div>

                                        {showSentimentBreakdown && seticResult.S?.perSubreddit && (
                                          <div className="sentiment-breakdown">
                                            <p>Subreddit Sentiment Breakdown</p>
                                            <ul className="list-disc list-inside">
                                              {Object.entries(seticResult.S.perSubreddit)
                                                .sort((a, b) => b[1] - a[1])
                                                .map(([subreddit, score]) => (
                                                  <li key={subreddit}>
                                                    <strong>r/{subreddit}</strong> ({score}%)
                                                  </li>
                                                ))}
                                            </ul>
                                          </div>
                                        )}

                                        <div
                                          className="setic-bar-wrapper clickable mt-4"
                                          onClick={() => setShowEngagementBreakdown(prev => !prev)}
                                        >
                                          <div className="setic-bar-label">
                                            Engagement: {seticResult.E?.score ?? 'N/A'}%
                                          </div>
                                          <div className="setic-bar-track">
                                            <div
                                              className="setic-bar-fill E"
                                              style={{ width: `${seticResult.E?.score || 0}%` }}
                                            />
                                          </div>
                                        </div>

                                        {showEngagementBreakdown && seticResult.E?.perSubredditStats && (
                                          <div className="setic-engagement-wrapper">
                                            <p className="setic-engagement-heading">
                                              <strong>
                                                Subreddit Engagement Stats
                                              </strong>
                                            </p>
                                            <div className="setic-table-scroll">
                                              <table className="setic-engagement-table">
                                                <thead>
                                                  <tr>
                                                    <th>Subreddit</th>
                                                    <th>Avg Upvotes</th>
                                                    <th>Median Upvotes</th>
                                                    <th>Avg Comments</th>
                                                    <th>Median Comments</th>
                                                  </tr>
                                                </thead>
                                                <tbody>
                                                  {Object.entries(seticResult.E.perSubredditStats).map(([sub, stats]) => (
                                                    <tr key={sub}>
                                                      <td>{sub}</td>
                                                      <td>{formatNumber(stats.avgUpvotes)}</td>
                                                      <td>{formatNumber(stats.medianUpvotes)}</td>
                                                      <td>{formatNumber(stats.avgComments)}</td>
                                                      <td>{formatNumber(stats.medianComments)}</td>
                                                    </tr>
                                                  ))}
                                                </tbody>
                                              </table>
                                            </div>
                                            <div className="setic-engagement-summary mt-2">
                                              <br />
                                              <p><strong>Deleted Content:</strong> {formatNumber(seticResult.E.deletionStats?.deletedCount)} / {formatNumber(seticResult.E.deletionStats?.totalCount)} ({formatNumber(seticResult.E.deletionStats?.percentage)}%)</p>
                                              <p><strong>Duplicate Rate:</strong> {formatNumber(seticResult.E.duplicationStats?.duplicateRate)}%</p>
                                              <p><strong>Diversity:</strong> {formatNumber(seticResult.E.diversityScore?.posts)} Posts, {formatNumber(seticResult.E.diversityScore?.comments)} Comments</p>
                                            </div>
                                          </div>
                                        )}

                                        <div
                                          className="setic-bar-wrapper clickable mt-4"
                                          onClick={() => setShowTrustworthinessBreakdown(prev => !prev)}
                                        >
                                          <div className="setic-bar-label">
                                            Trustworthiness: {seticResult.T?.score ?? 'N/A'}%
                                          </div>
                                          <div className="setic-bar-track">
                                            <div
                                              className="setic-bar-fill T"
                                              style={{ width: `${seticResult.T?.score || 0}%` }}
                                            />
                                          </div>
                                        </div>

                                        {showTrustworthinessBreakdown && (
                                          <div className="setic-trust-breakdown">
                                            <p><strong>Verified Email:</strong> {seticResult.T?.has_verified_email ? 'Yes' : 'No'}</p>
                                            <p><strong>Premium:</strong> {seticResult.T?.is_gold ? 'Yes' : 'No'}</p>
                                            <p><strong>Badges:</strong> {seticResult.T?.badges?.length ?? 0}</p>
                                            <p><strong>Trophies:</strong> {seticResult.T?.trophies?.length ?? 0}</p>
                                            <p><strong>Account Age:</strong> {seticResult.T?.ageYears?.toFixed(2)} years</p>
                                            <ul className="list-disc list-inside">
                                              {seticResult.T?.moderatedSubs?.map(sub => (
                                                <li key={sub.name}>{sub.name} — {sub.members}</li>
                                              ))}
                                            </ul>
                                          </div>
                                        )}

                                        <div
                                          className="setic-bar-wrapper clickable mt-4"
                                          onClick={() => setShowInfluenceBreakdown(prev => !prev)}
                                        >
                                          <div className="setic-bar-label">
                                            Influence: {seticResult.I?.score ?? 'N/A'}%
                                          </div>
                                          <div className="setic-bar-track">
                                            <div
                                              className="setic-bar-fill I"
                                              style={{ width: `${seticResult.I?.score || 0}%` }}
                                            />
                                          </div>
                                        </div>

                                        {showInfluenceBreakdown && (
                                          <div className="setic-influence-breakdown">
                                            <p><strong>Post Karma:</strong> {formatNumber(seticResult.I?.postKarma)}</p>
                                            <p><strong>Comment Karma:</strong> {formatNumber(seticResult.I?.commentKarma)}</p>
                                            <p><strong>Total Audience (mod subs):</strong> {formatNumber(seticResult.I?.totalMembers)}</p>
                                          </div>
                                        )}

                                        <div
                                          className="setic-bar-wrapper clickable mt-4"
                                          onClick={() => setShowConsistencyBreakdown(prev => !prev)}
                                        >
                                          <div className="setic-bar-label">
                                            Consistency: {seticResult.C?.score ?? 'N/A'}%
                                          </div>
                                          <div className="setic-bar-track">
                                            <div
                                              className="setic-bar-fill C"
                                              style={{ width: `${seticResult.C?.score || 0}%` }}
                                            />
                                          </div>
                                        </div>

                                        {showConsistencyBreakdown && (
                                          <div className="setic-consistency-breakdown">
                                            <p><strong>Activity Span: </strong>
                                              {formatDateTime(seticResult.C.activitySpan?.start)} — {formatDateTime(seticResult.C.activitySpan?.end)}
                                            </p>
                                            <p><strong>Active Weeks:</strong> {seticResult.C?.activeWeeks} / {seticResult.C?.totalWeeks}</p>
                                            <p><strong>Inactive Weeks:</strong> {seticResult.C?.inactiveWeeks}</p>
                                            <p><strong>Variation (CV):</strong> {seticResult.C?.cv?.toFixed(2)}</p>
                                            <p><strong>Last Active:</strong> {formatDateTime(seticResult.C.lastActive)}</p>
                                          </div>
                                        )}
                                      </>
                                    )}
                                  </>
                                )}
                              </div>
                            )}

                            {platform === 'bluesky' && (
                              <>
                                <div
                                  className="setic-bar-wrapper clickable"
                                  onClick={() => setShowSETICBreakdown(prev => !prev)}
                                  style={{ cursor: 'pointer' }}
                                >
                                  <div className="setic-bar-label">Reputation: {seticResult.R ?? 'N/A'}%</div>
                                  <div className="setic-bar-track reputation">
                                    <div
                                      className="setic-bar-fill R"
                                      style={{ width: `${seticResult.R || 0}%` }}
                                    />
                                  </div>
                                </div>

                                {showSETICBreakdown && (
                                  <>
                                    <div
                                      className="setic-bar-wrapper clickable mt-4"
                                      onClick={() => setShowSentimentBreakdown(prev => !prev)}
                                    >
                                      <div className="setic-bar-label">
                                        Sentiment: {seticResult.S?.score ?? 'N/A'}%
                                        {showSentimentBreakdown && seticResult.S?.label ? ` (${seticResult.S.label})` : ''}
                                      </div>
                                      <div className="setic-bar-track">
                                        {showSentimentBreakdown ? (
                                          <>
                                            <div className="setic-bar-fill relative setic-bar-fill-posts">
                                              <span className="setic-bar-label-text">
                                                Posts: {seticResult.S?.avgPosts ?? 'N/A'}%
                                              </span>
                                            </div>
                                            <div className="setic-bar-fill relative setic-bar-fill-comments">
                                              <span className="setic-bar-label-text">
                                                Comments: {seticResult.S?.avgComments ?? 'N/A'}%
                                              </span>
                                            </div>
                                          </>
                                        ) : (
                                          <div
                                            className="setic-bar-fill S"
                                            style={{ width: `${seticResult.S?.score || 0}%` }}
                                          />
                                        )}
                                      </div>
                                    </div>

                                    {showSentimentBreakdown && (
                                      (seticResult.S?.n || 0) === 0 ? (
                                        <p className="text-sm italic text-gray-500">No data available for sentiment analysis.</p>
                                      ) : (
                                        <div className="setic-sentiment-breakdown">
                                          <p><strong>Items Analyzed:</strong> {seticResult.S.n}</p>
                                          <p><strong>Interpretation:</strong> {seticResult.S.label}</p>
                                          <p><strong>Post Avg:</strong> {formatNumber(seticResult.S.avgPosts)}%</p>
                                          <p><strong>Comment Avg:</strong> {formatNumber(seticResult.S.avgComments)}%</p>
                                        </div>
                                      )
                                    )}

                                    <div
                                      className="setic-bar-wrapper clickable mt-4"
                                      onClick={() => setShowEngagementBreakdown(prev => !prev)}
                                    >
                                      <div className="setic-bar-label">
                                        Engagement: {seticResult.E?.score ?? 'N/A'}%
                                      </div>
                                      <div className="setic-bar-track">
                                        <div
                                          className="setic-bar-fill E"
                                          style={{ width: `${seticResult.E?.score || 0}%` }}
                                        />
                                      </div>
                                    </div>

                                    {showEngagementBreakdown && (
                                      (seticResult.E?.totalCount || 0) === 0 ? (
                                        <div className="setic-engagement-wrapper">
                                          <p className="text-sm italic text-gray-500">No user activity during selected period.</p>
                                        </div>
                                      ) : (
                                        <div className="setic-engagement-wrapper">
                                          <p><strong>Total Posts/Reposts/Comments:</strong> {seticResult.E.totalCount}</p>
                                          <p><strong>Likes:</strong> {formatNumber(seticResult.E.likes)}</p>
                                          <p><strong>Replies:</strong> {formatNumber(seticResult.E.replies)}</p>
                                          <p><strong>Reposts:</strong> {formatNumber(seticResult.E.reposts)}</p>
                                          <p><strong>Engagement Ratio:</strong> {seticResult.E.engagementRatio}</p>
                                        </div>
                                      )
                                    )}

                                    <div
                                      className="setic-bar-wrapper clickable mt-4"
                                      onClick={() => setShowTrustworthinessBreakdown(prev => !prev)}
                                    >
                                      <div className="setic-bar-label">
                                        Trustworthiness: {seticResult.T?.score ?? 'N/A'}%
                                      </div>
                                      <div className="setic-bar-track">
                                        <div
                                          className="setic-bar-fill T"
                                          style={{ width: `${seticResult.T?.score || 0}%` }}
                                        />
                                      </div>
                                    </div>

                                    {showTrustworthinessBreakdown && (
                                      <div className="setic-trust-breakdown">
                                        <p><strong>Followers:</strong> {formatNumber(seticResult.T?.followerCount ?? 0)}</p>
                                        <p><strong>Following:</strong> {formatNumber(seticResult.T?.followingCount ?? 0)}</p>
                                        <p><strong>Custom Domain:</strong> {seticResult.T?.externalDomain ? 'Yes' : 'No'}</p>
                                      </div>
                                    )}

                                    <div
                                      className="setic-bar-wrapper clickable mt-4"
                                      onClick={() => setShowInfluenceBreakdown(prev => !prev)}
                                    >
                                      <div className="setic-bar-label">
                                        Influence: {seticResult.I?.score ?? 'N/A'}%
                                      </div>
                                      <div className="setic-bar-track">
                                        <div
                                          className="setic-bar-fill I"
                                          style={{ width: `${seticResult.I?.score || 0}%` }}
                                        />
                                      </div>
                                    </div>

                                    {showInfluenceBreakdown && (
                                      <div className="setic-influence-breakdown">
                                        <p><strong>Total Posts/Reposts:</strong> {seticResult.I?.contentCount}</p>
                                        <p><strong>Total Likes:</strong> {seticResult.I?.totalLikes}</p>
                                        <p><strong>Total Reposts:</strong> {seticResult.I?.totalReposts}</p>
                                        <p><strong>Avg Impact/Post:</strong> {seticResult.I?.avgImpact}</p>
                                        <p><strong>Follower Count:</strong> {formatNumber(seticResult.I?.followerCount)}</p>
                                      </div>
                                    )}

                                    <div
                                      className="setic-bar-wrapper clickable mt-4"
                                      onClick={() => setShowConsistencyBreakdown(prev => !prev)}
                                    >
                                      <div className="setic-bar-label">
                                        Consistency: {seticResult.C?.score ?? 'N/A'}%
                                      </div>
                                      <div className="setic-bar-track">
                                        <div
                                          className="setic-bar-fill C"
                                          style={{ width: `${seticResult.C?.score || 0}%` }}
                                        />
                                      </div>
                                    </div>
                                    {showConsistencyBreakdown && (
                                      (seticResult.C?.totalWeeks || 0) === 0 ? (
                                        <p className="text-sm italic text-gray-500">No posting activity detected.</p>
                                      ) : (
                                        <div className="setic-consistency-breakdown">
                                          <p><strong>Activity Span:</strong> {formatDateTime(seticResult.C.activitySpan.start)} — {formatDateTime(seticResult.C.activitySpan.end)}</p>
                                          <p><strong>Active Weeks:</strong> {seticResult.C.activeWeeks} / {seticResult.C.totalWeeks}</p>
                                          <p><strong>Inactive Weeks:</strong> {seticResult.C.inactiveWeeks}</p>
                                          <p><strong>Variation (CV):</strong> {formatNumber(seticResult.C.cv)}</p>
                                          <p><strong>Last Active:</strong> {formatDateTime(seticResult.C.lastActive)}</p>
                                        </div>
                                      )
                                    )}
                                  </>
                                )}
                              </>
                            )}

                            {platform !== 'reddit' && platform !== 'bluesky' && (
                              <>
                                <p>- Platform-Agnostic S.E.T.I.C. -</p>
                                {Object.entries({
                                  Sentiment: seticResult.S,
                                  Engagement: seticResult.E,
                                  Trustworthiness: seticResult.T,
                                  Influence: seticResult.I,
                                  Consistency: seticResult.C,
                                }).map(([label, value]) =>
                                  typeof value === 'number' ? renderSETICBar(label, value) : null
                                )}
                              </>
                            )}
                          </div>
                        )}
                      </div>
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

{/*
    <div className="setic-wrapper flex flex-col items-center gap-4 relative">
      <button
        onClick={() => {
          setStartDateSETIC(defaultStart.toISOString());
          setEndDateSETIC(defaultEnd.toISOString());
        }}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
      >
        Reset Dates
      </button>

      <div className="datepicker-stack">
        <div className="datepicker-wrapper">
          <div className="datepicker-display">
            {startDateSETIC ? format(new Date(startDateSETIC), 'dd/MM/yyyy HH:mm') : 'Select Start'}
          </div>
          <div className="datepicker-invisible">
            <DatePicker
              label=""
              value={new Date(startDateSETIC)}
              onSelectDate={(date) =>
                setStartDateSETIC(date ? date.toISOString() : defaultStart.toISOString())
              }
              showTimePicker
              allowTextInput
            />
          </div>
        </div>

        <div className="datepicker-wrapper">
          <div className="datepicker-display">
            {endDateSETIC ? format(new Date(endDateSETIC), 'dd/MM/yyyy HH:mm') : 'Select End'}
          </div>
          <div className="datepicker-invisible">
            <DatePicker
              label=""
              value={new Date(endDateSETIC)}
              onSelectDate={(date) =>
                setEndDateSETIC(date ? date.toISOString() : defaultEnd.toISOString())
              }
              showTimePicker
              allowTextInput
            />
          </div>
        </div>
      </div>

      <button
        onClick={handleCalculateSETIC}
        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
      >
        Calculate SETIC
      </button>
    </div>  
  */}