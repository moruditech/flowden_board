import { create } from 'zustand';
import { setAccessToken } from '../api/client.js';
import { connectSocket, disconnectSocket, reauthSocket } from '../lib/socket.js';
import { queryClient } from '../lib/queryClient.js';

export const useAuthStore = create((set) => ({
  user:          null,
  isInitialised: false,

  setAuth(user, accessToken) {
    setAccessToken(accessToken);
    connectSocket();
    set({ user });
  },

  refreshAuth(user, newToken) {
    setAccessToken(newToken);
    reauthSocket();
    set({ user });
  },

  clearAuth() {
    setAccessToken(null);
    disconnectSocket();
    queryClient.clear();
    set({ user: null });
  },

  setInitialised: () => set({ isInitialised: true }),
}));
