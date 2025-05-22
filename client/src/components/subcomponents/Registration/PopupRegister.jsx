import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import '@/styles/popupRegistration.css';

export default function PopupRegister({ setActiveTab, onClose }) {
  const [email, setEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [emailValid, setEmailValid] = useState(true);
  const [emailsMatch, setEmailsMatch] = useState(true);
  const [submitError, setSubmitError] = useState('');
  const [emailExists, setEmailExists] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);

  const validateEmail = (value) => {
    return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value);
  };

  const handleEmailBlur = () => {
    setEmailValid(validateEmail(email));
    if (confirmEmail.trim() !== '') {
      setEmailsMatch(confirmEmail === email);
    }
  };

  const handleConfirmEmailBlur = () => {
    setEmailsMatch(confirmEmail === email);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const isValid = validateEmail(email);
    const matches = confirmEmail === email;
    setEmailValid(isValid);
    setEmailsMatch(matches);
    setSubmitError('');

    if (!isValid || !matches) {
      setSubmitError('Please fix the errors before submitting.');
      return;
    }

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/mongodb/register-account`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (res.status === 409) {
        setEmailExists(true);
        return;
      }

      if (res.status === 200) {
        setConfirmationSent(true);
        setTimeout(() => setConfirmationSent(false), 5000);
        return;
      }

      setSubmitError(`Internal server error (${res.status})`);
    } catch (err) {
      console.error('Registration failed:', err);
      setSubmitError(err.message);
    }
  };

  useEffect(() => {
    setEmailExists(false);
  }, [email, confirmEmail]);

  return (
    <div className="popup-overlay" onClick={onClose}>
      <div className="popup-box" onClick={(e) => e.stopPropagation()}>
        <div className="tab-buttons">
          <button className="tab-button" onClick={() => setActiveTab('login')}>Login</button>
          <button className="tab-button active">Register</button>
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
            type="email"
            placeholder="Confirm Email"
            value={confirmEmail}
            onChange={(e) => setConfirmEmail(e.target.value)}
            onBlur={handleConfirmEmailBlur}
            className={!emailsMatch ? 'error' : ''}
            required
          />

          {!emailValid && <p className="error-text">Invalid email format.</p>}
          {!emailsMatch && <p className="error-text">Emails do not match.</p>}
          {submitError && <p className="error-text">{submitError}</p>}

          {confirmationSent ? (
            <p className="success-message">✔ Confirmation email has been sent.</p>
          ) : emailExists ? (
            <div className="confirm-box">
              <p>The email is already registered. Would you like to login?</p>
              <div className="flex gap-4 justify-center mt-2">
                <button
                  type="button"
                  className="tab-button"
                  onClick={() => {
                    setActiveTab('login');
                    setTimeout(() => {
                      const emailInput = document.querySelector('input[type="email"]');
                      if (emailInput) emailInput.value = email;
                    }, 0);
                  }}
                >
                  Yes
                </button>
                <button
                  type="button"
                  className="tab-button"
                  onClick={() => setEmailExists(false)}
                >
                  No
                </button>
              </div>
            </div>
          ) : (
            <button type="submit">Submit</button>
          )}
        </form>
      </div>
    </div>
  );
}

PopupRegister.propTypes = {
  setActiveTab: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};
