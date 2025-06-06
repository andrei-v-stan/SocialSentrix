import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import '@/styles/redir.css';

const Redir = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const { code, message } = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return {
      code: params.get('code') || '404',
      message: params.get('message') || 'Page Not Found',
    };
  }, [location.search]);

  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    if (countdown <= 0) {
      navigate('/');
    } else {
      const interval = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [countdown, navigate]);

  return (
    <div className="redir-container">
      <p className="redir-title">⚠️Woops⚠️</p>
      <p className="redir-subtitle">How did we get here?</p>
      <div className="redir-info">
        <p className="redir-label">Error Code</p>
        <p className="redir-value">{code}</p>
      </div>
      <div className="redir-info">
        <p className="redir-label">Error Message</p>
        <p className="redir-text">{message}</p>
      </div>
      <p className="redir-redirect">
        Redirecting to the homepage in <b>{countdown}</b> second{countdown !== 1 && 's'}...
      </p>
      <p className="redir-redirect2">(Or click on the header to instantly go back to the homepage)</p>
    </div>
  );
};

export default Redir;