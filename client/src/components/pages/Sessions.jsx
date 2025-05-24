import { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '@/styles/sessions.css';

export default function Sessions() {
  const [grouped, setGrouped] = useState({});
  const [selectedSession, setSelectedSession] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminSessions, setAdminSessions] = useState([]);
  const navigate = useNavigate();
  const detailRef = useRef(null);

  const requestAdminPermission = async () => {
    await fetch(`${import.meta.env.VITE_API_URL}/api/mongodb/request-session-admin`, {
      method: 'POST',
      credentials: 'include'
    });
    alert('Admin request submitted.');
    navigate('/');
  };

  const removeAdminAccess = async (sessionID) => {
    const confirm = window.confirm(`Are you sure you want to revoke admin access for session ${sessionID}?`);
    if (!confirm) return;

    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/mongodb/remove-session-admin`, {
      method: 'DELETE',
      credentials: 'include'
    });

    const result = await res.json();
    alert(result.message || result.error);
    setAdminSessions((prev) => prev.filter(s => s !== sessionID));
    setSelectedSession(null);
    CheckSession();
  };

  const groupSessions = (sessions) => {
    const groups = {};
    sessions.forEach(session => {
      if (!groups[session.status]) groups[session.status] = [];
      groups[session.status].push(session);
    });
    return groups;
  };

  const CheckSession = async () => {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/mongodb/check-session-permission`, {
      credentials: 'include'
    });
    const result = await response.json();

    setIsAdmin(result.isAdmin);

    if (!result.isAdmin) {
      const confirmRequest = window.confirm('You are not authorized to view this page. Would you like to request admin access?');
      if (confirmRequest) {
        await requestAdminPermission();
      } else {
        navigate('/');
      }
    } else {
      const [sessionRes, adminListRes] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL}/api/mongodb/get-sessions`, { credentials: 'include' }),
        fetch(`${import.meta.env.VITE_API_URL}/api/mongodb/get-admin-sessions`, { credentials: 'include' })
      ]);
      const sessionData = await sessionRes.json();
      const adminList = await adminListRes.json();
      setGrouped(groupSessions(sessionData));
      setAdminSessions(adminList.adminSessions || []);
    }
  };

  useEffect(() => {
    CheckSession();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (detailRef.current && !detailRef.current.contains(event.target)) {
        setSelectedSession(null);
      }
    };

    if (selectedSession) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [selectedSession]);


  const statusMap = {
    'Confirmed': 'Confirmed ✅',
    'Pending': 'Pending ⏳',
    'Expired': 'Expired 🕒',
    'Denied': 'Denied ⛔',
  };
  const statusButtonClassMap = {
    'Denied': 'btn-red',
    'Expired': 'btn-gray',
    'Pending': 'btn-orange',
  };

  const statusOrder = ['Confirmed', 'Pending', 'Expired', 'Denied'];



  return (
    <div className="sessions-container">
      <h2 className="sessions-title">Session Requests</h2>

      {isAdmin && (
        <div className="button-row">
          {['Pending', 'Expired', 'Denied'].map((status) => (
            <button
              key={status}
              className={statusButtonClassMap[status]}
              onClick={async () => {
                const confirm = window.confirm(`Delete all "${status}" sessions linked to your email?`);
                if (!confirm) return;
                const res = await fetch(`${import.meta.env.VITE_API_URL}/api/mongodb/delete-sessions-by-status?status=${status}`, {
                  method: 'DELETE',
                  credentials: 'include'
                });
                const data = await res.json();
                alert(data.message || data.error);
                CheckSession();
              }}
            >
              Delete All {statusMap[status]}
            </button>
          ))}


        </div>
      )}

      {statusOrder.map((status) => (
        grouped[status] ? (
          <div key={status} className="status-group">
            <h3 className="status-header">{statusMap[status]}</h3>

            <ul className="session-list">
              {grouped[status].map(session => (
                <li
                  key={session.sessionID}
                  onClick={() => setSelectedSession(session)}
                  className="session-item"
                >
                  {session.sessionID}
                </li>
              ))}
            </ul>
          </div>
        ) : null
      ))}

      {selectedSession && (
        <div className="session-detail" ref={detailRef}>
          <div className="session-header">
            <h3 className="session-detail-title">Session Details</h3>
            <div className="button-group">
              <button
                className="btn-red"
                onClick={async () => {
                  const confirm = window.confirm(`Delete session ${selectedSession.sessionID}?`);
                  if (!confirm) return;

                  const res = await fetch(`${import.meta.env.VITE_API_URL}/api/mongodb/delete-session/${selectedSession.sessionID}`, {
                    method: 'DELETE',
                    credentials: 'include'
                  });

                  const data = await res.json();
                  alert(data.message || data.error);

                  if (data.isOwnSession) {
                    navigate('/');
                    return;
                  }

                  setSelectedSession(null);
                  CheckSession();
                }}

              >
                Delete Session
              </button>

              {adminSessions.includes(selectedSession.sessionID) && (
                <button
                  className="btn-purple"
                  onClick={() => removeAdminAccess(selectedSession.sessionID)}
                >
                  Revoke Admin Access
                </button>
              )}
            </div>
          </div>
          <div className="session-details-wrapper">
            <div className="session-details-status">
              {statusMap[selectedSession.status] || selectedSession.status}
            </div>

            <div className="session-details-block">
              <div>
                <div className="session-details-label">Session ID</div>
                <div className="session-details-value">{selectedSession.sessionID}</div>
              </div>
              <div>
                <div className="session-details-label">Name</div>
                <div className="session-details-value">{selectedSession.name}</div>
              </div>
              <div>
                <div className="session-details-label">Comment</div>
                <div className="session-details-value">{selectedSession.comment || 'N/A'}</div>
              </div>
              <div>
                <div className="session-details-label">Created At</div>
                <div className="session-details-value">{new Date(selectedSession.createdAt).toLocaleString()}</div>
              </div>
            </div>

            <div className="session-details-block">
              <div>
                <div className="session-details-label">User Agent</div>
                <div className="session-details-value">{selectedSession.userAgent}</div>
              </div>
              <div>
                <div className="session-details-label">IP Address</div>
                <div className="session-details-value">{selectedSession.ip}</div>
              </div>
              <div>
                <div className="session-details-label">Location</div>
                <div className="session-details-value">{selectedSession.location}</div>
              </div>
              <div>
                <div className="session-details-label">Expires At</div>
                <div className="session-details-value">{new Date(selectedSession.expiresAt).toLocaleString()}</div>
              </div>
            </div>

          </div>

        </div>
      )}
    </div>
  );
}