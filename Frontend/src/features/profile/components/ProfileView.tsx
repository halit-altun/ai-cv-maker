'use client';

import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControlLabel,
  LinearProgress,
  Radio,
  RadioGroup,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import { authFetch } from '@/lib/auth/authFetch';
import { updateProfileRequest } from '@/lib/auth/api';
import type { AuthUser } from '@/lib/auth/types';
import {
  getEmailVerifyQuotaRequest,
  getOutreachQuotaRequest,
} from '@/lib/outreach/api';
import { dashboardTokens } from '@/features/dashboard/styles/dashboardTokens';
import { ProfilePhotoUploader } from './ProfilePhotoUploader';

type EmailVerifyQuota = {
  service: string;
  provider: string;
  docsUrl: string;
  configured: boolean;
  periodKey: string;
  limit: number;
  used: number;
  remaining: number;
  lastUsedAt: string | null;
  lastEmail: string;
  note: string;
};

function formatDateTime(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('tr-TR');
}

function splitFullName(fullName?: string): { firstName: string; lastName: string } {
  const parts = String(fullName || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return { firstName: '', lastName: '' };
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

export function ProfileView() {
  const { colors, fonts } = dashboardTokens;
  const [user, setUser] = useState<AuthUser | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [title, setTitle] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [autoSendOutreachAfterAnalysis, setAutoSendOutreachAfterAnalysis] = useState(false);
  const [queuedIntervalOutreach, setQueuedIntervalOutreach] = useState(false);
  const [preferredAiProvider, setPreferredAiProvider] = useState<'gemini-free' | 'gemini-pro' | 'openai'>('gemini-free');
  const [intervalMinMinutes, setIntervalMinMinutes] = useState(0);
  const [intervalMinSecondsPart, setIntervalMinSecondsPart] = useState(0);
  const [intervalMaxMinutes, setIntervalMaxMinutes] = useState(0);
  const [intervalMaxSecondsPart, setIntervalMaxSecondsPart] = useState(0);
  const [enableMailTracking, setEnableMailTracking] = useState(true);
  const [persistOutreachHistory, setPersistOutreachHistory] = useState(true);
  const [emailVerifyQuota, setEmailVerifyQuota] = useState<EmailVerifyQuota | null>(null);
  const [outreachQuota, setOutreachQuota] = useState<{
    usedToday: number;
    remainingToday: number;
    dailyEmailLimit: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const applyUserToForm = (u: AuthUser) => {
    setUser(u);
    const fromFull = splitFullName(u.fullName);
    setFirstName(u.firstName || fromFull.firstName);
    setLastName(u.lastName || fromFull.lastName);
    setTitle(u.title || '');
    setContactEmail(u.contactEmail || u.email || '');
    setPhone(u.phone || '');
    setCountry(u.country || '');
    setCity(u.city || '');
    setLinkedinUrl(u.linkedinUrl || '');
    setPortfolioUrl(u.portfolioUrl || '');
    setGithubUrl(u.githubUrl || '');
    setAutoSendOutreachAfterAnalysis(u.autoSendOutreachAfterAnalysis === true);
    setQueuedIntervalOutreach(u.queuedIntervalOutreach === true);
    setPreferredAiProvider(u.preferredAiProvider || 'gemini-free');
    const minTotal =
      typeof u.gmailSendIntervalMinSeconds === 'number' && u.gmailSendIntervalMinSeconds > 0
        ? u.gmailSendIntervalMinSeconds
        : (u.gmailSendIntervalMinMinutes || 0) * 60;
    const maxTotal =
      typeof u.gmailSendIntervalMaxSeconds === 'number' && u.gmailSendIntervalMaxSeconds > 0
        ? u.gmailSendIntervalMaxSeconds
        : (u.gmailSendIntervalMaxMinutes || 0) * 60;
    setIntervalMinMinutes(Math.floor(minTotal / 60));
    setIntervalMinSecondsPart(minTotal % 60);
    setIntervalMaxMinutes(Math.floor(maxTotal / 60));
    setIntervalMaxSecondsPart(maxTotal % 60);
    setEnableMailTracking(u.enableMailTracking !== false);
    setPersistOutreachHistory(u.persistOutreachHistory !== false);
  };

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const [meRes, emailVerifyQuotaData, outreach] = await Promise.all([
          authFetch('/api/auth/me'),
          getEmailVerifyQuotaRequest().catch(() => null),
          getOutreachQuotaRequest().catch(() => null),
        ]);

        const meData = (await meRes.json().catch(() => ({}))) as {
          ok?: boolean;
          user?: AuthUser;
          message?: string;
        };

        if (!cancelled) {
          if (meRes.ok && meData.user) applyUserToForm(meData.user);
          if (emailVerifyQuotaData) setEmailVerifyQuota(emailVerifyQuotaData);
          else setError('EmailVerify kota bilgisi alınamadı.');
          if (outreach) {
            setOutreachQuota({
              usedToday: outreach.usedToday,
              remainingToday: outreach.remainingToday,
              dailyEmailLimit: outreach.dailyEmailLimit,
            });
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Profil yüklenemedi.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSaveProfile = async () => {
    setSaving(true);
    setSaveMessage(null);
    setError(null);
    try {
      const minTotal = Math.max(0, intervalMinMinutes * 60 + intervalMinSecondsPart);
      const maxTotal = Math.max(0, intervalMaxMinutes * 60 + intervalMaxSecondsPart);
      const updated = await updateProfileRequest({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        title: title.trim(),
        contactEmail: contactEmail.trim(),
        phone: phone.trim(),
        country: country.trim(),
        city: city.trim(),
        linkedinUrl: linkedinUrl.trim(),
        portfolioUrl: portfolioUrl.trim(),
        githubUrl: githubUrl.trim(),
        autoSendOutreachAfterAnalysis,
        queuedIntervalOutreach,
        preferredAiProvider,
        gmailSendIntervalMinSeconds: minTotal,
        gmailSendIntervalMaxSeconds: maxTotal,
        enableMailTracking,
        persistOutreachHistory,
      });
      applyUserToForm(updated);
      setSaveMessage(
        'Profil kaydedildi. CV oluşturma ve Company Based mail alanlarında varsayılan olarak kullanılır.'
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Profil kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  };

  const emailVerifyRatio =
    emailVerifyQuota && emailVerifyQuota.limit > 0
      ? Math.min(1, emailVerifyQuota.used / emailVerifyQuota.limit)
      : 0;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, maxWidth: 720 }}>
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
          <PersonOutlineIcon sx={{ color: colors.secondary }} />
          <Typography
            sx={{
              fontFamily: fonts.display,
              fontSize: { xs: '1.25rem', md: '1.5rem' },
              fontWeight: 600,
              color: colors.primary,
            }}
          >
            Profilim
          </Typography>
        </Box>
        <Typography sx={{ color: colors.onSurfaceVariant }}>
          Kişisel bilgiler, CV oluşturmada ve Company Based mail imzasında varsayılan olur; isterseniz
          ilgili adımda değiştirebilirsiniz.
        </Typography>
      </Box>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {!loading && error && (
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      {!loading && (
        <>
          <ProfilePhotoUploader
            photoUrl={user?.profileImageUrl}
            onUpdated={(u) => {
              setUser(u);
              applyUserToForm(u);
            }}
          />

          <Box
            sx={{
              p: 2.5,
              borderRadius: 3,
              border: `1px solid ${colors.outlineVariant}`,
              bgcolor: colors.surfaceContainerLowest,
            }}
          >
            <Typography fontWeight={700} sx={{ mb: 0.5 }}>
              Kişisel bilgiler
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Bu alanlar yeni CV oluştururken varsayılan olarak doldurulur; isterseniz CV
              ekranında değiştirebilirsiniz.
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              <strong>Giriş e-postası:</strong> {user?.email || '—'}
            </Typography>
            {user?.clientId && (
              <Typography
                variant="body2"
                sx={{ fontFamily: 'monospace', fontSize: 12, mb: 2 }}
              >
                <strong>Client ID:</strong> {user.clientId}
              </Typography>
            )}

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                gap: 2,
              }}
            >
              <TextField
                label="Ad"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                fullWidth
                size="small"
              />
              <TextField
                label="Soyad"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                fullWidth
                size="small"
              />
              <TextField
                label="Ünvan / Pozisyon"
                placeholder="ör. Full Stack Web Developer"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                fullWidth
                size="small"
                sx={{ gridColumn: '1 / -1' }}
              />
              <TextField
                label="İletişim e-postası"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                fullWidth
                size="small"
                helperText="CV’de görünmesini istediğiniz e-posta (giriş e-postasından farklı olabilir)."
              />
              <TextField
                label="Telefon"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                fullWidth
                size="small"
              />
              <TextField
                label="Ülke"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                fullWidth
                size="small"
              />
              <TextField
                label="Şehir"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                fullWidth
                size="small"
              />
              <TextField
                label="Portfolyo"
                placeholder="https://..."
                value={portfolioUrl}
                onChange={(e) => setPortfolioUrl(e.target.value)}
                fullWidth
                size="small"
                sx={{ gridColumn: '1 / -1' }}
              />
              <TextField
                label="GitHub"
                placeholder="https://github.com/..."
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                fullWidth
                size="small"
              />
              <TextField
                label="LinkedIn"
                placeholder="https://linkedin.com/in/..."
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                fullWidth
                size="small"
              />
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 2 }}>
              <Button
                variant="contained"
                onClick={() => void handleSaveProfile()}
                disabled={saving}
                sx={{ textTransform: 'none' }}
              >
                {saving ? 'Kaydediliyor...' : 'Kaydet'}
              </Button>
              {saveMessage && (
                <Typography variant="body2" color="success.main">
                  {saveMessage}
                </Typography>
              )}
            </Box>
          </Box>

          <Box
            sx={{
              p: 2.5,
              borderRadius: 3,
              border: `1px solid ${colors.outlineVariant}`,
              bgcolor: colors.surfaceContainerLowest,
            }}
          >
            <Typography fontWeight={700} sx={{ mb: 0.5 }}>
              Company Based — mail
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Analiz sırasında &quot;Mail gönderimini etkinleştir&quot; açıksa, otomatik gönderim
              aktifken önizleme onayı beklemeden cold mail&apos;ler gönderilir. Aralıklı kuyruk
              kapalıysa gönderim tarayıcı açıkken eski HTTP akışında kalır; açıksa Todo kuyruğuna
              alınır ve analiz tamamlanınca şirket adımına dönülür.
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={autoSendOutreachAfterAnalysis}
                  onChange={(e) => setAutoSendOutreachAfterAnalysis(e.target.checked)}
                  color="secondary"
                />
              }
              label="Analiz sonrası mailleri otomatik gönder"
            />
            <FormControlLabel
              sx={{ mt: 0.5, alignItems: 'flex-start' }}
              control={
                <Switch
                  checked={queuedIntervalOutreach}
                  onChange={(e) => setQueuedIntervalOutreach(e.target.checked)}
                  color="secondary"
                />
              }
              label={
                <Box>
                  <Typography component="span" variant="body1">
                    Aralıklı (kuyruk) gönderim
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Açık: mailler profil aralığıyla kuyruğa gider; AI bitince analiz sekmesine
                    dönülür. Kapalı: tarayıcı kapanırsa kalan gönderimler durur.
                  </Typography>
                </Box>
              }
            />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 2 }}>
              <Button
                variant="outlined"
                onClick={() => void handleSaveProfile()}
                disabled={saving}
                sx={{ textTransform: 'none' }}
              >
                {saving ? 'Kaydediliyor...' : 'Bu ayarı kaydet'}
              </Button>
            </Box>
          </Box>

          {/* AI Provider Seçimi */}
          <Box
            sx={{
              p: 2.5,
              borderRadius: 3,
              border: `1px solid ${colors.outlineVariant}`,
              bgcolor: colors.surfaceContainerLowest,
            }}
          >
            <Typography fontWeight={700} sx={{ mb: 1 }}>
              AI Provider Seçimi
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Company Based ve diğer AI kullanılan alanlarda hangi modeli kullanmak istersiniz?
            </Typography>
            
            <RadioGroup
              value={preferredAiProvider}
              onChange={(e) => setPreferredAiProvider(e.target.value as any)}
            >
              <FormControlLabel
                value="gemini-free"
                control={<Radio color="secondary" />}
                label={
                  <Box>
                    <Typography component="span" fontWeight={600}>
                      Gemini 2.5 Flash Free (3 Key Round-Robin)
                    </Typography>
                    <Typography variant="caption" display="block" color="text.secondary">
                      1M token • $0 (ücretsiz) • 15 RPM × 3 key • 429 riski var ⚠️
                    </Typography>
                  </Box>
                }
              />
              
              <FormControlLabel
                value="gemini-pro"
                control={<Radio color="secondary" />}
                label={
                  <Box>
                    <Typography component="span" fontWeight={600}>
                      Gemini 2.5 Flash Pro (Paid Tier)
                    </Typography>
                    <Typography variant="caption" display="block" color="text.secondary">
                      1M token • $0.0015/istek • 1,000 RPM • Tek key, 429 yok ✅
                    </Typography>
                  </Box>
                }
                sx={{ mt: 1.5 }}
              />
              
              <FormControlLabel
                value="openai"
                control={<Radio color="secondary" />}
                label={
                  <Box>
                    <Typography component="span" fontWeight={600}>
                      OpenAI GPT-4o-mini
                    </Typography>
                    <Typography variant="caption" display="block" color="text.secondary">
                      128K token • $0.0020/istek • 10,000 RPM • Yüksek kalite, 429 yok ✅
                    </Typography>
                  </Box>
                }
                sx={{ mt: 1.5 }}
              />
            </RadioGroup>
            
            {preferredAiProvider === 'gemini-free' && (
              <Alert severity="warning" sx={{ mt: 2, borderRadius: 2 }}>
                <Typography variant="body2">
                  <strong>Uyarı:</strong> Free tier 15 RPM limiti düşük. 429 hatası alabilirsiniz.
                </Typography>
              </Alert>
            )}
            
            {preferredAiProvider === 'gemini-pro' && (
              <Alert severity="success" sx={{ mt: 2, borderRadius: 2 }}>
                <Typography variant="body2">
                  <strong>Gemini Pro:</strong> 1,000 RPM ile 429 sorunu yok. Paid tier key gerekli.
                </Typography>
              </Alert>
            )}
            
            {preferredAiProvider === 'openai' && (
              <Alert severity="info" sx={{ mt: 2, borderRadius: 2 }}>
                <Typography variant="body2">
                  <strong>GPT-4o-mini:</strong> En yüksek kalite, 10,000 RPM, 429 sorunu yok.
                </Typography>
              </Alert>
            )}
          </Box>

          {/* Gmail Gönderim Aralığı */}
          <Box
            sx={{
              p: 2.5,
              borderRadius: 3,
              border: `1px solid ${colors.outlineVariant}`,
              bgcolor: colors.surfaceContainerLowest,
            }}
          >
            <Typography fontWeight={700} sx={{ mb: 1 }}>
              Gmail Gönderim Aralığı (Random Queue Sistemi)
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Çoklu sekme veya otomatik mail durumunda mailler sıraya girer. Her mail arasında
              dakika + saniye cinsinden random bir süre beklenir (ör. 0 dk 30 sn – 2 dk 0 sn).
            </Typography>

            {/* Önerilen Aralıklar Infobox */}
            <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>
                Önerilen Aralıklar:
              </Typography>
              <Box component="ul" sx={{ m: 0, pl: 2 }}>
                <li>
                  <Typography variant="caption">
                    <strong>Hızlı test:</strong> 30 sn – 1 dk
                  </Typography>
                </li>
                <li>
                  <Typography variant="caption">
                    <strong>Tek mailbox:</strong> 2–5 dakika
                  </Typography>
                </li>
                <li>
                  <Typography variant="caption">
                    <strong>Daha güvenli:</strong> 3–7 dakika
                  </Typography>
                </li>
              </Box>
            </Alert>

            <Typography fontWeight={600} fontSize={14} sx={{ mb: 1 }}>
              Minimum aralık
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <TextField
                fullWidth
                type="number"
                label="Dakika"
                value={intervalMinMinutes}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (val >= 0 && val <= 1440) setIntervalMinMinutes(val);
                }}
                inputProps={{ min: 0, max: 1440, step: 1 }}
              />
              <TextField
                fullWidth
                type="number"
                label="Saniye"
                value={intervalMinSecondsPart}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (val >= 0 && val <= 59) setIntervalMinSecondsPart(val);
                }}
                inputProps={{ min: 0, max: 59, step: 1 }}
              />
            </Box>

            <Typography fontWeight={600} fontSize={14} sx={{ mb: 1 }}>
              Maximum aralık
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <TextField
                fullWidth
                type="number"
                label="Dakika"
                value={intervalMaxMinutes}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (val >= 0 && val <= 1440) setIntervalMaxMinutes(val);
                }}
                inputProps={{ min: 0, max: 1440, step: 1 }}
              />
              <TextField
                fullWidth
                type="number"
                label="Saniye"
                value={intervalMaxSecondsPart}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (val >= 0 && val <= 59) setIntervalMaxSecondsPart(val);
                }}
                inputProps={{ min: 0, max: 59, step: 1 }}
              />
            </Box>

            {intervalMinMinutes === 0 &&
              intervalMinSecondsPart === 0 &&
              intervalMaxMinutes === 0 &&
              intervalMaxSecondsPart === 0 && (
              <Alert severity="warning" sx={{ borderRadius: 2 }}>
                <Typography variant="body2">
                  <strong>Uyarı:</strong> Sınırsız mod aktif. Çoklu sekmede aynı anda birden fazla mail gidebilir.
                </Typography>
              </Alert>
            )}

            {(intervalMinMinutes > 0 ||
              intervalMinSecondsPart > 0 ||
              intervalMaxMinutes > 0 ||
              intervalMaxSecondsPart > 0) && (
              <Alert severity="success" sx={{ borderRadius: 2 }}>
                <Typography variant="body2">
                  <strong>Queue Aktif:</strong> Her mail arasında{' '}
                  {intervalMinMinutes > 0 ? `${intervalMinMinutes} dk ` : ''}
                  {intervalMinSecondsPart > 0 || intervalMinMinutes === 0
                    ? `${intervalMinSecondsPart} sn`
                    : ''}
                  {' – '}
                  {intervalMaxMinutes > 0 ? `${intervalMaxMinutes} dk ` : ''}
                  {intervalMaxSecondsPart > 0 || intervalMaxMinutes === 0
                    ? `${intervalMaxSecondsPart} sn`
                    : ''}{' '}
                  arası random beklenir. İlk mail hemen gider; sonrakiler sıraya girer.
                </Typography>
              </Alert>
            )}

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 2 }}>
              <Button
                variant="outlined"
                onClick={() => void handleSaveProfile()}
                disabled={saving}
                sx={{ textTransform: 'none' }}
              >
                {saving ? 'Kaydediliyor...' : 'Bu ayarı kaydet'}
              </Button>
            </Box>
          </Box>

          {/* Kaydetme tercihi */}
          <Box
            sx={{
              p: 2.5,
              borderRadius: 3,
              border: `1px solid ${colors.outlineVariant}`,
              bgcolor: colors.surfaceContainerLowest,
            }}
          >
            <Typography fontWeight={700} sx={{ mb: 1 }}>
              Kaydetme tercihi
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Açıkken Company Based ve Bulk analizleri ile mail gönderimleri Mail Log,
              Mail Takip ve Outreach geçmişinde saklanır. Kapalıyken bu kayıtlar veritabanına
              yazılmaz; sayfa yenilenince oturumdaki sonuçlar kaybolur (mail yine
              gönderilebilir).
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={persistOutreachHistory}
                  onChange={(e) => setPersistOutreachHistory(e.target.checked)}
                  color="secondary"
                />
              }
              label="Analiz ve mail geçmişini kaydet"
            />
            {persistOutreachHistory ? (
              <Alert severity="info" sx={{ mt: 2, borderRadius: 2 }}>
                <Typography variant="body2">
                  Kayıt açık. Geçmiş Mail Log / Mail Takip / Outreach sayfalarında görünür.
                </Typography>
              </Alert>
            ) : (
              <Alert severity="warning" sx={{ mt: 2, borderRadius: 2 }}>
                <Typography variant="body2">
                  Kayıt kapalı. Analiz ve gönderimler kalıcı yazılmaz; yenilemede geçmiş
                  oluşmaz.
                </Typography>
              </Alert>
            )}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 2 }}>
              <Button
                variant="outlined"
                onClick={() => void handleSaveProfile()}
                disabled={saving}
                sx={{ textTransform: 'none' }}
              >
                {saving ? 'Kaydediliyor...' : 'Bu ayarı kaydet'}
              </Button>
            </Box>
          </Box>

          {/* Mail Tracking (Okundu) */}
          <Box
            sx={{
              p: 2.5,
              borderRadius: 3,
              border: `1px solid ${colors.outlineVariant}`,
              bgcolor: colors.surfaceContainerLowest,
            }}
          >
            <Typography fontWeight={700} sx={{ mb: 1 }}>
              Mail Okundu Takibi
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Açıkken gönderilen maillere görünmez tracking pixel eklenir. Okundu bilgisi Mail Takip
              sayfasında görünür. Kapalıysa düz metin gönderilir, okundu bilgisi toplanmaz.
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={enableMailTracking}
                  onChange={(e) => setEnableMailTracking(e.target.checked)}
                  color="secondary"
                />
              }
              label="Mail okundu takibini etkinleştir"
            />
            {enableMailTracking ? (
              <Alert severity="info" sx={{ mt: 2, borderRadius: 2 }}>
                <Typography variant="body2">
                  Tracking aktif. Detaylar için <strong>Mail Takip</strong> sayfasını kullanın.
                </Typography>
              </Alert>
            ) : (
              <Alert severity="warning" sx={{ mt: 2, borderRadius: 2 }}>
                <Typography variant="body2">
                  Tracking kapalı. Mailler okundu bilgisi olmadan gönderilir.
                </Typography>
              </Alert>
            )}

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 2 }}>
              <Button
                variant="outlined"
                onClick={() => void handleSaveProfile()}
                disabled={saving}
                sx={{ textTransform: 'none' }}
              >
                {saving ? 'Kaydediliyor...' : 'Bu ayarı kaydet'}
              </Button>
            </Box>
          </Box>

          <Box
            sx={{
              p: 2.5,
              borderRadius: 3,
              border: `1px solid ${colors.outlineVariant}`,
              bgcolor: colors.surfaceContainerLowest,
            }}
          >
            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 1,
                alignItems: 'center',
                mb: 1.5,
              }}
            >
              <Typography fontWeight={700}>EmailVerify.io</Typography>
              <Chip
                size="small"
                color={emailVerifyQuota?.configured ? 'success' : 'default'}
                label={emailVerifyQuota?.configured ? 'API bağlı' : 'API yok'}
              />
              {emailVerifyQuota && (
                <Chip size="small" variant="outlined" label={emailVerifyQuota.periodKey} />
              )}
            </Box>

            {emailVerifyQuota ? (
              <>
                <Typography variant="h4" fontWeight={700} sx={{ mb: 0.5 }}>
                  {emailVerifyQuota.remaining}
                  <Typography component="span" variant="body1" color="text.secondary">
                    {' '}
                    / {emailVerifyQuota.limit} hak kaldı
                  </Typography>
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Bu ay kullanılan: {emailVerifyQuota.used}
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={emailVerifyRatio * 100}
                  color={
                    emailVerifyRatio >= 0.9
                      ? 'error'
                      : emailVerifyRatio >= 0.7
                        ? 'warning'
                        : 'secondary'
                  }
                  sx={{ height: 8, borderRadius: 1, mb: 1.5 }}
                />
                <Typography variant="caption" color="text.secondary" display="block">
                  Son kullanım: {formatDateTime(emailVerifyQuota.lastUsedAt)}
                  {emailVerifyQuota.lastEmail ? ` · ${emailVerifyQuota.lastEmail}` : ''}
                </Typography>
                <Alert severity="info" sx={{ mt: 2, borderRadius: 2 }}>
                  {emailVerifyQuota.note}{' '}
                  <a href={emailVerifyQuota.docsUrl} target="_blank" rel="noreferrer">
                    Dokümantasyon
                  </a>
                </Alert>
              </>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Kota bilgisi yok.
              </Typography>
            )}
          </Box>

          {outreachQuota && (
            <Box
              sx={{
                p: 2.5,
                borderRadius: 3,
                border: `1px solid ${colors.outlineVariant}`,
                bgcolor: colors.surfaceContainerLowest,
              }}
            >
              <Typography fontWeight={700} sx={{ mb: 1 }}>
                Günlük mail gönderim kotası
              </Typography>
              <Typography variant="body2">
                Bugün: {outreachQuota.usedToday} / {outreachQuota.dailyEmailLimit} · Kalan:{' '}
                {outreachQuota.remainingToday}
              </Typography>
            </Box>
          )}
        </>
      )}
    </Box>
  );
}
