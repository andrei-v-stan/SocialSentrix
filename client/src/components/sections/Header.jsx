import '@/styles/Header.css';
import { useEffect, useState } from 'react';
import { TbUserQuestion } from 'react-icons/tb';
import { BiSolidUserRectangle } from 'react-icons/bi';

export default function Header() {
  const [showPopup, setShowPopup] = useState(false);
  const [activeTab, setActiveTab] = useState('login');

  const [email, setEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [emailValid, setEmailValid] = useState(true);
  const [emailsMatch, setEmailsMatch] = useState(true);
  const [emailTouched, setEmailTouched] = useState(false);
  const [confirmTouched, setConfirmTouched] = useState(false);
  const [emailExists, setEmailExists] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [registrationError, setRegistrationError] = useState('');

  const [loginEmail, setLoginEmail] = useState('');
  const [loginName, setLoginName] = useState('');
  const [loginComment, setLoginComment] = useState('');
  const [loginEmailValid, setLoginEmailValid] = useState(true);
  const [loginTouched, setLoginTouched] = useState(false);
  const [loginNameTouched, setLoginNameTouched] = useState(false);
  const [loginEmailNotFound, setLoginEmailNotFound] = useState(false);
  const [loginRequestSent, setLoginRequestSent] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [pollingIntervalId, setPollingIntervalId] = useState(null);

  const [fetchedEmail, setFetchedEmail] = useState('');
  const [showLoggedInInfo, setShowLoggedInInfo] = useState(false);

  const getCookie = (name) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
  };
  
  const initialUserID = getCookie('userID');
  const initialSessionID = getCookie('sessionID');
  
  const [userID, setUserID] = useState(initialUserID || '');
  const [sessionID, setSessionID] = useState(initialSessionID || '');
  const [isLoggedIn, setIsLoggedIn] = useState(!!(initialUserID && initialSessionID));

  useEffect(() => {
    const cookies = document.cookie.split(';').map(c => c.trim());
    const userIDCookie = cookies.find(c => c.startsWith('userID='));
    const sessionIDCookie = cookies.find(c => c.startsWith('sessionID='));
    const hasUserID = !!userIDCookie;
    const hasSessionID = !!sessionIDCookie;

    if (hasUserID && hasSessionID) {
      setUserID(userIDCookie.split('=')[1]);
      setSessionID(sessionIDCookie.split('=')[1]);
      setIsLoggedIn(true);
      fetch(`${import.meta.env.VITE_API_URL}/api/mongodb/get-account-email?userID=${userIDCookie.split('=')[1]}`)
        .then(res => res.json())
        .then(data => {
          if (data.email) {
            setFetchedEmail(data.email);
          }
        })
        .catch(err => {
          console.error('Error fetching email:', err);
        });
    } else {
      setIsLoggedIn(hasUserID);
      if (!hasUserID && hasSessionID) {
        setLoginRequestSent(true);
      }
    }
  }, []);

  useEffect(() => {
    if (!loginRequestSent) return;

    const id = setInterval(async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/mongodb/check-login-status`, {
          credentials: 'include'
        });

        const data = await res.json();

        const clearSessionCookie = () => {
          document.cookie = 'sessionID=; Max-Age=0; path=/;';
        };

        const cleanupAndReload = async (message) => {
          clearInterval(id);
          setPollingIntervalId(null);
          await fetch(`${import.meta.env.VITE_API_URL}/api/mongodb/delete-login-request`, {
            method: 'DELETE',
            credentials: 'include'
          });
          clearSessionCookie();
          alert(message);
          window.location.reload();
        };

        if (data.status === 'Confirmed') {
          clearInterval(id);
          setPollingIntervalId(null);
          alert('✅ Your login was approved!\nYou will now be logged in.');
          window.location.reload();
        } else if (data.status === 'Denied') {
          await cleanupAndReload('❌ Your login request was denied.\nYou may try again or register instead.');
        } else if (data.status === 'Expired') {
          await cleanupAndReload('⚠️ Your login request expired. Please try again.');
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 3000);

    setPollingIntervalId(id);
    return () => clearInterval(id);
  }, [loginRequestSent]);

  const togglePopup = () => {
    if (isLoggedIn) {
      setShowLoggedInInfo(prev => !prev);
    } else {
      setShowPopup(prev => !prev);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);

    setEmail('');
    setConfirmEmail('');
    setEmailValid(true);
    setEmailsMatch(true);
    setEmailTouched(false);
    setConfirmTouched(false);
    setEmailExists(false);
    setRegistrationSuccess(false);
    setRegistrationError('');

    setLoginEmail('');
    setLoginName('');
    setLoginComment('');
    setLoginEmailValid(true);
    setLoginTouched(false);
    setLoginNameTouched(false);
    setLoginEmailNotFound(false);
    setLoginRequestSent(false);
    setLoginError('');
    setShowLoggedInInfo(false);
    if (pollingIntervalId) clearInterval(pollingIntervalId);
  };

  const validateEmailFormat = (value) =>
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/.test(value);

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();

    const isValid = validateEmailFormat(email);
    const matches = email === confirmEmail;

    setEmailValid(isValid);
    setEmailsMatch(matches);
    setEmailTouched(true);
    setConfirmTouched(true);

    if (!isValid || !matches) return;

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/mongodb/register-account`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (res.status === 409) {
        setEmailExists(true);
        return;
      }

      if (!res.ok) {
        throw new Error(data?.error || 'Unexpected error.');
      }

      setRegistrationSuccess(true);
      setRegistrationError('');
    } catch (err) {
      console.error('Registration failed:', err);
      setRegistrationError(err.message);
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();

    const isValid = validateEmailFormat(loginEmail);
    const hasName = loginName.trim() !== '';

    setLoginEmailValid(isValid);
    setLoginNameTouched(true);
    setLoginTouched(true);

    if (!isValid || !hasName) return;

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/mongodb/request-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: loginEmail, name: loginName, comment: loginComment })
      });

      const data = await res.json();

      if (res.status === 404) {
        setLoginEmailNotFound(true);
        return;
      }

      if (!res.ok) {
        throw new Error(data?.error || 'Unexpected error.');
      }

      setLoginRequestSent(true);
      setLoginEmailNotFound(false);
      setLoginError('');
    } catch (err) {
      console.error('Login failed:', err);
      setLoginError(err.message);
    }
  };

  const switchToLogin = () => {
    handleTabChange('login');
  };

  const handleLogout = () => {
    document.cookie = 'userID=; Max-Age=0; path=/;';
    document.cookie = 'sessionID=; Max-Age=0; path=/;';
    setIsLoggedIn(false);
    setUserID('');
    setSessionID('');
    setFetchedEmail('');
    setShowLoggedInInfo(false);
    setShowPopup(false);
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

      {showPopup && !showLoggedInInfo && (
        <div className="popup-overlay" onClick={() => setShowPopup(false)}>
          <div className="popup-box" onClick={(e) => e.stopPropagation()}>
            <div className="tab-buttons">
              <button
                className={`tab-button ${activeTab === 'login' ? 'active' : ''}`}
                onClick={() => handleTabChange('login')}
              >
                Login
              </button>
              <button
                className={`tab-button ${activeTab === 'register' ? 'active' : ''}`}
                onClick={() => handleTabChange('register')}
              >
                Register
              </button>
            </div>

            {activeTab === 'login' ? (
              loginRequestSent ? (
                <div className="success-message">
                  <h3>Login Request Sent</h3>
                  <p>
                    A login approval email was sent to <strong>{loginEmail}</strong>. Once approved, you’ll be logged in automatically.
                  </p>
                </div>
              ) : (
                <>
                  <form className="auth-form" onSubmit={handleLoginSubmit}>
                    <input
                      type="email"
                      placeholder="Email"
                      value={loginEmail}
                      onChange={(e) => {
                        setLoginEmail(e.target.value);
                        setLoginEmailValid(true);
                        setLoginEmailNotFound(false);
                      }}
                      onBlur={() => {
                        setLoginTouched(true);
                        if (loginEmail.trim() !== '') {
                          setLoginEmailValid(validateEmailFormat(loginEmail));
                        }
                      }}
                      className={!loginEmailValid && loginTouched ? 'error' : ''}
                      required
                    />
                    <input
                      type="text"
                      placeholder="Name"
                      value={loginName}
                      onChange={(e) => setLoginName(e.target.value)}
                      onBlur={() => setLoginNameTouched(true)}
                      className={loginNameTouched && loginName.trim() === '' ? 'error' : ''}
                      required
                    />
                    <textarea
                      placeholder="Comment (optional)"
                      value={loginComment}
                      onChange={(e) => setLoginComment(e.target.value)}
                    />
                    {!loginEmailValid && loginTouched && (
                      <p className="error-text">Invalid email format.</p>
                    )}
                    {loginNameTouched && loginName.trim() === '' && (
                      <p className="error-text">Name is required.</p>
                    )}
                    {loginEmailNotFound && (
                      <div className="confirm-box">
                        <p>
                          This email isn’t registered. Would you like to create an account with <strong>{loginEmail}</strong>?
                        </p>
                        <div className="flex gap-4 justify-center mt-2">
                          <button
                            className="tab-button"
                            onClick={(e) => {
                              e.preventDefault();
                              setActiveTab('register');
                              setEmail(loginEmail);
                            }}
                          >
                            Yes
                          </button>
                          <button
                            className="tab-button"
                            onClick={(e) => {
                              e.preventDefault();
                              setLoginEmailNotFound(false);
                            }}
                          >
                            No
                          </button>
                        </div>
                      </div>
                    )}
                    {loginError && <p className="error-text">{loginError}</p>}
                    <button type="submit">Submit</button>
                  </form>
                </>
              )
            ) : registrationSuccess ? (
              <div className="success-message">
                <h3>Check your inbox!</h3>
                <p>
                  A confirmation email has been sent to <strong>{email}</strong>. Please click the confirmation link within 1 hour to activate your account.
                </p>
              </div>
            ) : (
              <>
                <form className="auth-form" onSubmit={handleRegisterSubmit}>
                  <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => {
                      const newEmail = e.target.value;
                      setEmail(newEmail);
                      setEmailExists(false);
                      setEmailValid(true);
                      if (confirmEmail.trim() !== '') {
                        setEmailsMatch(true);
                      }
                    }}
                    onBlur={() => {
                      setEmailTouched(true);
                      if (email.trim() !== '') {
                        setEmailValid(validateEmailFormat(email));
                        if (confirmEmail.trim() !== '') {
                          setEmailsMatch(confirmEmail === email);
                        }
                      }
                    }}
                    className={!emailValid && emailTouched ? 'error' : ''}
                    required
                  />
                  <input
                    type="email"
                    placeholder="Confirm Email"
                    value={confirmEmail}
                    onChange={(e) => {
                      setConfirmEmail(e.target.value);
                      setEmailsMatch(true);
                    }}
                    onBlur={() => {
                      setConfirmTouched(true);
                      if (confirmEmail.trim() !== '') {
                        setEmailsMatch(confirmEmail === email);
                      }
                    }}
                    className={!emailsMatch && confirmTouched ? 'error' : ''}
                    required
                  />
                  {!emailValid && emailTouched && (
                    <p className="error-text">Invalid email format.</p>
                  )}
                  {!emailsMatch && confirmTouched && (
                    <p className="error-text">Emails do not match.</p>
                  )}
                  {registrationError && (
                    <p className="error-text">{registrationError}</p>
                  )}
                  <button type="submit">Submit</button>
                </form>

                {emailExists && (
                  <div className="confirm-box">
                    <p>
                      An account under <strong>{email}</strong> already exists. Would you like to submit a login request instead?
                    </p>
                    <div className="flex gap-4 justify-center mt-2">
                      <button className="tab-button" onClick={switchToLogin}>
                        Yes
                      </button>
                      <button className="tab-button" onClick={() => setEmailExists(false)}>
                        No
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {showLoggedInInfo && (
        <div className="popup-overlay" onClick={() => setShowLoggedInInfo(false)}>
          <div className="popup-box" onClick={(e) => e.stopPropagation()}>
            <h3>Logged In</h3>
            <p><strong>Email:</strong> {fetchedEmail || 'Loading...'}</p>
            <p><strong>User ID:</strong> {userID}</p>
            <p><strong>Session ID:</strong> {sessionID}</p>
            <button className="tab-button" onClick={handleLogout}>Logout</button>
          </div>
        </div>
      )}
    </header>
  );
}
