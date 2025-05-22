import { useState } from 'react';
import PropTypes from 'prop-types';
import '@/styles/popupRegistration.css';

export default function PopupLogin({ setActiveTab, onClose }) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [comment, setComment] = useState('');
  const [emailValid, setEmailValid] = useState(true);
  const [nameValid, setNameValid] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [success, setSuccess] = useState(false);

  const validateEmail = (value) => /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value);

  const handleEmailBlur = () => {
    setEmailValid(validateEmail(email));
  };

  const handleNameBlur = () => {
    setNameValid(name.trim() !== '');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const isEmailValid = validateEmail(email);
    const isNameValid = name.trim() !== '';

    setEmailValid(isEmailValid);
    setNameValid(isNameValid);
    setErrorMessage('');

    if (!isEmailValid || !isNameValid) return;

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/mongodb/request-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, name, comment })
      });

      if (res.status === 404) {
        setErrorMessage('This email is not registered.');
        return;
      }

      if (res.status === 200) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 7000);
        return;
      }

      setErrorMessage(`Internal server error (${res.status})`);
    } catch (err) {
      console.error('Login failed:', err);
      setErrorMessage('Something went wrong. Please try again.');
    }
  };

  return (
    <div className="popup-overlay" onClick={onClose}>
      <div className="popup-box" onClick={(e) => e.stopPropagation()}>
        <div className="tab-buttons">
          <button className="tab-button active">Login</button>
          <button className="tab-button" onClick={() => setActiveTab('register')}>Register</button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={handleEmailBlur}
            className={!emailValid ? 'error' : ''}
            required
          />
          <input
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={handleNameBlur}
            className={!nameValid ? 'error' : ''}
            required
          />
          <textarea
            placeholder="Comment (optional)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />

          {!emailValid && <p className="error-text">Invalid email format.</p>}
          {!nameValid && <p className="error-text">Name cannot be empty.</p>}
          {errorMessage && <p className="error-text">{errorMessage}</p>}

          {success ? (
            <p className="success-message">✔ Login request sent. Please check your inbox.</p>
          ) : (
            <button type="submit">Submit</button>
          )}
        </form>
      </div>
    </div>
  );
}

PopupLogin.propTypes = {
  setActiveTab: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};
