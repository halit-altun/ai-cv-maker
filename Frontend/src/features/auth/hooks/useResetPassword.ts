'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { resetPasswordRequest } from '@/lib/auth/api';
import { appRoutes } from '@/features/dashboard/constants/routes';
import { authCopy, getAuthErrorMessage } from '../constants/copy';

export function useResetPassword() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = String(searchParams.get('token') || '').trim();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    token ? null : authCopy.resetMissingToken
  );
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!token) {
      setError(authCopy.resetMissingToken);
      return;
    }

    if (password !== confirmPassword) {
      setError(authCopy.passwordMismatch);
      return;
    }

    setLoading(true);
    try {
      const result = await resetPasswordRequest({ token, newPassword: password });
      setSuccess(result.message || authCopy.resetSuccess);
      router.replace(`${appRoutes.login}?reset=1`);
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return {
    token,
    password,
    confirmPassword,
    showPassword,
    showConfirmPassword,
    loading,
    error,
    success,
    setPassword,
    setConfirmPassword,
    setShowPassword,
    setShowConfirmPassword,
    handleSubmit,
  };
}
