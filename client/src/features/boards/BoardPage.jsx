import { useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useQuery } from '@tanstack/react-query';

import { Header } from '../../components/layout/Header.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { PageSpinner } from '../../components/ui/Spinner.jsx';
import { BoardColumn, TaskCard, TaskDetailModal, CreateBoardModal } from './components/BoardComponents.jsx';
import { useBoard, useTasks, useMoveTask, useCreateTask, useBoardSocket } from './hooks/useBoards.js';
import { useMembers } from '../organizations/hooks/useOrganizations.js';
import { positionBetween } from '../../utils/position.js';
import { cn } from '../../utils/cn.js';

export default function BoardPage() {
  const { boardId }   = useParams();
  const boardQuery    = useBoard(boardId);
  const tasksQuery    = useTasks(boardId);
  const moveTask      = useMoveTask(boardId);
  const createTask    = useCreateTask(boardId);

  const orgId       = boardQuery.data?.organization;
  const membersQuery = useMembers(orgId);

  // Live socket updates — patches Query cache directly
  useBoardSocket(boardId);

  // ── DnD state ───────────────────────────────────────────────────────────────
  const [activeTask, setActiveTask] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragStart = useCallback(({ active }) => {
    const task = (tasksQuery.data || []).find(
      (t) => (t.id || t._id) === active.id
    );
    setActiveTask(task || null);
  }, [tasksQuery.data]);

  const handleDragEnd = useCallback(({ active, over }) => {
    setActiveTask(null);
    if (!over || !tasksQuery.data || !boardQuery.data) return;

    const taskId  = active.id;
    const overId  = over.id;
    const tasks   = tasksQuery.data;
    const board   = boardQuery.data;
    const columns = board.columns || [];

    // Determine target column
    const isColumn      = columns.some((c) => (c._id || c.id) === overId);
    const targetColumnId = isColumn
      ? overId
      : tasks.find((t) => (t.id || t._id) === overId)?.column;

    if (!targetColumnId) return;

    // Don't move if dropped in same position
    const dragged = tasks.find((t) => (t.id || t._id) === taskId);
    if (!dragged) return;

    // Get sorted tasks in target column excluding the dragged task
    const colTasks = tasks
      .filter((t) => t.column === targetColumnId && (t.id || t._id) !== taskId)
      .sort((a, b) => a.position - b.position);

    let newPosition;
    if (isColumn) {
      // Dropped on column header/empty area → append to end
      const last = colTasks[colTasks.length - 1];
      newPosition = positionBetween(last?.position ?? null, null);
    } else {
      // Dropped on another task → insert before it
      const overIndex = colTasks.findIndex((t) => (t.id || t._id) === overId);
      const before    = colTasks[overIndex - 1]?.position ?? null;
      const after     = colTasks[overIndex]?.position     ?? null;
      newPosition     = positionBetween(before, after);
    }

    moveTask.mutate({ taskId, columnId: targetColumnId, position: newPosition });
  }, [tasksQuery.data, boardQuery.data, moveTask]);

  // ── Inline add-task state ────────────────────────────────────────────────────
  const [addingToCol, setAddingToCol]   = useState(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  function submitNewTask(columnId) {
    if (!newTaskTitle.trim()) return;
    createTask.mutate(
      { title: newTaskTitle.trim(), columnId },
      { onSuccess: () => { setNewTaskTitle(''); setAddingToCol(null); } }
    );
  }

  // ── Task detail modal ────────────────────────────────────────────────────────
  const [selectedTask, setSelectedTask] = useState(null);

  // ── Render ───────────────────────────────────────────────────────────────────
  if (boardQuery.isLoading) return <PageSpinner />;
  if (!boardQuery.data)     return null;

  const board   = boardQuery.data;
  const tasks   = tasksQuery.data || [];
  const columns = [...(board.columns || [])].sort((a, b) => a.order - b.order);
  const members = membersQuery.data || [];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header
        title={board.name}
        breadcrumb={board.description || null}
      />

      {/* Board canvas */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 h-full items-start">
            {columns.map((col) => {
              const colId    = col._id || col.id;
              const colTasks = tasks.filter((t) => t.column === colId);

              return (
                <div key={colId} className="flex flex-col gap-2 shrink-0">
                  <BoardColumn
                    column={col}
                    tasks={colTasks}
                    boardId={boardId}
                    onAddTask={(id) => { setAddingToCol(id); setNewTaskTitle(''); }}
                    onTaskClick={setSelectedTask}
                  />

                  {/* Inline add-task input */}
                  {addingToCol === colId && (
                    <div className="w-64 bg-white border border-zinc-200 rounded p-2.5 shadow-card">
                      <textarea
                        autoFocus
                        rows={2}
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            submitNewTask(colId);
                          }
                          if (e.key === 'Escape') setAddingToCol(null);
                        }}
                        placeholder="Task title…"
                        className="w-full text-sm text-zinc-800 bg-transparent border-0 outline-none resize-none placeholder:text-zinc-400"
                      />
                      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-zinc-100">
                        <Button size="xs" onClick={() => submitNewTask(colId)}
                          loading={createTask.isPending}>
                          Add
                        </Button>
                        <Button size="xs" variant="ghost" onClick={() => setAddingToCol(null)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Floating drag overlay */}
          <DragOverlay dropAnimation={{ duration: 150, easing: 'ease' }}>
            {activeTask && (
              <div className="rotate-1 opacity-95 shadow-card-hover">
                <TaskCard task={activeTask} boardId={boardId} />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Task detail side-modal */}
      <TaskDetailModal
        open={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        task={selectedTask}
        boardId={boardId}
        members={members}
      />
    </div>
  );
}
