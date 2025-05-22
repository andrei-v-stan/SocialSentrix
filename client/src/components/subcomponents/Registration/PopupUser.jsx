import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import '@/styles/popupRegistration.css';

export default function PopupUser({ email, userID, sessionID, onClose }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    document.cookie = 'sessionID=; Max-Age=0; path=/;';
    document.cookie = 'userID=; Max-Age=0; path=/;';
    window.location.reload();
  };

  return (
    <div className="popup-overlay" onClick={onClose}>
      <div className="popup-box" onClick={(e) => e.stopPropagation()}>
        <div className="logged-in-box">
          <p className="break-words"><strong>Email:</strong> {email || 'Loading...'}</p>
          <button className="manage-button" 
            onClick={() => {
              onClose();
              navigate('/managesessions');
            }}
          >Manage Sessions</button>
          <p><strong>User ID:</strong> {userID}</p>
          <br></br>
          <p><strong>Session ID:</strong> {sessionID}</p>
          <button className="logout-button" onClick={handleLogout}>Logout</button>
        </div>
      </div>
    </div>
  );
}

PopupUser.propTypes = {
  email: PropTypes.string.isRequired,
  userID: PropTypes.string.isRequired,
  sessionID: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
};