/* eslint-disable no-extra-boolean-cast */
import ReactDOM from 'react-dom'
import { useEffect, useState } from 'react';
import { TbUserQuestion } from 'react-icons/tb';
import { BiSolidUserRectangle } from 'react-icons/bi';
import Popup from '../subcomponents/RegistrationPopup';
import '@/styles/Header.css';

function PopupPortal(props) {
  return ReactDOM.createPortal(
    <Popup {...props} />,
    document.body
  );
}

async function validateSessionCookies({ setIsLoggedIn, setUserID, setSessionID, setFetchedEmail }) {
  try {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/mongodb/validate-cookies`, {
      credentials: 'include',
    });

    const data = await res.json();
    if (data.valid) {
      setIsLoggedIn(true);
      setFetchedEmail(data.email);
      setUserID(data.userID);
      setSessionID(data.sessionID);
    } else {
      setIsLoggedIn(false);
      setFetchedEmail('');
      setUserID('');
      setSessionID('');
    }
    return data.valid;
  } catch (error) {
    console.error('Error validating cookies:', error);
    return false;
  }
}

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
}

function startLoginStatusPolling() {
  const userID = getCookie('userID');
  if (userID) return;

  const checkLoginStatus = async () => {
    if (userID) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/mongodb/check-login-status`, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();

      if (res.status === 403) {
        alert('Login request was denied.');
      } else if (res.status === 404 || res.status === 410) {
        alert('Login request expired.');
      } else if (res.status === 200 && data.status === 'Confirmed') {
        const confirmed = window.confirm(
          'Login confirmed successfully.\n\nWould you like to reload the page now?'
        );

        if (confirmed) {
          window.location.reload();
        }
      }
    } catch (err) {
      console.error('Failed to check login status:', err);
    }
  };

  checkLoginStatus();
  setInterval(checkLoginStatus, 5 * 60 * 1000);
}


export default function Header() {
  const [userID, setUserID] = useState('');
  const [sessionID, setSessionID] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [fetchedEmail, setFetchedEmail] = useState('');
  const [showPopup, setShowPopup] = useState(false);
  const [activeTab, setActiveTab] = useState('login');

  useEffect(() => {
    validateSessionCookies({
      setIsLoggedIn,
      setUserID,
      setSessionID,
      setFetchedEmail
    });
  }, [isLoggedIn]);

  useEffect(() => {
    const sessionID = getCookie('sessionID');
    if (sessionID) {
      startLoginStatusPolling();
    };
  }, []);

  const togglePopup = () => {
    if (isLoggedIn) {
      setShowPopup(prev => !prev);
    } else {
      setShowPopup(prev => {
        if (prev) return false;
        setActiveTab('login');
        return true;
      });
    }
  };

  return (
    <header className="app-header">
      <div className="header-content">
        <div className="header-center">
          <a href="/" className="header-link">
            <img
              src="src/assets/SocialSentrixS.png"
              alt="Clickable image"
              className="header-image-layer"
            />
            <div className="header-text">
              <h2>Social</h2>
              <h2>Sentrix</h2>
            </div>
          </a>
        </div>

        <div className="header-right">
          <button className="icon-button" onClick={togglePopup}>
            {isLoggedIn ? <BiSolidUserRectangle size={24} /> : <TbUserQuestion size={26} />}
          </button>
        </div>
      </div>

      {showPopup && (
        <PopupPortal
          mode={isLoggedIn ? 'user' : (activeTab || 'login')}
          setActiveTab={setActiveTab}
          email={fetchedEmail}
          userID={userID}
          sessionID={sessionID}
          onClose={() => setShowPopup(false)}
        />
      )}
    </header>
  );
}
