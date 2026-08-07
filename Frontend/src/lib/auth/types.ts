export type AuthUser = {
  id: string;
  email: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
  title?: string;
  contactEmail?: string;
  phone?: string;
  country?: string;
  city?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  githubUrl?: string;
  /** Company Based: analiz bitince mailleri otomatik gönder */
  autoSendOutreachAfterAnalysis?: boolean;
  /** AI Provider: gemini-free (3 key) / gemini-pro (1 key paid) / openai */
  preferredAiProvider?: 'gemini-free' | 'gemini-pro' | 'openai';
  /** Gmail queue: min aralık toplam saniye (0 = sınırsız) */
  gmailSendIntervalMinSeconds?: number;
  /** Gmail queue: max aralık toplam saniye */
  gmailSendIntervalMaxSeconds?: number;
  /** @deprecated floor(seconds/60) — geriye uyum */
  gmailSendIntervalMinMinutes?: number;
  /** @deprecated floor(seconds/60) — geriye uyum */
  gmailSendIntervalMaxMinutes?: number;
  /** Mail okundu tracking (pixel) aktif mi */
  enableMailTracking?: boolean;
  /** Profil fotoğrafı (Cloudinary) */
  profileImageUrl?: string;
  profileImagePublicId?: string;
  clientId: string;
  role: string;
  isActive: boolean;
  emailVerified: boolean;
  emailVerifiedAt: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type AuthSession = {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt?: string;
};

export type AuthApiError = {
  ok: false;
  message: string;
  code?: string;
  details?: unknown;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type RegisterPayload = {
  email: string;
  password: string;
  fullName?: string;
};

export type RegisterResult = {
  requiresEmailVerification: boolean;
  email: string;
  expiresInMinutes?: number;
  message?: string;
};

export type VerifyEmailPayload = {
  email: string;
  code: string;
};

export type VerifyEmailResult = {
  verified: boolean;
  email: string;
  message?: string;
};

export type ForgotPasswordResult = {
  message: string;
};

export type ResetPasswordPayload = {
  token: string;
  newPassword: string;
};

export type ResetPasswordResult = {
  reset: boolean;
  message?: string;
};
