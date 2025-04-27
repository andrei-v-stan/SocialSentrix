import PropTypes from 'prop-types';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import SortableResultWindow from './ResultedData/SortableResultWindow';
import '@/styles/ResultedData.css';

export default function ResultedData({ results, removeResult, setResults }) {
  const sensors = useSensors(useSensor(PointerSensor));

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = results.findIndex(r => r.id === active.id);
      const newIndex = results.findIndex(r => r.id === over.id);
      setResults(arrayMove(results, oldIndex, newIndex));
    }
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={results.map(r => r.id)} strategy={verticalListSortingStrategy}>
        <div className="resulted-data-container sortable">
          {results.map(({ id, title, content }) => (
            <SortableResultWindow
              key={id}
              id={id}
              title={title}
              content={content}
              onClose={() => removeResult(id)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

ResultedData.propTypes = {
  results: PropTypes.array.isRequired,
  removeResult: PropTypes.func.isRequired,
  setResults: PropTypes.func.isRequired,
};
