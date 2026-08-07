'use client';

import { useState } from 'react';
import { forgotPasswordRequest } from '@/lib/auth/api';
import { authCopy, getAuthErrorMessage } from '../constants/copy';

export function useForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const result = await forgotPasswordRequest(email);
      setSuccess(result.message || authCopy.forgotSuccess);
      setSubmitted(true);
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return {
    email,
    loading,
    error,
    success,
    submitted,
    setEmail,
    handleSubmit,
  };
}
