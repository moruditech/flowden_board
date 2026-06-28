import { useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';

import { Header } from '../../components/layout/Header.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { PageSpinner } from '../../components/ui/Spinner.jsx';
import { BoardColumn, TaskCard, TaskDetailModal } from './components/BoardComponents.jsx';
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

  const orgId        = boardQuery.data?.organization;
  const membersQuery = useMembers(orgId);

  useBoardSocket(boardId);

  // ── DnD sensors ─────────────────────────────────────────────────────────────
  //
  // MouseSensor  — desktop mouse: activates after 6px movement (prevents
  //                accidental drags on clicks).
  //
  // TouchSensor  — mobile touch: waits 250ms before activating drag. During
  //                that 250ms the browser scroll takes priority, so the board
  //                canvas can still be panned. After 250ms of holding still
  //                (within 5px tolerance), drag activates and scroll is blocked.
  //                This is the standard pattern used by Trello / Linear on mobile.
  //
  // KeyboardSensor — accessibility: arrow keys move cards between columns.
  //
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // ── DnD handlers ────────────────────────────────────────────────────────────
  const [activeTask, setActiveTask] = useState(null);

  const handleDragStart = useCallback(({ active }) => {
    const task = (tasksQuery.data || []).find(
      (t) => (t.id || t._id) === active.id
    );
    setActiveTask(task || null);
  }, [tasksQuery.data]);

  const handleDragEnd = useCallback(({ active, over }) => {
    setActiveTask(null);
    if (!over || !tasksQuery.data || !boardQuery.data) return;

    const taskId   = active.id;
    const overId   = over.id;
    const tasks    = tasksQuery.data;
    const board    = boardQuery.data;
    const columns  = board.columns || [];

    const isColumn       = columns.some((c) => (c._id || c.id) === overId);
    const targetColumnId = isColumn
      ? overId
      : tasks.find((t) => (t.id || t._id) === overId)?.column;

    if (!targetColumnId) return;

    const dragged = tasks.find((t) => (t.id || t._id) === taskId);
    if (!dragged) return;

    const colTasks = tasks
      .filter((t) => t.column === targetColumnId && (t.id || t._id) !== taskId)
      .sort((a, b) => a.position - b.position);

    let newPosition;
    if (isColumn) {
      const last = colTasks[colTasks.length - 1];
      newPosition = positionBetween(last?.position ?? null, null);
    } else {
      const overIndex = colTasks.findIndex((t) => (t.id || t._id) === overId);
      const before    = colTasks[overIndex - 1]?.position ?? null;
      const after     = colTasks[overIndex]?.position     ?? null;
      newPosition     = positionBetween(before, after);
    }

    moveTask.mutate({ taskId, columnId: targetColumnId, position: newPosition });
  }, [tasksQuery.data, boardQuery.data, moveTask]);

  // ── Inline add-task ──────────────────────────────────────────────────────────
  const [addingToCol, setAddingToCol]   = useState(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  function submitNewTask(columnId) {
    if (!newTaskTitle.trim()) return;
    createTask.mutate(
      { title: newTaskTitle.trim(), columnId },
      { onSuccess: () => { setNewTaskTitle(''); setAddingToCol(null); } }
    );
  }

  // ── Task detail ──────────────────────────────────────────────────────────────
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
      <Header title={board.name} breadcrumb={board.description || null} />

      {/* Board canvas — horizontal scroll, no vertical scroll */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-3 md:p-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          {/* Columns row — min-w ensures the canvas is always at least as wide as
              the column count so overflow-x kicks in even on small screens */}
          <div
            className="flex gap-3 md:gap-4 h-full items-start"
            style={{ minWidth: `${columns.length * 272}px` }}
          >
            {columns.map((col) => {
              const colId    = col._id || col.id;
              const colTasks = tasks.filter((t) => t.column === colId);

              return (
                <div key={colId} className="flex flex-col gap-2 shrink-0 w-64">
                  <BoardColumn
                    column={col}
                    tasks={colTasks}
                    boardId={boardId}
                    onAddTask={(id) => { setAddingToCol(id); setNewTaskTitle(''); }}
                    onTaskClick={setSelectedTask}
                  />

                  {/* Inline add-task input */}
                  {addingToCol === colId && (
                    <div className="bg-white border border-zinc-200 rounded p-2.5 shadow-card">
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

          {/* Drag overlay — floats above everything during drag */}
          <DragOverlay dropAnimation={{ duration: 150, easing: 'ease' }}>
            {activeTask && (
              <div className="rotate-1 opacity-95 shadow-card-hover">
                <TaskCard task={activeTask} boardId={boardId} />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>

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
