import PropTypes from 'prop-types';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FaExpandArrowsAlt, FaRegWindowClose } from 'react-icons/fa';
import { FaWindowMinimize, FaWindowRestore, FaWindowMaximize } from 'react-icons/fa6';
import { MdPersonAddAlt1, MdPersonOff } from 'react-icons/md';
import { useState } from 'react';

export default function SubWindow({ id, title, children, onClose, compareModeList, toggleCompare }) {
  const [minimized, setMinimized] = useState(false);
  const [maximized, setMaximized] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const isCompared = compareModeList.includes(id); // ID is now "<windowId>-<category>" e.g., "1745813353822-posts"

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: maximized ? 100 : isDragging ? 10 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`graph-subwindow ${minimized ? 'minimized' : ''} ${maximized ? 'maximized' : ''}`}
    >
      <div className="window-bar" {...attributes}>
        <span className="window-title" {...listeners}>{title}</span>
        <div className="window-controls">
          <button onClick={() => toggleCompare(id)}>
            {isCompared ? <MdPersonOff /> : <MdPersonAddAlt1 />}
          </button>
          <button onClick={() => setMinimized(prev => !prev)}>
            {minimized ? <FaWindowMaximize /> : <FaWindowMinimize />}
          </button>
          <button onClick={() => setMaximized(prev => !prev)}>
            {maximized ? <FaWindowRestore /> : <FaExpandArrowsAlt />}
          </button>
          <button onClick={onClose}>
            <FaRegWindowClose style={{ fontSize: '1.5rem', fontWeight: 'bold' }} />
          </button>
        </div>
      </div>

      {!minimized && (
        <div className="window-content">
          {children}
        </div>
      )}
    </div>
  );
}

SubWindow.propTypes = {
  id: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
  onClose: PropTypes.func.isRequired,
  compareModeList: PropTypes.array.isRequired,
  toggleCompare: PropTypes.func.isRequired,
};
