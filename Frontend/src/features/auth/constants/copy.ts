import type { AuthApiError } from '@/lib/auth/types';

export const authCopy = {
  brandName: 'CareerAI',
  loginTitle: 'Hesabına giriş yap',
  loginSubtitle: 'CV’lerini yönetmek ve AI ile kariyerine devam etmek için oturum aç.',
  emailLabel: 'E-posta',
  emailPlaceholder: 'ornek@email.com',
  passwordLabel: 'Şifre',
  passwordPlaceholder: 'Şifrenizi girin',
  rememberMe: 'Beni hatırla',
  forgotPassword: 'Şifremi unuttum',
  submit: 'Giriş yap',
  submitting: 'Giriş yapılıyor...',
  noAccount: 'Hesabın yok mu?',
  registerCta: 'Kayıt ol',
  backToHome: 'Ana sayfaya dön',
  heroEyebrow: 'AI destekli CV platformu',
  heroTitle: 'Kariyerini bir adım öne taşı',
  heroBody:
    'Profesyonel CV’ler oluştur, şirket ilanlarına göre optimize et ve profilini güçlendir.',
  networkError: 'Sunucuya bağlanılamadı. Backend’in çalıştığından emin olun.',

  registerTitle: 'Hesap oluştur',
  registerSubtitle: 'Birkaç adımda CareerAI’ye katıl ve AI destekli CV’ler üretmeye başla.',
  fullNameLabel: 'Ad Soyad',
  fullNamePlaceholder: 'Adınız Soyadınız',
  confirmPasswordLabel: 'Şifre tekrar',
  confirmPasswordPlaceholder: 'Şifrenizi tekrar girin',
  passwordHint: 'En az 8 karakter, bir harf ve bir rakam içermelidir.',
  registerSubmit: 'Kayıt ol',
  registerSubmitting: 'Hesap oluşturuluyor...',
  hasAccount: 'Zaten hesabın var mı?',
  loginCta: 'Giriş yap',
  passwordMismatch: 'Şifreler eşleşmiyor.',

  verifyTitle: 'E-postanı doğrula',
  verifySubtitlePrefix: 'adresine gönderilen 6 haneli kodu gir.',
  verifyCodeLabel: 'Doğrulama kodu',
  verifyCodePlaceholder: '000000',
  verifySubmit: 'Doğrula',
  verifySubmitting: 'Doğrulanıyor...',
  resendCode: 'Kodu yeniden gönder',
  resendingCode: 'Gönderiliyor...',
  verifySuccess: 'E-posta doğrulandı. Şimdi giriş yapabilirsiniz.',

  forgotTitle: 'Şifreni sıfırla',
  forgotSubtitle:
    'Kayıtlı e-posta adresini gir; sıfırlama bağlantısını sana gönderelim.',
  forgotSubmit: 'Sıfırlama bağlantısı gönder',
  forgotSubmitting: 'Gönderiliyor...',
  forgotSuccess:
    'Eğer bu e-posta kayıtlıysa şifre sıfırlama bağlantısı gönderildi.',
  backToLogin: 'Giriş sayfasına dön',

  resetTitle: 'Yeni şifre belirle',
  resetSubtitle: 'Hesabın için güvenli bir şifre oluştur.',
  newPasswordLabel: 'Yeni şifre',
  newPasswordPlaceholder: 'Yeni şifrenizi girin',
  resetSubmit: 'Şifreyi güncelle',
  resetSubmitting: 'Güncelleniyor...',
  resetSuccess: 'Şifre güncellendi. Yeni şifrenizle giriş yapabilirsiniz.',
  resetMissingToken: 'Geçersiz veya eksik sıfırlama bağlantısı. Yeni bir istek gönderin.',
} as const;

export function getVerifySubtitle(email: string): string {
  return `${email} ${authCopy.verifySubtitlePrefix}`;
}

export function getAuthErrorMessage(error: unknown): string {
  if (!error) return 'Beklenmeyen bir hata oluştu.';

  if (typeof error === 'object' && error !== null && 'message' in error) {
    const authError = error as AuthApiError;
    if (typeof authError.message === 'string' && authError.message.trim()) {
      return authError.message;
    }
  }

  if (error instanceof TypeError) {
    return authCopy.networkError;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Beklenmeyen bir hata oluştu.';
}
