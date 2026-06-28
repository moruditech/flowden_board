import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authApi } from '../../api/auth.api.js';
import { useAuthStore } from '../../store/authStore.js';
import { queryClient } from '../../lib/queryClient.js';

export function useRegister() {
  const { setAuth } = useAuthStore();
  const navigate    = useNavigate();
  return useMutation({
    mutationFn: (data) => authApi.register(data).then((r) => r.data.data),
    onSuccess: ({ user, accessToken }) => {
      setAuth(user, accessToken);
      toast.success('Account created');
      navigate('/');
    },
    onError: (err) => toast.error(err.response?.data?.error?.message || 'Registration failed'),
  });
}

export function useLogin() {
  const { setAuth } = useAuthStore();
  const navigate    = useNavigate();
  return useMutation({
    mutationFn: (data) => authApi.login(data).then((r) => r.data.data),
    onSuccess: ({ user, accessToken }) => {
      setAuth(user, accessToken);
      navigate('/');
    },
    onError: (err) => toast.error(err.response?.data?.error?.message || 'Invalid credentials'),
  });
}

export function useLogout() {
  const { clearAuth } = useAuthStore();
  const navigate      = useNavigate();
  return useMutation({
    mutationFn: () => authApi.logout(),
    onSettled:  () => { clearAuth(); navigate('/login'); },
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (data) => authApi.forgotPassword(data),
    onSuccess:  () => toast.success('If that email exists, a reset link has been sent'),
    onError:    () => toast.success('If that email exists, a reset link has been sent'), // never reveal
  });
}

export function useResetPassword() {
  const navigate = useNavigate();
  return useMutation({
    mutationFn: (data) => authApi.resetPassword(data),
    onSuccess:  () => { toast.success('Password updated — please log in'); navigate('/login'); },
    onError:    (err) => toast.error(err.response?.data?.error?.message || 'Reset failed'),
  });
}

export function useVerifyEmail() {
  return useMutation({
    mutationFn: (data) => authApi.verifyEmail(data),
    onError:    (err) => toast.error(err.response?.data?.error?.message || 'Verification failed'),
  });
}

export function useResendVerification() {
  return useMutation({
    mutationFn: () => authApi.resendVerification(),
    onSuccess:  () => toast.success('Verification email sent'),
    onError:    () => toast.error('Failed to send email — try again'),
  });
}

export function useMe() {
  const { user } = useAuthStore();
  return useQuery({
    queryKey: ['me'],
    queryFn:  () => authApi.getMe().then((r) => r.data.data.user),
    enabled:  !!user,
    staleTime: Infinity,
  });
}
