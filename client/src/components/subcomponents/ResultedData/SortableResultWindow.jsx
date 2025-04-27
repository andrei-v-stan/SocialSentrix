import PropTypes from 'prop-types';
import { useState } from 'react';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FaRegWindowClose, FaExpandArrowsAlt } from 'react-icons/fa';
import { FaWindowMinimize, FaWindowRestore, FaWindowMaximize } from 'react-icons/fa6';
import SubWindow from './SubWindow';
import ChartBlock from './ChartBlock';

export default function SortableResultWindow({ id, title, content, onClose }) {
  const [minimized, setMinimized] = useState(false);
  const [maximized, setMaximized] = useState(false);
  const [hiddenGraphs, setHiddenGraphs] = useState([]);
  const [graphOrder, setGraphOrder] = useState(['posts', 'comments', 'upvotes', 'downvotes']);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: maximized ? 1000 : isDragging ? 10 : 1,
  };

  const handleGraphDragEnd = (event) => {
    const { active, over } = event;
    if (!active || !over || active.id === over.id) return;
    const oldIndex = graphOrder.indexOf(active.id);
    const newIndex = graphOrder.indexOf(over.id);
    if (oldIndex !== -1 && newIndex !== -1) {
      setGraphOrder(arrayMove(graphOrder, oldIndex, newIndex));
    }
  };

  const closeGraph = (key) => setHiddenGraphs(prev => [...prev, key]);
  const restoreAllGraphs = () => setHiddenGraphs([]);

  return (
    <div ref={setNodeRef} style={style} className={`result-window ${minimized ? 'minimized' : ''} ${maximized ? 'maximized' : ''}`}>
      <div className="window-bar" {...attributes}>
        <span className="window-title" {...listeners}>{title}</span>
        <div className="window-controls">
          <button onClick={() => setMinimized(prev => !prev)}>
            {minimized ? <FaWindowMaximize /> : <FaWindowMinimize />}
          </button>
          <button onClick={() => setMaximized(prev => !prev)}>
            {maximized ? <FaWindowRestore /> : <FaExpandArrowsAlt />}
          </button>
          <button onClick={onClose}>
            <FaRegWindowClose style={{ fontSize: '2rem', fontWeight: 'bold' }} />
          </button>
        </div>
      </div>

      {!minimized && (
        <div className="window-content">
          <DndContext collisionDetection={closestCenter} onDragEnd={handleGraphDragEnd}>
            <SortableContext items={graphOrder} strategy={verticalListSortingStrategy}>
              {graphOrder.map((key) => {
                if (hiddenGraphs.includes(key)) return null;
                const rawData = content[key] || [];
                if (rawData.length === 0) return null;

                let graphTitle = key.charAt(0).toUpperCase() + key.slice(1);
                if (key === 'upvotes') graphTitle = 'Upvotes';
                if (key === 'downvotes') graphTitle = 'Downvotes';

                return (
                  <SubWindow
                    key={key}
                    id={key}
                    title={graphTitle}
                    onClose={() => closeGraph(key)}
                  >
                    <ChartBlock rawData={rawData} category={key} />
                  </SubWindow>
                );
              })}
            </SortableContext>
          </DndContext>

          {hiddenGraphs.length > 0 && (
            <div style={{ marginTop: '1rem', textAlign: 'center' }}>
              <button onClick={restoreAllGraphs}>Restore All Graphs</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

SortableResultWindow.propTypes = {
  id: PropTypes.any.isRequired,
  title: PropTypes.string.isRequired,
  content: PropTypes.object.isRequired,
  onClose: PropTypes.func.isRequired,
};
