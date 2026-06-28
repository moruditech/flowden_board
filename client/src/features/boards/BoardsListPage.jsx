import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../../components/layout/Header.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';
import { EmptyState } from '../../components/shared/EmptyState.jsx';
import { BoardCard, CreateBoardModal } from './components/BoardComponents.jsx';
import { useBoards, useDeleteBoard } from './hooks/useBoards.js';
import { useUiStore } from '../../store/uiStore.js';

const BoardIcon = (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <rect x="1" y="1" width="6" height="16" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
    <rect x="9" y="1" width="8" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
  </svg>
);

export default function BoardsListPage() {
  const { activeOrgId } = useUiStore();
  const navigate        = useNavigate();
  const [showCreate, setShowCreate] = useState(false);

  const boardsQuery = useBoards(activeOrgId);
  const deleteBoard = useDeleteBoard(activeOrgId);

  const boards = boardsQuery.data || [];

  if (!activeOrgId) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <Header title="Boards" />
        <div className="flex-1 flex items-center justify-center">
          <EmptyState
            icon={BoardIcon}
            title="No organization selected"
            description="Select or create an organization from the sidebar to get started."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header
        title="Boards"
        actions={
          <Button size="sm" onClick={() => setShowCreate(true)}>
            New board
          </Button>
        }
      />

      <div className="flex-1 overflow-y-auto p-6">
        {boardsQuery.isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-28 rounded" />
            ))}
          </div>
        ) : boards.length === 0 ? (
          <EmptyState
            icon={BoardIcon}
            title="No boards yet"
            description="Create your first board to start organising tasks across columns."
            action={<Button size="sm" onClick={() => setShowCreate(true)}>Create first board</Button>}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl">
            {boards.map((board) => (
              <BoardCard
                key={board.id || board._id}
                board={board}
                orgId={activeOrgId}
                onDelete={(boardId, opts) => deleteBoard.mutate(boardId, opts)}
              />
            ))}
          </div>
        )}
      </div>

      <CreateBoardModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        orgId={activeOrgId}
      />
    </div>
  );
}
