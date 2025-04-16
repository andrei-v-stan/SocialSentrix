import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import '@/styles/Redir.css';

const Redir = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const code = params.get('code') || '404';
  const message = params.get('message') || 'Page Not Found';
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    const timeout = setTimeout(() => {
      navigate('/');
    }, countdown * 1000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [navigate]);

  useEffect(() => {
    if (countdown <= 0) {
      navigate('/');
    }
  }, [countdown, navigate]);

  return (
    <div id="redirect-section">
      <h1>⚠️ Woops ⚠️</h1>
      <h2>How did we get here❓</h2>
      <h3>Error code</h3>
      <h4>{code}</h4>
      <h3>Error message</h3>
      <h4>{message}</h4>
      <h5>Redirecting to the main page in {countdown} second{countdown !== 1 && 's'}...</h5>
    </div>
  );
};

export default Redir;
