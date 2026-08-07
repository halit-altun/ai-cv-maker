'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { loginRequest } from '@/lib/auth/api';
import { appRoutes } from '@/features/dashboard/constants/routes';
import { authCopy, getAuthErrorMessage } from '../constants/copy';

function resolvePostLoginPath(returnUrl: string | null): string {
  if (returnUrl?.startsWith('/') && !returnUrl.startsWith('//') && !returnUrl.includes('://')) {
    return returnUrl;
  }
  return appRoutes.dashboard;
}

export function useLogin() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success] = useState<string | null>(() => {
    if (searchParams.get('verified') === '1') return authCopy.verifySuccess;
    if (searchParams.get('reset') === '1') return authCopy.resetSuccess;
    return null;
  });

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await loginRequest({ email, password });
      // Full navigation so Next middleware sees first-party cookies (Lamfer-style).
      // Soft router.replace can bounce back to /login on Netlify before cookies stick.
      window.location.replace(resolvePostLoginPath(searchParams.get('returnUrl')));
    } catch (err) {
      setError(getAuthErrorMessage(err));
      setLoading(false);
    }
  }

  return {
    email,
    password,
    showPassword,
    rememberMe,
    loading,
    error,
    success,
    setEmail,
    setPassword,
    setShowPassword,
    setRememberMe,
    handleSubmit,
  };
}
