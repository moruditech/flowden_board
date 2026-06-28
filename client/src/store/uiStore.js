import { create } from 'zustand';

export const useUiStore = create((set, get) => ({
  activeOrgId:  null,
  // Default false — desktop always-visible is handled by md:translate-x-0 CSS,
  // so false is safe on desktop and correct on mobile (drawer starts closed).
  sidebarOpen:  false,
  modalStack:   [],

  setActiveOrg:   (id)  => set({ activeOrgId: id }),
  setSidebarOpen: (val) => set({ sidebarOpen: val }),
  toggleSidebar:  ()    => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  openModal:      (id)  => set((s) => ({ modalStack: s.modalStack.includes(id) ? s.modalStack : [...s.modalStack, id] })),
  closeModal:     (id)  => set((s) => ({ modalStack: s.modalStack.filter((m) => m !== id) })),
  isModalOpen:    (id)  => get().modalStack.includes(id),
}));
