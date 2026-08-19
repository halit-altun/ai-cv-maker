'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import BoltIcon from '@mui/icons-material/Bolt';
import CloseIcon from '@mui/icons-material/Close';
import GpsFixedIcon from '@mui/icons-material/GpsFixed';
import LinkIcon from '@mui/icons-material/Link';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import Link from 'next/link';
import type { CompanyCvOptimizerState } from '../../types';
import type { OutreachEmailLanguageMode } from '../../types';
import { GlassCard } from '../shell/GlassCard';
import { CvSectionLengthModeFields } from '../CvSectionLengthModeFields';
import { dashboardTokens } from '@/features/dashboard/styles/dashboardTokens';
import {
  COMPANY_PAGE_TYPE_OPTIONS,
  EMAIL_DOMAIN_INPUT_EXAMPLES,
  EMAIL_PREFIX_CATEGORIES,
  buildMinimalThreeRecipients,
  buildRecipientEmails,
  extractDomainFromUrl,
  extractLocalPartFromInput,
  isExclusiveEmailCategory,
  normalizeEmailDomainInput,
  resolveEnteredMainDomainEmail,
  type CompanyPageType,
  type EmailPrefixCategoryId,
} from '../../constants/outreachConstants';
import { appRoutes } from '@/features/dashboard/constants/routes';
import { checkOutreachDomainRequest } from '@/lib/outreach/api';
import type { DomainCheckResult } from '@/lib/outreach/api';

function verifyProviderLabel(provider?: string): string {
  const p = String(provider || '').toLowerCase();
  if (p === 'emailverify' || p === 'abstract') return 'EmailVerify';
  if (p === 'reacher') return 'Reacher';
  if (p === 'mx') return 'MX';
  if (p === 'trusted') return 'Ana adres (doğrulamasız)';
  return provider || '—';
}

function verifyResultLabel(result?: string): string {
  const r = String(result || '').toLowerCase();
  if (r === 'deliverable' || r === 'valid') return 'Geçerli / deliverable';
  if (r === 'role_based' || r === 'rolebased') return 'Role-based (kariyer; mailbox kontrolü)';
  if (r === 'mailbox_not_found' || r === 'mailbox-not-found') return 'Mailbox bulunamadı';
  if (r === 'catch_all' || r === 'catch-all') return 'Catch-all (belirsiz)';
  if (r === 'undeliverable' || r === 'invalid') return 'Geçersiz';
  if (r === 'risky') return 'Riskli';
  if (r === 'unknown') return 'Bilinmiyor';
  if (r === 'trusted_skip') return 'Koşulsuz (atlandı)';
  return result || '—';
}

function recipientStatusLabel(status?: string): string {
  const s = String(status || '').toLowerCase();
  if (s === 'sent') return 'Gönderildi';
  if (s === 'logged') return 'Loglandı';
  if (s === 'failed') return 'Başarısız';
  if (s === 'skipped') return 'Atlandı';
  if (s === 'invalid') return 'Geçersiz';
  return status || '—';
}

type JobAnalysisStepProps = Pick<
  CompanyCvOptimizerState,
  | 'cvFile'
  | 'setActiveStep'
  | 'companyLinks'
  | 'addCompanyLink'
  | 'removeCompanyLink'
  | 'updateCompanyLink'
  | 'cvAdaptationSource'
  | 'setCvAdaptationSource'
  | 'shouldGenerateCoverLetter'
  | 'setShouldGenerateCoverLetter'
  | 'shouldGenerateLinkedInMessage'
  | 'setShouldGenerateLinkedInMessage'
  | 'coverLetterSource'
  | 'setCoverLetterSource'
  | 'linkedinMessageSource'
  | 'setLinkedinMessageSource'
  | 'targetPosition'
  | 'setTargetPosition'
  | 'coverLetterRecipientName'
  | 'setCoverLetterRecipientName'
  | 'coverLetterCompanyName'
  | 'setCoverLetterCompanyName'
  | 'manualMustMentionTopicsText'
  | 'setManualMustMentionTopicsText'
  | 'manualMustNotMentionTopicsText'
  | 'setManualMustNotMentionTopicsText'
  | 'jobDescriptionText'
  | 'setJobDescriptionText'
  | 'shouldSendCompanyEmail'
  | 'setShouldSendCompanyEmail'
  | 'autoSendOutreachAfterAnalysis'
  | 'queuedIntervalOutreach'
  | 'outreachSendResult'
  | 'selectedEmailPrefixCategories'
  | 'setSelectedEmailPrefixCategories'
  | 'customEmailLocalPartsText'
  | 'setCustomEmailLocalPartsText'
  | 'emailDomainOverride'
  | 'setEmailDomainOverride'
  | 'domainHistoryCheckNonce'
  | 'includePrimaryEmailInSend'
  | 'setIncludePrimaryEmailInSend'
  | 'skipPrimaryEmailVerification'
  | 'setSkipPrimaryEmailVerification'
  | 'includeEnteredMainDomainInSend'
  | 'setIncludeEnteredMainDomainInSend'
  | 'selectedOutreachProjectId'
  | 'setSelectedOutreachProjectId'
  | 'outreachProjects'
  | 'outreachProjectsLoading'
  | 'outreachEmailLanguageMode'
  | 'setOutreachEmailLanguageMode'
  | 'outreachLinkedinUrl'
  | 'setOutreachLinkedinUrl'
  | 'outreachPortfolioUrl'
  | 'setOutreachPortfolioUrl'
  | 'outreachWebsiteUrl'
  | 'setOutreachWebsiteUrl'
  | 'outreachPhone'
  | 'setOutreachPhone'
  | 'aiSettings'
  | 'setAiSettings'
  | 'cvSectionLengthMode'
  | 'setCvSectionLengthMode'
  | 'loading'
  | 'handleCompanyLinksSubmit'
>;

export function JobAnalysisStep(props: JobAnalysisStepProps) {
  const { colors, fonts } = dashboardTokens;
  const [sourceTab, setSourceTab] = useState<'site' | 'job'>('site');

  const needsJobText =
    props.cvAdaptationSource === 'text' ||
    (props.shouldGenerateCoverLetter && props.coverLetterSource === 'text') ||
    (!props.shouldGenerateCoverLetter &&
      props.shouldGenerateLinkedInMessage &&
      props.linkedinMessageSource === 'text');

  const targetAreaLabels = [
    { key: 'about' as const, label: 'Hakkımda' },
    { key: 'workExperience' as const, label: 'Deneyim' },
    { key: 'skills' as const, label: 'Beceriler' },
  ];

  const activeAreas = targetAreaLabels.filter((a) => props.aiSettings[a.key]);

  const previewDomain = normalizeEmailDomainInput(
    props.emailDomainOverride.trim() ||
      extractDomainFromUrl(props.companyLinks[0]?.url || '')
  );

  /** Geçmiş sorgusu yalnızca kullanıcının domain alanına yazdığı değere bakar */
  const typedEmailDomain = normalizeEmailDomainInput(props.emailDomainOverride.trim());

  const [domainHistory, setDomainHistory] = useState<DomainCheckResult | null>(null);
  const [domainCheckLoading, setDomainCheckLoading] = useState(false);
  const domainCheckSeqRef = useRef(0);
  const lastCheckedDomainRef = useRef('');
  const lastHandledNonceRef = useRef(0);

  useEffect(() => {
    if (!props.shouldSendCompanyEmail || !typedEmailDomain) {
      setDomainHistory(null);
      setDomainCheckLoading(false);
      lastCheckedDomainRef.current = '';
      return;
    }

    let cancelled = false;
    const seq = ++domainCheckSeqRef.current;
    const programmatic =
      props.domainHistoryCheckNonce > lastHandledNonceRef.current;
    const firstFill = !lastCheckedDomainRef.current;
    // Yeniden analiz / ilk dolum: hemen; elle yazım: 2 sn debounce
    const delayMs = programmatic || firstFill ? 50 : 2000;

    setDomainCheckLoading(programmatic || firstFill);
    const timer = setTimeout(() => {
      void (async () => {
        if (cancelled || seq !== domainCheckSeqRef.current) return;
        setDomainCheckLoading(true);
        try {
          const result = await checkOutreachDomainRequest(typedEmailDomain);
          if (cancelled || seq !== domainCheckSeqRef.current) return;
          lastCheckedDomainRef.current = typedEmailDomain;
          lastHandledNonceRef.current = props.domainHistoryCheckNonce;
          setDomainHistory(result);
        } catch {
          if (!cancelled && seq === domainCheckSeqRef.current) {
            setDomainHistory(null);
          }
        } finally {
          if (!cancelled && seq === domainCheckSeqRef.current) {
            setDomainCheckLoading(false);
          }
        }
      })();
    }, delayMs);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    props.shouldSendCompanyEmail,
    typedEmailDomain,
    props.domainHistoryCheckNonce,
  ]);

  const previewRecipients = useMemo(() => {
    if (!props.shouldSendCompanyEmail) return [];
    return buildRecipientEmails({
      domain: previewDomain,
      selectedCategoryIds: props.selectedEmailPrefixCategories,
      customLocalParts: props.customEmailLocalPartsText
        .split(/[\n,;]+/)
        .map((s) => s.trim())
        .filter(Boolean),
      rawDomainInput:
        props.emailDomainOverride.trim() ||
        props.companyLinks[0]?.url ||
        previewDomain,
      includePrimaryEmail: props.includePrimaryEmailInSend,
      includeEnteredMainDomain: props.includeEnteredMainDomainInSend,
    });
  }, [
    props.shouldSendCompanyEmail,
    previewDomain,
    props.selectedEmailPrefixCategories,
    props.customEmailLocalPartsText,
    props.emailDomainOverride,
    props.includePrimaryEmailInSend,
    props.includeEnteredMainDomainInSend,
    props.companyLinks,
  ]);

  const allPreviewRecipients = previewRecipients;

  const toggleEmailCategory = (id: EmailPrefixCategoryId) => {
    props.setSelectedEmailPrefixCategories((prev) => {
      // 5, 6 ve 7 diğer kategorilerle karışmaz — tek seçim
      if (isExclusiveEmailCategory(id)) {
        return prev.includes(id) ? [] : [id];
      }
      const withoutExclusive = prev.filter((x) => !isExclusiveEmailCategory(x));
      return withoutExclusive.includes(id)
        ? withoutExclusive.filter((x) => x !== id)
        : [...withoutExclusive, id];
    });
  };

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', lg: '7fr 5fr' },
        gap: 3,
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <GlassCard id="optimizer-target-source" sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <GpsFixedIcon sx={{ color: colors.secondary }} />
            <Typography sx={{ fontFamily: fonts.display, fontSize: '1.25rem', fontWeight: 600 }}>
              Hedef Kaynağı Seçimi
            </Typography>
          </Box>

          {props.cvFile && (
            <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
              <Typography
                variant="caption"
                sx={{ bgcolor: colors.surfaceContainerLow, px: 1.5, py: 0.5, borderRadius: 1 }}
              >
                {props.cvFile.name}
              </Typography>
              <Button size="small" onClick={() => props.setActiveStep(0)} sx={{ textTransform: 'none' }}>
                CV değiştir
              </Button>
            </Box>
          )}

          <Box sx={{ display: 'flex', p: 0.5, bgcolor: colors.surfaceContainerLow, borderRadius: 2, mb: 3 }}>
            <Button
              fullWidth
              onClick={() => setSourceTab('site')}
              sx={{
                py: 1,
                textTransform: 'none',
                fontWeight: 600,
                borderRadius: 1.5,
                bgcolor: sourceTab === 'site' ? colors.surfaceContainerLowest : 'transparent',
                color: sourceTab === 'site' ? colors.secondary : colors.onSurfaceVariant,
                boxShadow: sourceTab === 'site' ? 1 : 0,
              }}
            >
              Şirket Web Sitesi
            </Button>
            <Button
              fullWidth
              onClick={() => setSourceTab('job')}
              sx={{
                py: 1,
                textTransform: 'none',
                fontWeight: 600,
                borderRadius: 1.5,
                bgcolor: sourceTab === 'job' ? colors.surfaceContainerLowest : 'transparent',
                color: sourceTab === 'job' ? colors.secondary : colors.onSurfaceVariant,
                boxShadow: sourceTab === 'job' ? 1 : 0,
              }}
            >
              İlan Metni
            </Button>
          </Box>

          {sourceTab === 'site' && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {props.companyLinks.map((link, index) => (
                <Box
                  key={index}
                  sx={{
                    p: 2,
                    border: `1px solid ${colors.outlineVariant}`,
                    borderRadius: 2,
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Typography fontWeight={600}>Link {index + 1}</Typography>
                    {props.companyLinks.length > 1 && (
                      <Button
                        size="small"
                        color="error"
                        onClick={() => props.removeCompanyLink(index)}
                        sx={{ textTransform: 'none' }}
                      >
                        Kaldır
                      </Button>
                    )}
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <TextField
                      fullWidth
                      label="URL"
                      placeholder="https://example.com/careers"
                      value={link.url}
                      onChange={(e) => props.updateCompanyLink(index, 'url', e.target.value)}
                      sx={{ '& .MuiOutlinedInput-root': { bgcolor: colors.surfaceContainerLow } }}
                    />
                    <FormControl fullWidth>
                      <InputLabel id={`page-type-${index}`}>Sayfa ne hakkında?</InputLabel>
                      <Select
                        labelId={`page-type-${index}`}
                        label="Sayfa ne hakkında?"
                        value={link.pageType || 'homepage'}
                        onChange={(e) =>
                          props.updateCompanyLink(
                            index,
                            'pageType',
                            e.target.value as CompanyPageType
                          )
                        }
                        sx={{ bgcolor: colors.surfaceContainerLow }}
                      >
                        {COMPANY_PAGE_TYPE_OPTIONS.map((opt) => (
                          <MenuItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    {link.pageType === 'other' && (
                      <TextField
                        fullWidth
                        label="Diğer — sayfa açıklaması"
                        placeholder="Örn: yatırımcı ilişkileri, basın kitabı"
                        value={link.pageTypeOther || ''}
                        onChange={(e) =>
                          props.updateCompanyLink(index, 'pageTypeOther', e.target.value)
                        }
                        sx={{ '& .MuiOutlinedInput-root': { bgcolor: colors.surfaceContainerLow } }}
                      />
                    )}
                  </Box>
                </Box>
              ))}

              {props.companyLinks.length < 3 && (
                <Button
                  variant="outlined"
                  startIcon={<LinkIcon />}
                  onClick={props.addCompanyLink}
                  sx={{ textTransform: 'none', alignSelf: 'flex-start' }}
                >
                  Link Ekle ({props.companyLinks.length}/3)
                </Button>
              )}
            </Box>
          )}

          {sourceTab === 'job' && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                <TextField
                  fullWidth
                  label="İş Başlığı / Hedef Pozisyon"
                  placeholder="Senior Product Designer"
                  value={props.targetPosition}
                  onChange={(e) => props.setTargetPosition(e.target.value)}
                  sx={{ '& .MuiOutlinedInput-root': { bgcolor: colors.surfaceContainerLow } }}
                />
                <TextField
                  fullWidth
                  label="Firma Adı (opsiyonel)"
                  placeholder="Innova Tech"
                  value={props.coverLetterCompanyName}
                  onChange={(e) => props.setCoverLetterCompanyName(e.target.value)}
                  sx={{ '& .MuiOutlinedInput-root': { bgcolor: colors.surfaceContainerLow } }}
                />
              </Box>
              <TextField
                fullWidth
                label="İşe Alım Müdürü (Opsiyonel)"
                placeholder="Ad Soyad"
                value={props.coverLetterRecipientName}
                onChange={(e) => props.setCoverLetterRecipientName(e.target.value)}
                sx={{ '& .MuiOutlinedInput-root': { bgcolor: colors.surfaceContainerLow } }}
              />
              <TextField
                fullWidth
                label="Job Description (JD)"
                placeholder="İlan detaylarını buraya yapıştırın..."
                value={props.jobDescriptionText}
                onChange={(e) => props.setJobDescriptionText(e.target.value)}
                multiline
                rows={6}
                maxRows={6}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: colors.surfaceContainerLow,
                    alignItems: 'flex-start',
                  },
                  '& textarea': {
                    overflowY: 'auto !important',
                    resize: 'none',
                  },
                }}
              />
            </Box>
          )}
        </GlassCard>

        <GlassCard sx={{ p: 3 }}>
          <Typography sx={{ fontFamily: fonts.display, fontWeight: 600, mb: 1 }}>
            Hedef Kaynağı — Detaylı Seçim
          </Typography>
          <Typography sx={{ fontSize: '0.875rem', color: colors.onSurfaceVariant, mb: 2 }}>
            CV düzenleme, cover letter ve isteğe bağlı LinkedIn mesajı için kaynak seçin.
          </Typography>

          <Typography sx={{ fontWeight: 600, fontSize: '0.875rem', mb: 1 }}>CV Düzenleme</Typography>
          <RadioGroup
            row
            value={props.cvAdaptationSource}
            onChange={(e) => props.setCvAdaptationSource(e.target.value as 'company' | 'text')}
            sx={{ mb: 2 }}
          >
            <FormControlLabel value="company" control={<Radio />} label="Şirket Web Siteleri" />
            <FormControlLabel value="text" control={<Radio />} label="İlan Metni" />
          </RadioGroup>

          <FormControlLabel
            control={
              <Checkbox
                checked={props.shouldGenerateCoverLetter}
                onChange={(e) => props.setShouldGenerateCoverLetter(e.target.checked)}
              />
            }
            label="Kapak Mektubu Üret"
          />
          <Typography variant="caption" color="text.secondary" display="block" sx={{ pl: 4, mb: 1 }}>
            Bu işe özel kişiselleştirilmiş kapak mektubu.
          </Typography>

          <FormControlLabel
            control={
              <Checkbox
                checked={props.shouldGenerateLinkedInMessage}
                onChange={(e) => props.setShouldGenerateLinkedInMessage(e.target.checked)}
              />
            }
            label="LinkedIn Mesajı Üret"
          />
          <Typography variant="caption" color="text.secondary" display="block" sx={{ pl: 4, mb: 2 }}>
            İşe alım müdürü için ağ oluşturma metni.
          </Typography>

          {props.shouldGenerateCoverLetter && (
            <Box sx={{ mb: 2 }}>
              <Typography sx={{ fontWeight: 600, fontSize: '0.875rem', mb: 1 }}>
                Cover Letter Kaynağı
              </Typography>
              <RadioGroup
                row
                value={props.coverLetterSource}
                onChange={(e) => props.setCoverLetterSource(e.target.value as 'company' | 'text')}
              >
                <FormControlLabel value="company" control={<Radio />} label="Şirket Web Siteleri" />
                <FormControlLabel value="text" control={<Radio />} label="İlan Metni" />
              </RadioGroup>
            </Box>
          )}

          {!props.shouldGenerateCoverLetter && props.shouldGenerateLinkedInMessage && (
            <Box sx={{ mb: 2 }}>
              <Typography sx={{ fontWeight: 600, fontSize: '0.875rem', mb: 1 }}>
                LinkedIn mesajı kaynağı
              </Typography>
              <RadioGroup
                row
                value={props.linkedinMessageSource}
                onChange={(e) =>
                  props.setLinkedinMessageSource(e.target.value as 'company' | 'text')
                }
              >
                <FormControlLabel value="company" control={<Radio />} label="Şirket Web Siteleri" />
                <FormControlLabel value="text" control={<Radio />} label="İlan Metni" />
              </RadioGroup>
            </Box>
          )}

          {needsJobText && sourceTab === 'site' && (
            <TextField
              fullWidth
              label="Job Description / İlan Metni"
              placeholder="About the job ... (metni buraya yapıştırın)"
              value={props.jobDescriptionText}
              onChange={(e) => props.setJobDescriptionText(e.target.value)}
              multiline
              rows={6}
              maxRows={6}
              sx={{
                mt: 1,
                '& .MuiOutlinedInput-root': {
                  bgcolor: colors.surfaceContainerLow,
                  alignItems: 'flex-start',
                },
                '& textarea': {
                  overflowY: 'auto !important',
                  resize: 'none',
                },
              }}
            />
          )}
        </GlassCard>

        <GlassCard sx={{ p: 3 }}>
          <Typography sx={{ fontFamily: fonts.display, fontWeight: 600, mb: 1 }}>
            Outreach projesi
          </Typography>
          <Typography sx={{ fontSize: '0.875rem', color: colors.onSurfaceVariant, mb: 2 }}>
            Seçili proje altında analiz ve mail kayıtları gruplanır (ör. DUBAI). Projesiz
            bırakırsanız mevcut akış devam eder; proje sayfasında görünmez.
          </Typography>
          {props.queuedIntervalOutreach && (
            <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
              Aralıklı kuyruk açıkken bir outreach projesi seçmelisiniz.
            </Alert>
          )}
          <FormControl fullWidth size="small" disabled={props.outreachProjectsLoading}>
            <InputLabel id="optimizer-project-label">Proje</InputLabel>
            <Select
              labelId="optimizer-project-label"
              label="Proje"
              value={props.selectedOutreachProjectId || ''}
              onChange={(e) => {
                const v = String(e.target.value || '');
                props.setSelectedOutreachProjectId(v ? v : null);
              }}
            >
              <MenuItem value="">
                <em>Projesiz</em>
              </MenuItem>
              {props.outreachProjects.map((p) => (
                <MenuItem key={p.id} value={p.id}>
                  {p.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {props.outreachProjectsLoading && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Projeler yükleniyor…
            </Typography>
          )}
        </GlassCard>

        <GlassCard sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
            <MailOutlineIcon sx={{ color: colors.secondary }} />
            <Typography sx={{ fontFamily: fonts.display, fontWeight: 600 }}>
              Hedef firmaya mail gönder
            </Typography>
          </Box>
          <Typography sx={{ fontSize: '0.875rem', color: colors.onSurfaceVariant, mb: 2 }}>
            Opsiyonel. Analiz sırasında cold mail hazırlanır. Profilim&apos;de &quot;Analiz sonrası
            mailleri otomatik gönder&quot; açıksa gönderim analiz bitince yapılır; kapalıysa Önizleme
            adımında onayınızdan sonra gönderilir. Aralıklı kuyruk açıksa mailler kuyruğa alınır ve
            analiz bitince bu adıma dönülür. Site domaininden İK prefix&apos;leriyle alıcı üretilir;
            SMTP (.env) üzerinden gönderilir.
          </Typography>

          {props.outreachSendResult && (
            <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>
              {props.outreachSendResult}
            </Alert>
          )}

              {props.queuedIntervalOutreach && (
            <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
              Aralıklı kuyruk açık: AI tamamlanınca mailler kuyruğa alınır ve bu analiz sekmesine
              dönülür. Sıra için Mail Takip → Aralıklı gönderim. Değiştirmek için Profilim.
            </Alert>
          )}

          {props.autoSendOutreachAfterAnalysis && (
            <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
              Profil ayarı aktif: analiz bitince mailler otomatik gönderilir / kuyruğa alınır.
              &quot;Mail gönderimini etkinleştir&quot; bu ayar açıkken açık tutulur.
            </Alert>
          )}

          <FormControlLabel
            control={
              <Checkbox
                checked={props.shouldSendCompanyEmail}
                onChange={(e) => props.setShouldSendCompanyEmail(e.target.checked)}
              />
            }
            label="Mail gönderimini etkinleştir"
          />

          {props.shouldSendCompanyEmail && (
            <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Typography sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                Mail dili
              </Typography>
              <RadioGroup
                row
                value={props.outreachEmailLanguageMode}
                onChange={(e) =>
                  props.setOutreachEmailLanguageMode(
                    e.target.value as OutreachEmailLanguageMode
                  )
                }
              >
                <FormControlLabel
                  value="auto"
                  control={<Radio />}
                  label="Otomatik (sayfa / ilan dili)"
                />
                <FormControlLabel value="turkish" control={<Radio />} label="Türkçe" />
                <FormControlLabel value="english" control={<Radio />} label="English" />
              </RadioGroup>
              <Typography variant="caption" color="text.secondary">
                Otomatik seçilirse fetch edilen şirket sayfasının (veya ilan metninin) dilinde
                cold mail üretilir. İsterseniz zorla Türkçe veya English seçin.
              </Typography>

              <Typography sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                Cold mail imza alanları (opsiyonel)
              </Typography>
              <Typography variant="caption" color="text.secondary">
                LinkedIn ve portfolyo Profilim’den otomatik gelir; isterseniz burada farklı
                değer girebilirsiniz. Web sitesi ve telefon opsiyoneldir. Doluysa AI cold mail
                imzasında kullanır.
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                <TextField
                  fullWidth
                  label="LinkedIn (opsiyonel)"
                  placeholder="https://linkedin.com/in/..."
                  value={props.outreachLinkedinUrl}
                  onChange={(e) => props.setOutreachLinkedinUrl(e.target.value)}
                  sx={{ '& .MuiOutlinedInput-root': { bgcolor: colors.surfaceContainerLow } }}
                />
                <TextField
                  fullWidth
                  label="Portfolyo (opsiyonel)"
                  placeholder="https://..."
                  value={props.outreachPortfolioUrl}
                  onChange={(e) => props.setOutreachPortfolioUrl(e.target.value)}
                  sx={{ '& .MuiOutlinedInput-root': { bgcolor: colors.surfaceContainerLow } }}
                />
                <TextField
                  fullWidth
                  label="Web sitesi (opsiyonel)"
                  placeholder="https://..."
                  value={props.outreachWebsiteUrl}
                  onChange={(e) => props.setOutreachWebsiteUrl(e.target.value)}
                  sx={{ '& .MuiOutlinedInput-root': { bgcolor: colors.surfaceContainerLow } }}
                />
                <TextField
                  fullWidth
                  label="Telefon (opsiyonel)"
                  placeholder="+90 ..."
                  value={props.outreachPhone}
                  onChange={(e) => props.setOutreachPhone(e.target.value)}
                  sx={{ '& .MuiOutlinedInput-root': { bgcolor: colors.surfaceContainerLow } }}
                />
              </Box>

              <TextField
                id="optimizer-email-domain"
                fullWidth
                label="E-posta domaini"
                placeholder="info@sirketadi.com"
                value={props.emailDomainOverride}
                onChange={(e) => props.setEmailDomainOverride(e.target.value)}
                helperText={
                  previewDomain
                    ? `Çözümlenen domain: @${previewDomain} — prefix'ler buna eklenir${
                        props.includeEnteredMainDomainInSend
                          ? '; girilen ana domain doğrulamasız (direkt) gider'
                          : props.includePrimaryEmailInSend &&
                              props.emailDomainOverride.includes('@')
                            ? props.skipPrimaryEmailVerification
                              ? '; ana adres doğrulamasız (trusted) gider'
                              : '; ana adres listede, doğrulamadan geçer'
                            : ''
                      }`
                    : `Örnek: ${EMAIL_DOMAIN_INPUT_EXAMPLES.join(' · ')}`
                }
                sx={{ '& .MuiOutlinedInput-root': { bgcolor: colors.surfaceContainerLow } }}
              />

              <FormControlLabel
                control={
                  <Checkbox
                    checked={props.includePrimaryEmailInSend}
                    onChange={(e) => {
                      const next = e.target.checked;
                      props.setIncludePrimaryEmailInSend(next);
                      if (!next) props.setSkipPrimaryEmailVerification(false);
                    }}
                    disabled={!props.emailDomainOverride.trim().includes('@')}
                  />
                }
                label="Ana adresi de gönder"
                sx={{ mt: 0.5, alignItems: 'flex-start' }}
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={props.skipPrimaryEmailVerification}
                    onChange={(e) => props.setSkipPrimaryEmailVerification(e.target.checked)}
                    disabled={
                      !props.includePrimaryEmailInSend ||
                      !props.emailDomainOverride.trim().includes('@')
                    }
                  />
                }
                label="Ana adresi doğrulamadan geçir (trusted)"
                sx={{ mt: 0, alignItems: 'flex-start' }}
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={props.includeEnteredMainDomainInSend}
                    onChange={(e) =>
                      props.setIncludeEnteredMainDomainInSend(e.target.checked)
                    }
                    disabled={!previewDomain}
                  />
                }
                label="Girilen Ana Domain'i de Gönder"
                sx={{ mt: 0, alignItems: 'flex-start' }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                İlk seçenek: girilen ana adresi alıcı listesine ekler. İkinci seçenek (ayrı): o
                adresi MX/Reacher/EmailVerify’a sokmadan gönderir. Üçüncü: girilen ana domain
                adresini (email varsa o, yoksa info@domain) kategoriye bakmaksızın ekler ve
                doğrulamadan direkt gönderir.
              </Typography>

              {domainCheckLoading && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CircularProgress size={16} />
                  <Typography variant="caption">Domain geçmişi kontrol ediliyor…</Typography>
                </Box>
              )}

              {domainHistory?.previouslyContacted && (
                <Alert
                  severity={domainHistory.blockedResend ? 'error' : 'warning'}
                  sx={{ borderRadius: 2 }}
                  action={
                    <Button
                      component={Link}
                      href={`${appRoutes.outreachLogs}?domain=${encodeURIComponent(domainHistory.domain)}`}
                      color="inherit"
                      size="small"
                      sx={{ textTransform: 'none', fontWeight: 700 }}
                    >
                      Loglara git
                    </Button>
                  }
                >
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    Bu firmaya (@{domainHistory.domain}) daha önce{' '}
                    {domainHistory.mailSendCount ?? domainHistory.count} kez{' '}
                    <strong>gerçekten mail gönderilmiş</strong>
                    {domainHistory.lastSentAt
                      ? ` (son: ${new Date(domainHistory.lastSentAt).toLocaleString('tr-TR')})`
                      : ''}
                    .
                    {domainHistory.blockedResend
                      ? ' Tekrar gönderim engelli — Önizleme’de “force” kutusunu açmadan gönderilemez.'
                      : ' Detaylar için log sayfasına gidin.'}
                  </Typography>

                  {(domainHistory.allSentEmails?.length ?? 0) > 0 && (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 1 }}>
                      {domainHistory.allSentEmails!.map((email) => (
                        <Chip
                          key={`hist-sent-${email}`}
                          size="small"
                          color="success"
                          label={`Mail giden: ${email}`}
                          sx={{ fontFamily: 'monospace', fontSize: '0.7rem' }}
                        />
                      ))}
                    </Box>
                  )}

                  {domainHistory.lastOutreach &&
                    (domainHistory.lastOutreach.verification?.enabled ||
                      (domainHistory.lastOutreach.recipients?.length ?? 0) > 0) && (
                    <Box sx={{ mt: 0.5 }}>
                      {domainHistory.lastOutreach.verification?.enabled && (
                        <>
                          <Typography fontWeight={600} fontSize="0.8rem" sx={{ mb: 0.75 }}>
                            Son başarılı gönderim doğrulama özeti
                            {domainHistory.lastOutreach.sentAt
                              ? ` · ${new Date(domainHistory.lastOutreach.sentAt).toLocaleString('tr-TR')}`
                              : ''}
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 1 }}>
                            <Chip
                              size="small"
                              color={
                                domainHistory.lastOutreach.verification.mxOk ? 'success' : 'error'
                              }
                              label={
                                domainHistory.lastOutreach.verification.mxOk
                                  ? 'MX: var'
                                  : 'MX: yok'
                              }
                            />
                            {domainHistory.lastOutreach.verification.provider && (
                              <Chip
                                size="small"
                                variant="outlined"
                                label={`API: ${verifyProviderLabel(
                                  domainHistory.lastOutreach.verification.provider
                                )}`}
                              />
                            )}
                          </Box>

                          {(domainHistory.lastOutreach.verification.checks?.length ?? 0) > 0 && (
                            <Table
                              size="small"
                              sx={{ mb: 1, bgcolor: 'background.paper', borderRadius: 1 }}
                            >
                              <TableHead>
                                <TableRow>
                                  <TableCell>Aday e-posta</TableCell>
                                  <TableCell>Doğrulama API</TableCell>
                                  <TableCell>API sonucu</TableCell>
                                  <TableCell>Geçerli mi?</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {domainHistory.lastOutreach.verification.checks!.map((c) => (
                                  <TableRow key={`hist-check-${c.email}`}>
                                    <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>
                                      {c.email}
                                    </TableCell>
                                    <TableCell sx={{ fontSize: 12 }}>
                                      {verifyProviderLabel(c.provider)}
                                    </TableCell>
                                    <TableCell sx={{ fontSize: 12 }}>
                                      {verifyResultLabel(c.result)}
                                    </TableCell>
                                    <TableCell>
                                      <Chip
                                        size="small"
                                        color={c.isValid ? 'success' : 'default'}
                                        label={c.isValid ? 'Evet' : 'Hayır'}
                                      />
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          )}
                        </>
                      )}

                      {(domainHistory.lastOutreach.recipients?.length ?? 0) > 0 && (
                        <>
                          <Typography fontWeight={600} fontSize="0.8rem" sx={{ mb: 0.75 }}>
                            Mail gönderim sonuçları
                            {!domainHistory.lastOutreach.verification?.enabled &&
                            domainHistory.lastOutreach.sentAt
                              ? ` · ${new Date(domainHistory.lastOutreach.sentAt).toLocaleString('tr-TR')}`
                              : ''}
                          </Typography>
                          <Table size="small" sx={{ bgcolor: 'background.paper', borderRadius: 1 }}>
                            <TableHead>
                              <TableRow>
                                <TableCell>Alıcı</TableCell>
                                <TableCell>Mail durumu</TableCell>
                                <TableCell>Doğrulama API</TableCell>
                                <TableCell>API sonucu</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {domainHistory.lastOutreach.recipients.map((r) => (
                                <TableRow key={`hist-rec-${r.email}`}>
                                  <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>
                                    {r.email}
                                  </TableCell>
                                  <TableCell sx={{ fontSize: 12 }}>
                                    {recipientStatusLabel(r.status)}
                                  </TableCell>
                                  <TableCell sx={{ fontSize: 12 }}>
                                    {verifyProviderLabel(r.verifyProvider)}
                                  </TableCell>
                                  <TableCell sx={{ fontSize: 12 }}>
                                    {verifyResultLabel(r.verifyResult)}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </>
                      )}
                    </Box>
                  )}
                </Alert>
              )}

              {!domainHistory?.previouslyContacted && domainHistory?.hasAnalysisOnly && (
                <Alert severity="info" sx={{ borderRadius: 2 }}>
                  Bu domain (@{domainHistory.domain}) için daha önce{' '}
                  {domainHistory.analysisOnlyCount ?? 0} kez <strong>yalnızca analiz</strong>{' '}
                  kaydı var
                  {domainHistory.lastAnalysisAt
                    ? ` (son: ${new Date(domainHistory.lastAnalysisAt).toLocaleString('tr-TR')})`
                    : ''}
                  — henüz mail gönderilmemiş. Onay diyaloğunu tamamlamadan mail sayılmaz.
                </Alert>
              )}

              {EMAIL_PREFIX_CATEGORIES.map((cat) => {
                const selected = props.selectedEmailPrefixCategories.includes(cat.id);
                const domainSuffix = previewDomain || 'domain.com';
                return (
                  <Box
                    key={cat.id}
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      border: `1px solid ${
                        selected ? colors.secondary : colors.outlineVariant
                      }`,
                      bgcolor: selected ? colors.surfaceContainerLow : 'transparent',
                    }}
                  >
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={selected}
                          onChange={() => toggleEmailCategory(cat.id)}
                        />
                      }
                      label={
                        <Box>
                          <Typography fontWeight={600}>{cat.label}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {isExclusiveEmailCategory(cat.id)
                              ? `${cat.description}`
                              : `${cat.description} · ${cat.prefixes.length} adres`}
                          </Typography>
                        </Box>
                      }
                      sx={{ alignItems: 'flex-start', mb: 1 }}
                    />
                    <Box
                      sx={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 0.75,
                        pl: { xs: 0, sm: 4 },
                      }}
                    >
                      {(cat.id === 'minimal-three'
                        ? buildMinimalThreeRecipients(
                            props.emailDomainOverride.trim() ||
                              previewDomain ||
                              'domain.com'
                          )
                        : cat.id === 'main-domain-only'
                          ? (() => {
                              const rawInput =
                                props.emailDomainOverride.trim() ||
                                previewDomain ||
                                'domain.com';
                              const domain = normalizeEmailDomainInput(rawInput);
                              const local =
                                extractLocalPartFromInput(rawInput) || 'info';
                              return domain ? [`${local}@${domain}`] : [];
                            })()
                          : cat.id === 'turkey-hiring'
                            ? (() => {
                                const rawInput =
                                  props.emailDomainOverride.trim() ||
                                  previewDomain ||
                                  'domain.com';
                                const domain =
                                  normalizeEmailDomainInput(rawInput) || 'domain.com';
                                const list = [`ik@${domain}`, `kariyer@${domain}`];
                                if (!props.includeEnteredMainDomainInSend) return list;
                                const main = resolveEnteredMainDomainEmail(
                                  rawInput,
                                  domain
                                );
                                return main
                                  ? [main, ...list.filter((e) => e !== main)]
                                  : list;
                              })()
                          : cat.prefixes.map((prefix) => `${prefix}@${domainSuffix}`)
                      ).map((emailOrPrefix) => (
                        <Chip
                          key={emailOrPrefix}
                          size="small"
                          label={
                            isExclusiveEmailCategory(cat.id)
                              ? emailOrPrefix
                              : emailOrPrefix.includes('@')
                                ? emailOrPrefix
                                : `${emailOrPrefix}@${domainSuffix}`
                          }
                          variant={selected ? 'filled' : 'outlined'}
                          sx={{
                            fontFamily: 'monospace',
                            fontSize: '0.7rem',
                            height: 26,
                            bgcolor: selected ? colors.secondaryFixed : 'transparent',
                            color: selected ? colors.secondary : colors.onSurfaceVariant,
                            borderColor: colors.outlineVariant,
                          }}
                        />
                      ))}
                    </Box>
                  </Box>
                );
              })}

              <TextField
                fullWidth
                label="Özel prefix / e-posta (isteğe bağlı)"
                placeholder={'hr\ncareers\nornek@firma.com'}
                value={props.customEmailLocalPartsText}
                onChange={(e) => props.setCustomEmailLocalPartsText(e.target.value)}
                multiline
                minRows={2}
                helperText="Satır veya virgülle ayırın. Tam e-posta veya sadece local-part yazabilirsiniz."
                sx={{ '& .MuiOutlinedInput-root': { bgcolor: colors.surfaceContainerLow } }}
              />

              {allPreviewRecipients.length > 0 && (
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    border: `1px dashed ${colors.outlineVariant}`,
                    bgcolor: colors.surfaceContainerLowest,
                  }}
                >
                  <Typography fontWeight={600} sx={{ fontSize: '0.875rem', mb: 1 }}>
                    Gönderilecek adresler ({allPreviewRecipients.length})
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                    {allPreviewRecipients.map((email) => (
                      <Chip
                        key={email}
                        size="small"
                        label={email}
                        sx={{
                          fontFamily: 'monospace',
                          fontSize: '0.7rem',
                          height: 26,
                          bgcolor: colors.secondaryFixed,
                          color: colors.secondary,
                        }}
                      />
                    ))}
                  </Box>
                </Box>
              )}
            </Box>
          )}
        </GlassCard>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Box
          sx={{
            p: 3,
            borderRadius: 3,
            bgcolor: colors.surfaceContainerLowest,
            border: '1px solid transparent',
            backgroundImage: `linear-gradient(${colors.surfaceContainerLowest}, ${colors.surfaceContainerLowest}), linear-gradient(to right, ${colors.secondary}, #9466ff)`,
            backgroundOrigin: 'border-box',
            backgroundClip: 'padding-box, border-box',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <AutoAwesomeIcon sx={{ color: colors.secondary }} />
            <Typography sx={{ fontFamily: fonts.display, fontSize: '1.25rem', fontWeight: 600 }}>
              AI Uyarlama Ayarları
            </Typography>
          </Box>

          <Typography sx={{ fontSize: '0.8rem', color: colors.onSurfaceVariant, mb: 2 }}>
            İlan / şirket KW&apos;leri yalnızca seçili Hakkımda ve Deneyim alanlarına uyarlanır
            (beceri/dil/eğitim hariç zorlama yok). Sahip olmadığınız KW&apos;ler öğrenme tonuyla
            geçirilir.
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={props.aiSettings.about}
                  onChange={(e) =>
                    props.setAiSettings((prev) => ({ ...prev, about: e.target.checked }))
                  }
                />
              }
              label={
                <Box>
                  <Typography fontWeight={600}>Hakkımda bölümü</Typography>
                  <Typography variant="caption" color="text.secondary">
                    AI bu bölümü hedef şirkete göre uyarlar; KW fallback alanı.
                  </Typography>
                </Box>
              }
              sx={{
                m: 0,
                p: 2,
                borderRadius: 2,
                bgcolor: colors.surfaceContainerLow,
                width: '100%',
                alignItems: 'flex-start',
              }}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={props.aiSettings.workExperience}
                  onChange={(e) =>
                    props.setAiSettings((prev) => ({
                      ...prev,
                      workExperience: e.target.checked,
                    }))
                  }
                />
              }
              label={
                <Box>
                  <Typography fontWeight={600}>İş Deneyimi bölümü</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Bullet&apos;lara KW öncelikli entegre edilir; sırıtırsa hakkımdaya düşer.
                  </Typography>
                </Box>
              }
              sx={{
                m: 0,
                p: 2,
                borderRadius: 2,
                bgcolor: colors.surfaceContainerLow,
                width: '100%',
                alignItems: 'flex-start',
              }}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={props.aiSettings.skills}
                  onChange={(e) =>
                    props.setAiSettings((prev) => ({ ...prev, skills: e.target.checked }))
                  }
                />
              }
              label={
                <Box>
                  <Typography fontWeight={600}>Beceriler bölümü</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Genel uyarlama (zorunlu KW enjekte edilmez).
                  </Typography>
                </Box>
              }
              sx={{
                m: 0,
                p: 2,
                borderRadius: 2,
                bgcolor: colors.surfaceContainerLow,
                width: '100%',
                alignItems: 'flex-start',
              }}
            />

            <CvSectionLengthModeFields
              value={props.cvSectionLengthMode}
              onChange={props.setCvSectionLengthMode}
              aboutEnabled={props.aiSettings.about}
              workExperienceEnabled={props.aiSettings.workExperience}
            />

            <TextField
              fullWidth
              label="Vurgulanacak Noktalar"
              placeholder="Örn: 5+ yıl liderlik deneyimi, Figma uzmanlığı"
              value={props.manualMustMentionTopicsText}
              onChange={(e) => props.setManualMustMentionTopicsText(e.target.value)}
              helperText="Doğrudan cümle/paragraf yazabilirsiniz. AI bu metni dikkate alır."
              multiline
              minRows={2}
              sx={{ '& .MuiOutlinedInput-root': { bgcolor: colors.surfaceContainerLow } }}
            />

            <TextField
              fullWidth
              label="Müdahale Edilmeyecek Alanlar"
              placeholder="Örn: Mezuniyet yılı, eski staj bilgileri"
              value={props.manualMustNotMentionTopicsText}
              onChange={(e) => props.setManualMustNotMentionTopicsText(e.target.value)}
              helperText="AI bu metni çıktıda geçirmez."
              multiline
              minRows={2}
              sx={{ '& .MuiOutlinedInput-root': { bgcolor: colors.surfaceContainerLow } }}
            />

            <Box>
              <Typography sx={{ fontWeight: 600, fontSize: '0.875rem', mb: 1 }}>
                AI&apos;nın Müdahale Edeceği Alanlar
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {activeAreas.map((area) => (
                  <Box
                    key={area.key}
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 0.5,
                      px: 2,
                      py: 0.5,
                      borderRadius: 999,
                      bgcolor: colors.secondaryFixed,
                      color: colors.secondary,
                      fontSize: '0.75rem',
                      fontWeight: 700,
                    }}
                  >
                    {area.label}
                    <IconButton
                      size="small"
                      onClick={() =>
                        props.setAiSettings((prev) => ({ ...prev, [area.key]: false }))
                      }
                      sx={{ p: 0, color: 'inherit' }}
                    >
                      <CloseIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Box>
                ))}
                {targetAreaLabels
                  .filter((a) => !props.aiSettings[a.key])
                  .map((area) => (
                    <Button
                      key={area.key}
                      size="small"
                      onClick={() =>
                        props.setAiSettings((prev) => ({ ...prev, [area.key]: true }))
                      }
                      sx={{
                        borderRadius: 999,
                        border: `1px dashed ${colors.outlineVariant}`,
                        textTransform: 'none',
                        fontSize: '0.75rem',
                        color: colors.onSurfaceVariant,
                      }}
                    >
                      + {area.label}
                    </Button>
                  ))}
              </Box>
            </Box>
          </Box>
        </Box>

        <Box id="optimizer-start-analysis">
          <Button
            fullWidth
            variant="contained"
            size="large"
            onClick={() => void props.handleCompanyLinksSubmit()}
            disabled={props.loading}
            endIcon={props.loading ? <CircularProgress size={20} color="inherit" /> : <BoltIcon />}
            sx={{
              height: 56,
              borderRadius: 3,
              bgcolor: colors.primary,
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.875rem',
              boxShadow: 3,
            }}
          >
            {props.loading ? 'Optimizasyon Çalışıyor...' : 'Optimizasyonu Başlat'}
          </Button>
          <Typography
            sx={{ textAlign: 'center', fontSize: '0.75rem', color: colors.onSurfaceVariant, mt: 2 }}
          >
            Tek AI isteği; sonuç doğrudan önizleme adımında açılır.
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
