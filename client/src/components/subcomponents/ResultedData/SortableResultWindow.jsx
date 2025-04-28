import PropTypes from 'prop-types';
import { useState } from 'react';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FaRegWindowClose, FaExpandArrowsAlt } from 'react-icons/fa';
import { FaWindowMinimize, FaWindowRestore, FaWindowMaximize } from 'react-icons/fa6';
import { MdPersonAddAlt1, MdPersonOff } from 'react-icons/md';
import SubWindow from './SubWindow';
import ChartBlock from './ChartBlock';

export default function SortableResultWindow({ id, title, content, platform, username, onClose, globalCompareList, setGlobalCompareList, associationMap, resultsMap }) {
  const [minimized, setMinimized] = useState(false);
  const [maximized, setMaximized] = useState(false);
  const [hiddenGraphs, setHiddenGraphs] = useState([]);
  const [graphOrder, setGraphOrder] = useState(Object.keys(content || {}));

  const isWindowInCompareMode = graphOrder.every(key => globalCompareList.includes(`${id}-${key}`));

  const handleMainCompareToggle = () => {
    const allGraphIds = graphOrder.map(key => `${id}-${key}`);
    if (isWindowInCompareMode) {
      setGlobalCompareList(prev => prev.filter(cmpId => !allGraphIds.includes(cmpId)));
    } else {
      setGlobalCompareList(prev => [...prev, ...allGraphIds]);
    }
  };

  const toggleSubwindowCompare = (subwindowId) => {
    setGlobalCompareList(prev => {
      if (prev.includes(subwindowId)) {
        return prev.filter(id => id !== subwindowId);
      } else {
        return [...prev, subwindowId];
      }
    });
  };

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
          <button onClick={handleMainCompareToggle}>
            {isWindowInCompareMode ? <MdPersonOff /> : <MdPersonAddAlt1 />}
          </button>
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
              {graphOrder.map((category) => {
                const subwindowId = `${id}-${category}`;
                if (hiddenGraphs.includes(category)) return null;

                let graphData = [];
                if (globalCompareList.includes(subwindowId)) {
                  const associatedProfiles = associationMap[subwindowId] || {};
                  Object.values(associatedProfiles).forEach(({ platform, username, category }) => {
                    const foundWindow = Object.values(resultsMap).find(w => w.platform === platform && w.username === username);
                    if (foundWindow?.content?.[category]) {
                      graphData.push({
                        label: `${platform}: ${username}`,
                        data: foundWindow.content[category],
                      });
                    }
                  });
                } else {
                  graphData.push({
                    label: `${platform}: ${username}`,
                    data: content[category] || [],
                  });
                }

                if (graphData.every(g => g.data.length === 0)) return null;
                let graphTitle = category.charAt(0).toUpperCase() + category.slice(1);

                return (
                  <SubWindow
                    key={subwindowId}
                    id={subwindowId}
                    title={graphTitle}
                    onClose={() => closeGraph(category)}
                    compareModeList={globalCompareList}
                    toggleCompare={toggleSubwindowCompare}
                  >
                    <ChartBlock datasets={graphData} category={category} />
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
  id: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  content: PropTypes.object.isRequired,
  platform: PropTypes.string.isRequired,
  username: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
  globalCompareList: PropTypes.array.isRequired,
  setGlobalCompareList: PropTypes.func.isRequired,
  associationMap: PropTypes.object.isRequired,
  resultsMap: PropTypes.object.isRequired,
};
