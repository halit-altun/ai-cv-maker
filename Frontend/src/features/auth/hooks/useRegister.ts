'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  registerRequest,
  resendVerificationRequest,
  verifyEmailRequest,
} from '@/lib/auth/api';
import { appRoutes } from '@/features/dashboard/constants/routes';
import { authCopy, getAuthErrorMessage } from '../constants/copy';

type RegisterStep = 'form' | 'verify';

export function useRegister() {
  const router = useRouter();
  const [step, setStep] = useState<RegisterStep>('form');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [code, setCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [expiresInMinutes, setExpiresInMinutes] = useState<number | null>(null);

  async function handleRegisterSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setInfo(null);

    if (password !== confirmPassword) {
      setError(authCopy.passwordMismatch);
      return;
    }

    setLoading(true);
    try {
      const result = await registerRequest({ email, password, fullName });
      setEmail(result.email);
      setExpiresInMinutes(result.expiresInMinutes ?? null);
      setInfo(result.message ?? null);
      setStep('verify');
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifySubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);

    try {
      const result = await verifyEmailRequest({ email, code });
      setInfo(result.message || authCopy.verifySuccess);
      router.replace(`${appRoutes.login}?verified=1`);
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleResendCode() {
    setError(null);
    setInfo(null);
    setResending(true);

    try {
      const result = await resendVerificationRequest(email);
      setExpiresInMinutes(result.expiresInMinutes ?? expiresInMinutes);
      setInfo(result.message || 'Yeni doğrulama kodu gönderildi.');
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setResending(false);
    }
  }

  return {
    step,
    fullName,
    email,
    password,
    confirmPassword,
    code,
    showPassword,
    showConfirmPassword,
    loading,
    resending,
    error,
    info,
    expiresInMinutes,
    setFullName,
    setEmail,
    setPassword,
    setConfirmPassword,
    setCode,
    setShowPassword,
    setShowConfirmPassword,
    handleRegisterSubmit,
    handleVerifySubmit,
    handleResendCode,
  };
}
