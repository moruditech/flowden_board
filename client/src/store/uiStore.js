import { create } from 'zustand';

export const useUiStore = create((set, get) => ({
  activeOrgId:  null,
  sidebarOpen:  true,
  modalStack:   [],

  setActiveOrg:  (id)  => set({ activeOrgId: id }),
  toggleSidebar: ()    => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  openModal:     (id)  => set((s) => ({ modalStack: s.modalStack.includes(id) ? s.modalStack : [...s.modalStack, id] })),
  closeModal:    (id)  => set((s) => ({ modalStack: s.modalStack.filter((m) => m !== id) })),
  isModalOpen:   (id)  => get().modalStack.includes(id),
}));
