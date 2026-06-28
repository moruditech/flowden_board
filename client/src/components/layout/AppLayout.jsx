import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar.jsx';

// AppLayout is intentionally thin — Sidebar manages its own backdrop and
// drawer state via uiStore, so nothing needs to be threaded through here.
export function AppLayout() {
  return (
    <div className="flex h-screen h-[100dvh] overflow-hidden bg-surface">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
