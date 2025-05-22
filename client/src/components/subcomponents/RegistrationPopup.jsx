import PropTypes from 'prop-types';
import '@/styles/popupRegistration.css';

import PopupLogin from './Registration/PopupLogin.jsx';
import PopupRegister from './Registration/PopupRegister.jsx';
import PopupUser from './Registration/PopupUser.jsx';

export default function Popup({ mode, setActiveTab, email, userID, sessionID, onClose }) {
  switch (mode) {
    case 'login':
      return <PopupLogin setActiveTab={setActiveTab} onClose={onClose} />;
    case 'register':
      return <PopupRegister setActiveTab={setActiveTab} onClose={onClose} />;
    case 'user':
      return (
        <PopupUser
          email={email}
          userID={userID}
          sessionID={sessionID}
          onClose={onClose}
        />
      );
    default:
      return null;
  }
}

Popup.propTypes = {
  mode: PropTypes.oneOf(['login', 'register', 'user']).isRequired,
  setActiveTab: PropTypes.func.isRequired,
  email: PropTypes.string,
  userID: PropTypes.string,
  sessionID: PropTypes.string,
  onClose: PropTypes.func.isRequired,
};
