import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '../../components/ui/Button.jsx';
import { Input } from '../../components/ui/Input.jsx';
import {
  useLogin, useRegister, useForgotPassword,
  useResetPassword, useVerifyEmail, useResendVerification,
} from './useAuth.js';

// ── Shared auth layout ────────────────────────────────────────────────────────
function AuthShell({ title, subtitle, children }) {
  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col">
      {/* Thin brand bar */}
      <div className="h-1 bg-brand-600 shrink-0" />

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-[380px]">
          {/* Logo */}
          <div className="flex items-center gap-2.5 mb-8">
            <div className="w-8 h-8 rounded bg-brand-600 flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-bold">TW</span>
            </div>
            <span className="text-zinc-900 text-sm font-semibold tracking-tight">Team Workspace</span>
          </div>

          <h1 className="text-xl font-semibold text-zinc-900 mb-1">{title}</h1>
          {subtitle && <p className="text-sm text-zinc-500 mb-6">{subtitle}</p>}

          {children}
        </div>
      </div>
    </div>
  );
}

// ── Login ─────────────────────────────────────────────────────────────────────
export default function LoginPage() {
  const login = useLogin();
  const [form, setForm] = useState({ email: '', password: '' });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <AuthShell title="Sign in" subtitle="Welcome back — enter your details below.">
      <form onSubmit={(e) => { e.preventDefault(); login.mutate(form); }} className="space-y-4">
        <Input label="Email" type="email" autoComplete="email" required
          value={form.email} onChange={set('email')} placeholder="you@example.com" />
        <div>
          <Input label="Password" type="password" autoComplete="current-password" required
            value={form.password} onChange={set('password')} placeholder="••••••••" />
          <div className="text-right mt-1.5">
            <Link to="/forgot-password" className="text-xs text-brand-700 hover:underline">
              Forgot password?
            </Link>
          </div>
        </div>
        <Button type="submit" className="w-full" loading={login.isPending}>
          Sign in
        </Button>
      </form>

      <p className="mt-6 text-center text-xs text-zinc-500">
        No account?{' '}
        <Link to="/register" className="text-brand-700 font-medium hover:underline">Create one</Link>
      </p>
    </AuthShell>
  );
}

// ── Register ──────────────────────────────────────────────────────────────────
export function RegisterPage() {
  const register = useRegister();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <AuthShell title="Create an account" subtitle="Get started — it only takes a minute.">
      <form onSubmit={(e) => { e.preventDefault(); register.mutate(form); }} className="space-y-4">
        <Input label="Full name" type="text" autoComplete="name" required
          value={form.name} onChange={set('name')} placeholder="Ada Lovelace" />
        <Input label="Work email" type="email" autoComplete="email" required
          value={form.email} onChange={set('email')} placeholder="ada@company.com" />
        <Input label="Password" type="password" autoComplete="new-password" required
          value={form.password} onChange={set('password')}
          placeholder="Min 8 chars, 1 uppercase, 1 number"
          helper="At least 8 characters with one uppercase letter and one number" />
        <Button type="submit" className="w-full" loading={register.isPending}>
          Create account
        </Button>
      </form>

      <p className="mt-6 text-center text-xs text-zinc-500">
        Already have an account?{' '}
        <Link to="/login" className="text-brand-700 font-medium hover:underline">Sign in</Link>
      </p>
    </AuthShell>
  );
}

// ── Forgot password ───────────────────────────────────────────────────────────
export function ForgotPasswordPage() {
  const forgot  = useForgotPassword();
  const [email, setEmail] = useState('');

  if (forgot.isSuccess) {
    return (
      <AuthShell title="Check your inbox" subtitle="We've sent a reset link if that email is registered.">
        <div className="p-4 bg-brand-50 border border-brand-200 rounded text-sm text-brand-800">
          Didn't receive it? Check your spam folder or{' '}
          <button className="font-medium underline" onClick={() => forgot.reset()}>try again</button>.
        </div>
        <p className="mt-6 text-center text-xs text-zinc-500">
          <Link to="/login" className="text-brand-700 font-medium hover:underline">Back to sign in</Link>
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Reset your password" subtitle="Enter your email and we'll send you a reset link.">
      <form onSubmit={(e) => { e.preventDefault(); forgot.mutate({ email }); }} className="space-y-4">
        <Input label="Email" type="email" autoComplete="email" required
          value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        <Button type="submit" className="w-full" loading={forgot.isPending}>
          Send reset link
        </Button>
      </form>
      <p className="mt-6 text-center text-xs text-zinc-500">
        <Link to="/login" className="text-brand-700 font-medium hover:underline">Back to sign in</Link>
      </p>
    </AuthShell>
  );
}

// ── Reset password ────────────────────────────────────────────────────────────
export function ResetPasswordPage() {
  const [params]   = useSearchParams();
  const reset      = useResetPassword();
  const [password, setPassword] = useState('');
  const token      = params.get('token') || '';

  return (
    <AuthShell title="Set a new password" subtitle="Choose a strong password for your account.">
      {!token && (
        <div className="p-4 bg-red-50 border border-red-200 rounded text-sm text-red-700 mb-4">
          Invalid or missing reset token. Please request a new reset link.
        </div>
      )}
      <form onSubmit={(e) => { e.preventDefault(); reset.mutate({ token, newPassword: password }); }}
        className="space-y-4">
        <Input label="New password" type="password" autoComplete="new-password" required
          value={password} onChange={(e) => setPassword(e.target.value)}
          placeholder="Min 8 chars, 1 uppercase, 1 number"
          disabled={!token} />
        <Button type="submit" className="w-full" loading={reset.isPending} disabled={!token}>
          Update password
        </Button>
      </form>
    </AuthShell>
  );
}

// ── Verify email ──────────────────────────────────────────────────────────────
export function VerifyEmailPage() {
  const [params]  = useSearchParams();
  const verify    = useVerifyEmail();
  const resend    = useResendVerification();
  const token     = params.get('token') || '';

  useEffect(() => {
    if (token) verify.mutate({ token });
  }, [token]);

  if (!token) {
    return (
      <AuthShell title="Verify your email" subtitle="Check your inbox for a verification link.">
        <div className="p-4 bg-zinc-100 rounded text-sm text-zinc-700">
          Didn't get the email?{' '}
          <button
            className="text-brand-700 font-medium hover:underline"
            onClick={() => resend.mutate()}
            disabled={resend.isPending}
          >
            {resend.isPending ? 'Sending...' : 'Resend it'}
          </button>
        </div>
      </AuthShell>
    );
  }

  if (verify.isPending) {
    return <AuthShell title="Verifying..." subtitle="Please wait a moment.">
      <div className="flex justify-center"><span className="w-5 h-5 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" /></div>
    </AuthShell>;
  }

  if (verify.isSuccess) {
    return (
      <AuthShell title="Email verified" subtitle="Your email address has been confirmed.">
        <div className="p-4 bg-brand-50 border border-brand-200 rounded text-sm text-brand-800 mb-4">
          You're all set. Your account is now active.
        </div>
        <Link to="/" className="block">
          <Button className="w-full">Go to workspace</Button>
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Verification failed" subtitle="The link may have expired or already been used.">
      <div className="p-4 bg-red-50 border border-red-200 rounded text-sm text-red-700 mb-4">
        {verify.error?.response?.data?.error?.message || 'Token is invalid or expired.'}
      </div>
      <Button variant="secondary" className="w-full" onClick={() => resend.mutate()} loading={resend.isPending}>
        Resend verification email
      </Button>
    </AuthShell>
  );
}
