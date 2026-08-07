'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { loginRequest } from '@/lib/auth/api';
import { appRoutes } from '@/features/dashboard/constants/routes';
import { authCopy, getAuthErrorMessage } from '../constants/copy';

export function useLogin() {
  const router = useRouter();
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
      const returnUrl = searchParams.get('returnUrl');
      const destination =
        returnUrl?.startsWith('/') && !returnUrl.startsWith('//')
          ? returnUrl
          : appRoutes.dashboard;
      router.replace(destination);
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
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
