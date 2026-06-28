import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

import { Avatar } from '../../../components/ui/Avatar.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { Input, Textarea, Select } from '../../../components/ui/Input.jsx';
import { Modal, ModalFooter } from '../../../components/ui/Modal.jsx';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog.jsx';
import { formatDate, formatRelative } from '../../../utils/date.js';
import { cn } from '../../../utils/cn.js';
import {
  useCreateBoard,
  useUpdateTask,
  useDeleteTask,
} from '../hooks/useBoards.js';

// ── TaskCard ──────────────────────────────────────────────────────────────────
export function TaskCard({ task, boardId, onClick }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id || task._id, data: { type: 'task', task } });

  const style = {
    transform:  CSS.Transform.toString(transform),
    transition,
    opacity:    isDragging ? 0.4 : 1,
  };

  const assignee = task.assignee;
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onClick?.(task)}
      className={cn(
        'task-card p-3 select-none',
        isDragging && 'shadow-card-hover ring-1 ring-brand-400',
      )}
    >
      {/* Title */}
      <p className="text-sm text-zinc-800 font-medium leading-snug mb-2">{task.title}</p>

      {/* Labels */}
      {task.labels?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {task.labels.map((label) => (
            <span key={label} className="chip bg-zinc-100 text-zinc-600">{label}</span>
          ))}
        </div>
      )}

      {/* Footer meta */}
      {(assignee || task.dueDate) && (
        <div className="flex items-center justify-between mt-2">
          {task.dueDate ? (
            <span className={cn(
              'text-2xs font-medium',
              isOverdue ? 'text-red-600' : 'text-zinc-400',
            )}>
              {formatDate(task.dueDate, { month: 'short', day: 'numeric' })}
            </span>
          ) : <span />}

          {assignee && (
            <Avatar name={assignee.name} src={assignee.avatarUrl} size="xs" />
          )}
        </div>
      )}
    </div>
  );
}

// ── BoardColumn ───────────────────────────────────────────────────────────────
export function BoardColumn({ column, tasks, boardId, onAddTask, onTaskClick }) {
  const { setNodeRef, isOver } = useDroppable({ id: column._id || column.id });
  const taskIds = tasks.map((t) => t.id || t._id);
  const sorted  = [...tasks].sort((a, b) => a.position - b.position);

  return (
    <div className="flex flex-col w-64 shrink-0">
      {/* Column header */}
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold text-zinc-700 tracking-wide uppercase">
            {column.name}
          </h3>
          <span className="text-2xs text-zinc-400 font-medium bg-zinc-100 px-1.5 py-0.5 rounded-full">
            {tasks.length}
          </span>
        </div>
        <button
          onClick={() => onAddTask?.(column._id || column.id)}
          className="w-5 h-5 flex items-center justify-center rounded text-zinc-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
          title={`Add task to ${column.name}`}
        >
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
            <path d="M5.5 1v9M1 5.5h9" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex flex-col gap-2 min-h-32 rounded p-2 transition-colors',
          isOver ? 'bg-brand-50 ring-1 ring-brand-300' : 'bg-zinc-100',
        )}
      >
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {sorted.map((task) => (
            <TaskCard key={task.id || task._id} task={task} boardId={boardId} onClick={onTaskClick} />
          ))}
        </SortableContext>

        {tasks.length === 0 && !isOver && (
          <div
            onClick={() => onAddTask?.(column._id || column.id)}
            className="flex items-center justify-center h-16 rounded border-2 border-dashed border-zinc-300 hover:border-brand-300 hover:bg-brand-50 cursor-pointer transition-colors group"
          >
            <span className="text-2xs text-zinc-400 group-hover:text-brand-600">Add a task</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── BoardCard — used on the boards list page ──────────────────────────────────
export function BoardCard({ board, orgId, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const deleteMutation = useDeleteTask(orgId); // board delete uses a different hook, passed as onDelete prop

  return (
    <div className="group relative bg-white border border-zinc-200 rounded hover:border-zinc-300 hover:shadow-card transition-all">
      <Link to={`/boards/${board.id || board._id}`} className="block p-4">
        <p className="text-sm font-semibold text-zinc-900 mb-1 truncate">{board.name}</p>
        {board.description && (
          <p className="text-xs text-zinc-500 leading-relaxed line-clamp-2 mb-3">{board.description}</p>
        )}
        <div className="flex items-center gap-3 text-2xs text-zinc-400">
          <span>{board.columns?.length || 0} columns</span>
          <span>·</span>
          <span>Updated {formatRelative(board.updatedAt)}</span>
        </div>
      </Link>

      {onDelete && (
        <button
          onClick={(e) => { e.preventDefault(); setConfirmDelete(true); }}
          className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-all"
          title="Delete board"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      )}

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => onDelete(board.id || board._id, { onSuccess: () => setConfirmDelete(false) })}
        title="Delete board"
        description={`Delete "${board.name}" and all its tasks? This cannot be undone.`}
        confirmLabel="Delete board"
        danger
      />
    </div>
  );
}

// ── CreateBoardModal ──────────────────────────────────────────────────────────
export function CreateBoardModal({ open, onClose, orgId }) {
  const create = useCreateBoard(orgId);
  const [name, setName] = useState('');
  const [columns, setColumns] = useState(['To Do', 'In Progress', 'Done']);

  function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    create.mutate(
      { name: name.trim(), columns: columns.filter(Boolean).map((c) => ({ name: c })) },
      { onSuccess: onClose }
    );
  }

  function updateCol(i, val) {
    setColumns((c) => c.map((col, idx) => idx === i ? val : col));
  }

  function addCol() { if (columns.length < 10) setColumns((c) => [...c, '']); }
  function removeCol(i) { if (columns.length > 1) setColumns((c) => c.filter((_, idx) => idx !== i)); }

  return (
    <Modal open={open} onClose={onClose} title="New board" size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Board name" required value={name} onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Sprint 1, Product Roadmap" />

        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-2">Columns</label>
          <div className="space-y-2">
            {columns.map((col, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={col}
                  onChange={(e) => updateCol(i, e.target.value)}
                  placeholder={`Column ${i + 1}`}
                  className="flex-1 h-8 px-2.5 text-sm border border-zinc-200 rounded focus:outline-none focus:border-brand-600 focus:ring-1 focus:ring-brand-100"
                />
                {columns.length > 1 && (
                  <button type="button" onClick={() => removeCol(i)}
                    className="text-zinc-300 hover:text-red-500 transition-colors">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </button>
                )}
              </div>
            ))}
            {columns.length < 10 && (
              <button type="button" onClick={addCol}
                className="text-xs text-brand-700 hover:underline">
                + Add column
              </button>
            )}
          </div>
        </div>

        <ModalFooter>
          <Button variant="ghost" size="sm" type="button" onClick={onClose}>Cancel</Button>
          <Button size="sm" type="submit" loading={create.isPending}>Create board</Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

// ── TaskDetailModal ───────────────────────────────────────────────────────────
export function TaskDetailModal({ open, onClose, task, boardId, members = [] }) {
  const update = useUpdateTask(boardId);
  const remove = useDeleteTask(boardId);
  const [form, setForm] = useState({ title: '', description: '', assigneeId: '', dueDate: '' });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editing, setEditing] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  // Sync form when task changes
  if (task && !editing && (
    form.title !== task.title ||
    form.description !== (task.description || '') ||
    form.assigneeId !== (task.assignee?.id || task.assignee?._id || '') ||
    form.dueDate !== (task.dueDate ? task.dueDate.slice(0, 10) : '')
  )) {
    setForm({
      title:       task.title || '',
      description: task.description || '',
      assigneeId:  task.assignee?.id || task.assignee?._id || '',
      dueDate:     task.dueDate ? task.dueDate.slice(0, 10) : '',
    });
  }

  if (!task) return null;

  function handleSave() {
    update.mutate({
      taskId: task.id || task._id,
      data: {
        title:       form.title,
        description: form.description,
        assigneeId:  form.assigneeId || null,
        dueDate:     form.dueDate || null,
      },
    }, { onSuccess: () => setEditing(false) });
  }

  return (
    <Modal open={open} onClose={onClose} size="md"
      title={editing ? 'Edit task' : task.title}>
      {editing ? (
        <div className="space-y-4">
          <Input label="Title" required value={form.title} onChange={set('title')} />
          <Textarea label="Description" rows={4} value={form.description} onChange={set('description')}
            placeholder="Add a description..." />

          <div className="grid grid-cols-2 gap-3">
            <Select label="Assignee" value={form.assigneeId} onChange={set('assigneeId')}>
              <option value="">Unassigned</option>
              {members.map((m) => {
                const u = m.user || m;
                return <option key={u.id || u._id} value={u.id || u._id}>{u.name}</option>;
              })}
            </Select>
            <Input label="Due date" type="date" value={form.dueDate} onChange={set('dueDate')} />
          </div>

          <ModalFooter>
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSave} loading={update.isPending}>Save</Button>
          </ModalFooter>
        </div>
      ) : (
        <div className="space-y-4">
          {task.description && (
            <p className="text-sm text-zinc-600 leading-relaxed whitespace-pre-wrap">{task.description}</p>
          )}

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-2xs font-medium text-zinc-400 uppercase tracking-wide mb-1">Assignee</p>
              {task.assignee ? (
                <div className="flex items-center gap-2">
                  <Avatar name={task.assignee.name} size="xs" />
                  <span className="text-zinc-700 text-xs">{task.assignee.name}</span>
                </div>
              ) : <span className="text-xs text-zinc-400">Unassigned</span>}
            </div>

            <div>
              <p className="text-2xs font-medium text-zinc-400 uppercase tracking-wide mb-1">Due date</p>
              {task.dueDate
                ? <span className="text-xs text-zinc-700">{formatDate(task.dueDate)}</span>
                : <span className="text-xs text-zinc-400">No due date</span>
              }
            </div>
          </div>

          <p className="text-2xs text-zinc-400">
            Created {formatRelative(task.createdAt)}
            {task.createdBy?.name && ` by ${task.createdBy.name}`}
          </p>

          <ModalFooter>
            <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(true)}
              className="text-red-600 hover:bg-red-50 mr-auto">
              Delete
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>Edit</Button>
          </ModalFooter>
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => remove.mutate(task.id || task._id, {
          onSuccess: () => { setConfirmDelete(false); onClose(); }
        })}
        title="Delete task"
        description={`Delete "${task.title}"? This cannot be undone.`}
        confirmLabel="Delete task"
        danger
        loading={remove.isPending}
      />
    </Modal>
  );
}
