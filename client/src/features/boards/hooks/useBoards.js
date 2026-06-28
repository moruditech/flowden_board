import { useQuery, useMutation, useInfiniteQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import toast from 'react-hot-toast';
import { boardApi } from '../../../api/board.api.js';
import { taskApi }  from '../../../api/task.api.js';
import { queryClient } from '../../../lib/queryClient.js';
import { getSocket } from '../../../lib/socket.js';
import { useUiStore } from '../../../store/uiStore.js';

// ══ useBoards ═════════════════════════════════════════════════════════════════

export function useBoards(orgId) {
  return useQuery({
    queryKey: ['boards', orgId],
    queryFn:  () => boardApi.listByOrg(orgId).then((r) => r.data.data.boards),
    enabled:  !!orgId,
  });
}

export function useBoard(boardId) {
  return useQuery({
    queryKey: ['board', boardId],
    queryFn:  () => boardApi.getById(boardId).then((r) => r.data.data.board),
    enabled:  !!boardId,
  });
}

export function useCreateBoard(orgId) {
  return useMutation({
    mutationFn: (data) => boardApi.create(orgId, data).then((r) => r.data.data.board),
    onSuccess: (board) => {
      queryClient.invalidateQueries({ queryKey: ['boards', orgId] });
      toast.success(`Board "${board.name}" created`);
    },
    onError: (err) => toast.error(err.response?.data?.error?.message || 'Failed to create board'),
  });
}

export function useUpdateBoard(boardId) {
  return useMutation({
    mutationFn: (data) => boardApi.update(boardId, data).then((r) => r.data.data.board),
    onSuccess: (board) => {
      queryClient.setQueryData(['board', boardId], board);
      queryClient.invalidateQueries({ queryKey: ['boards'] });
    },
    onError: (err) => toast.error(err.response?.data?.error?.message || 'Update failed'),
  });
}

export function useDeleteBoard(orgId) {
  return useMutation({
    mutationFn: (boardId) => boardApi.remove(boardId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boards', orgId] });
      toast.success('Board deleted');
    },
    onError: (err) => toast.error(err.response?.data?.error?.message || 'Delete failed'),
  });
}

// ══ useTasks ══════════════════════════════════════════════════════════════════

export function useTasks(boardId) {
  return useQuery({
    queryKey: ['tasks', boardId],
    queryFn:  () => taskApi.listByBoard(boardId).then((r) => r.data.data.tasks),
    enabled:  !!boardId,
  });
}

export function useCreateTask(boardId) {
  return useMutation({
    mutationFn: (data) => taskApi.create(boardId, data).then((r) => r.data.data.task),
    onSuccess: (task) => {
      queryClient.setQueryData(['tasks', boardId], (prev = []) =>
        prev.some((t) => t.id === task.id) ? prev : [...prev, task]
      );
    },
    onError: (err) => toast.error(err.response?.data?.error?.message || 'Failed to create task'),
  });
}

export function useUpdateTask(boardId) {
  return useMutation({
    mutationFn: ({ taskId, data }) => taskApi.update(taskId, data).then((r) => r.data.data.task),
    onSuccess: (task) => {
      queryClient.setQueryData(['tasks', boardId], (prev = []) =>
        prev.map((t) => (t.id === task.id || t._id === task.id) ? task : t)
      );
    },
    onError: (err) => toast.error(err.response?.data?.error?.message || 'Update failed'),
  });
}

export function useMoveTask(boardId) {
  return useMutation({
    mutationFn: ({ taskId, columnId, position }) =>
      taskApi.move(taskId, { columnId, position }).then((r) => r.data.data.task),

    // Optimistic update — apply immediately; roll back on error
    onMutate: async ({ taskId, columnId, position }) => {
      await queryClient.cancelQueries({ queryKey: ['tasks', boardId] });
      const previous = queryClient.getQueryData(['tasks', boardId]);

      queryClient.setQueryData(['tasks', boardId], (prev = []) =>
        prev.map((t) =>
          (t.id === taskId || t._id === taskId)
            ? { ...t, column: columnId, position }
            : t
        )
      );
      return { previous };
    },

    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['tasks', boardId], context.previous);
      }
      toast.error('Failed to move task');
    },
  });
}

export function useDeleteTask(boardId) {
  return useMutation({
    mutationFn: (taskId) => taskApi.remove(taskId),
    onSuccess: (_data, taskId) => {
      queryClient.setQueryData(['tasks', boardId], (prev = []) =>
        prev.filter((t) => t.id !== taskId && t._id !== taskId)
      );
      toast.success('Task deleted');
    },
    onError: () => toast.error('Failed to delete task'),
  });
}

// ══ useBoardSocket ════════════════════════════════════════════════════════════

export function useBoardSocket(boardId) {
  useEffect(() => {
    if (!boardId) return;

    const socket = getSocket();
    socket.emit('board:join', boardId);

    const TASKS_KEY = ['tasks', boardId];

    socket.on('task:created', ({ task }) => {
      queryClient.setQueryData(TASKS_KEY, (prev = []) =>
        prev.some((t) => t.id === task.id) ? prev : [...prev, task]
      );
    });

    socket.on('task:updated', ({ taskId, changes }) => {
      queryClient.setQueryData(TASKS_KEY, (prev = []) =>
        prev.map((t) => (t.id === taskId || t._id === taskId) ? { ...t, ...changes } : t)
      );
    });

    socket.on('task:moved', ({ taskId, column, position }) => {
      queryClient.setQueryData(TASKS_KEY, (prev = []) =>
        prev.map((t) =>
          (t.id === taskId || t._id === taskId) ? { ...t, column, position } : t
        )
      );
    });

    socket.on('task:deleted', ({ taskId }) => {
      queryClient.setQueryData(TASKS_KEY, (prev = []) =>
        prev.filter((t) => t.id !== taskId && t._id !== taskId)
      );
    });

    socket.on('board:updated', ({ board }) => {
      queryClient.setQueryData(['board', boardId], board);
    });

    return () => {
      socket.emit('board:leave', boardId);
      socket.off('task:created');
      socket.off('task:updated');
      socket.off('task:moved');
      socket.off('task:deleted');
      socket.off('board:updated');
    };
  }, [boardId]);
}
