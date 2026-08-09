'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  LinearProgress,
  Radio,
  RadioGroup,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DoneIcon from '@mui/icons-material/Done';
import DownloadIcon from '@mui/icons-material/Download';
import EditIcon from '@mui/icons-material/Edit';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';
import SyncIcon from '@mui/icons-material/Sync';
import TipsAndUpdatesIcon from '@mui/icons-material/TipsAndUpdates';
import CompanyBasedCVPreview from '@/components/company-based-cv-editor/CompanyBasedCVPreview';
import { CompanyBasedCVService } from '@/lib/company-based-cv-editor/service';
import {
  buildKeywordStatusList,
  formatIntegratedInLabel,
} from '@/lib/company-based-cv-editor/keywordStatus';
import { FontSizeSelector } from '@/features/ai-cv-builder/components/form/FontSizeSelector';
import type { CompanyCvOptimizerState } from '../../types';
import type { OutreachEmailLanguageMode } from '../../types';
import { PreviewStepper } from '../shell/PreviewStepper';
import { dashboardTokens } from '@/features/dashboard/styles/dashboardTokens';
import { DeliverabilityScore } from '../DeliverabilityScore';
import {
  buildRecipientEmails,
  extractDomainFromUrl,
  normalizeEmailDomainInput,
  resolveOutreachEmailLanguage,
} from '../../constants/outreachConstants';
import {
  anyInfoOrContactEmail,
  hasStandardRecipientEmails,
  onlyInfoOrContactEmails,
} from '@/lib/outreach/coldEmailGenericInbox';

type PreviewStepProps = Pick<
  CompanyCvOptimizerState,
  | 'analysisResult'
  | 'coverLetter'
  | 'coverLetterLanguage'
  | 'coverLetterWordCount'
  | 'linkedinMessage'
  | 'linkedinMessageLanguage'
  | 'editableCVData'
  | 'nameFontSize'
  | 'setNameFontSize'
  | 'profileTitleFontSize'
  | 'setProfileTitleFontSize'
  | 'bodyFontSize'
  | 'setBodyFontSize'
  | 'headingFontSize'
  | 'setHeadingFontSize'
  | 'jobTitleFontSize'
  | 'setJobTitleFontSize'
  | 'skillsFontSize'
  | 'setSkillsFontSize'
  | 'isEditing'
  | 'cvLanguage'
  | 'cvFile'
  | 'cvData'
  | 'companyInfo'
  | 'companyLinks'
  | 'coverLetterCompanyName'
  | 'targetPosition'
  | 'aiSettings'
  | 'loading'
  | 'handleCopyCoverLetter'
  | 'handleCopyLinkedinMessage'
  | 'handleAnalyzeCV'
  | 'handlePrepareNewAnalysisSameCv'
  | 'handleStartEditing'
  | 'handleCancelEditing'
  | 'handleSaveEditing'
  | 'handleUpdateField'
  | 'handleUpdateWorkExperience'
  | 'handleUpdateWorkExperienceBullet'
  | 'handleAddWorkExperienceBullet'
  | 'handleRemoveWorkExperienceBullet'
  | 'handleTranslateToEnglish'
  | 'getWordCount'
  | 'setCoverLetter'
  | 'setLinkedinMessage'
  | 'shouldSendCompanyEmail'
  | 'autoSendOutreachAfterAnalysis'
  | 'emailDomainOverride'
  | 'includePrimaryEmailInSend'
  | 'setIncludePrimaryEmailInSend'
  | 'skipPrimaryEmailVerification'
  | 'setSkipPrimaryEmailVerification'
  | 'selectedEmailPrefixCategories'
  | 'customEmailLocalPartsText'
  | 'selectedOutreachRecipients'
  | 'setSelectedOutreachRecipients'
  | 'forceOutreachResend'
  | 'setForceOutreachResend'
  | 'cvAdaptationSource'
  | 'jobDescriptionText'
  | 'outreachEmailLanguageMode'
  | 'setOutreachEmailLanguageMode'
  | 'outreachEmailSubject'
  | 'setOutreachEmailSubject'
  | 'outreachEmailBody'
  | 'setOutreachEmailBody'
  | 'outreachInfoContactEmailBody'
  | 'setOutreachInfoContactEmailBody'
  | 'outreachSending'
  | 'outreachSendResult'
  | 'outreachCvAttachmentSource'
  | 'setOutreachCvAttachmentSource'
  | 'handleSendCompanyEmail'
  | 'handleRegenerateColdEmail'
  | 'deliverabilityScore'
  | 'deliverabilityLoading'
  | 'refreshDeliverabilityScore'
  | 'error'
  | 'setError'
>;

export function PreviewStep(props: PreviewStepProps) {
  const { colors, fonts, gradients } = dashboardTokens;
  const [copyCoverDone, setCopyCoverDone] = useState(false);
  const [copyLinkedinDone, setCopyLinkedinDone] = useState(false);
  const [outreachApproved, setOutreachApproved] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Yeni analiz / farklı firma — onay ve diyalog sıfırlansın (eski başarı mesajı hook'ta temizlenir)
  useEffect(() => {
    setOutreachApproved(false);
    setConfirmOpen(false);
  }, [
    props.analysisResult?.matchScore,
    props.companyInfo?.name,
    props.coverLetterCompanyName,
    props.emailDomainOverride,
  ]);

  const resolvedDomain = normalizeEmailDomainInput(
    props.emailDomainOverride ||
      extractDomainFromUrl(props.companyInfo?.website || '') ||
      extractDomainFromUrl(props.companyLinks[0]?.url || '')
  );

  const previewRecipients = useMemo(
    () =>
      buildRecipientEmails({
        domain: resolvedDomain,
        selectedCategoryIds: props.selectedEmailPrefixCategories,
        customLocalParts: props.customEmailLocalPartsText
          .split(/[\n,;]+/)
          .map((s) => s.trim())
          .filter(Boolean),
        rawDomainInput:
          props.emailDomainOverride.trim() ||
          props.companyInfo?.website ||
          props.companyLinks[0]?.url ||
          resolvedDomain,
        includePrimaryEmail: props.includePrimaryEmailInSend,
      }),
    [
      resolvedDomain,
      props.selectedEmailPrefixCategories,
      props.customEmailLocalPartsText,
      props.emailDomainOverride,
      props.includePrimaryEmailInSend,
      props.companyInfo?.website,
      props.companyLinks,
    ]
  );

  const toggleRecipient = (email: string) => {
    props.setSelectedOutreachRecipients((prev) =>
      prev.includes(email) ? prev.filter((e) => e !== email) : [...prev, email]
    );
    setOutreachApproved(false);
  };

  const resolvedMailLanguage = resolveOutreachEmailLanguage({
    mode: props.outreachEmailLanguageMode,
    pageLanguage: props.companyInfo?.detectedLanguage,
    jobDescriptionText: props.jobDescriptionText,
    adaptationSource: props.cvAdaptationSource,
    fallback: props.cvLanguage,
  });

  const cvStatusLines = useMemo(() => {
    const lines: string[] = [];
    if (props.aiSettings.about) lines.push('Hakkımda uyarlandı');
    if (props.aiSettings.workExperience) lines.push('Deneyim uyarlandı');
    if (props.aiSettings.skills) lines.push('Beceriler uyarlandı');
    if (!lines.length) lines.push('CV alanları değiştirilmedi (orijinal korundu)');
    return lines;
  }, [props.aiSettings]);

  const linkedinBodyForCount = props.linkedinMessage
    ? CompanyBasedCVService.stripAppendedOutreachSignature(props.linkedinMessage)
    : '';
  const linkedinBodyWordCount = linkedinBodyForCount
    ? props.getWordCount(linkedinBodyForCount)
    : 0;
  const linkedinTotalWordCount = props.linkedinMessage
    ? props.getWordCount(props.linkedinMessage)
    : 0;

  const keywordStatusList = useMemo(
    () =>
      buildKeywordStatusList({
        companyKeywords: props.companyInfo?.extractedKeywords,
        detectedKeywords: props.analysisResult?.detectedKeywords,
        candidateKeywords: props.analysisResult?.candidateKeywords,
        report: props.analysisResult?.keywordIntegrationReport,
      }),
    [
      props.companyInfo?.extractedKeywords,
      props.analysisResult?.detectedKeywords,
      props.analysisResult?.candidateKeywords,
      props.analysisResult?.keywordIntegrationReport,
    ]
  );

  const usedKeywords = useMemo(
    () => keywordStatusList.filter((item) => item.used),
    [keywordStatusList]
  );

  const alreadyPresentKeywords = useMemo(
    () =>
      keywordStatusList.filter(
        (item) => item.alreadyPresent || item.integratedIn === 'already_present'
      ),
    [keywordStatusList]
  );

  const unusedKeywords = useMemo(
    () =>
      keywordStatusList.filter(
        (item) =>
          !item.used &&
          !item.alreadyPresent &&
          item.integratedIn !== 'already_present'
      ),
    [keywordStatusList]
  );

  const tipKeywords = usedKeywords.slice(0, 3).map((item) => item.keyword);

  const onCopyCover = async () => {
    await props.handleCopyCoverLetter();
    setCopyCoverDone(true);
    setTimeout(() => setCopyCoverDone(false), 2000);
  };

  const onCopyLinkedin = async () => {
    await props.handleCopyLinkedinMessage();
    setCopyLinkedinDone(true);
    setTimeout(() => setCopyLinkedinDone(false), 2000);
  };

  return (
    <Box sx={{ width: '100%' }}>
      <PreviewStepper />

      {/* Header Actions — tasarım birebir */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          flexWrap: 'wrap',
          gap: 2,
          mb: 3,
        }}
      >
        <Box>
          <Typography
            sx={{
              fontFamily: fonts.display,
              fontSize: { xs: '1.25rem', md: '1.5rem' },
              fontWeight: 600,
              lineHeight: '32px',
              color: colors.primary,
            }}
          >
            CV ve Başvuru Setiniz Hazır!
          </Typography>
          <Typography
            sx={{
              color: colors.onSurfaceVariant,
              mt: 0.5,
              fontFamily: fonts.body,
              fontSize: '1rem',
            }}
          >
            Seçtiğiniz şirket için optimize edilmiş belgeleri aşağıda inceleyebilirsiniz.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button
            startIcon={
              props.loading ? <CircularProgress size={18} color="inherit" /> : <RefreshIcon />
            }
            onClick={() => void props.handleAnalyzeCV()}
            disabled={props.loading || !props.cvFile}
            sx={{
              textTransform: 'none',
              border: `1px solid ${colors.outlineVariant}`,
              borderRadius: 2,
              px: 2,
              py: 1,
              fontWeight: 600,
              fontSize: '0.875rem',
              color: colors.onSurface,
              bgcolor: colors.surfaceContainerLowest,
              '&:hover': { bgcolor: colors.surfaceContainerLow },
            }}
          >
            {props.loading ? 'Yeniden üretiliyor...' : 'Yeniden üret'}
          </Button>
          <Button
            startIcon={<DownloadIcon />}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              px: 3,
              py: 1.5,
              bgcolor: colors.primary,
              color: colors.onPrimary,
              borderRadius: 3,
              fontWeight: 600,
              fontSize: '0.875rem',
              textTransform: 'none',
              boxShadow: 3,
              '&:hover': { opacity: 0.9, bgcolor: colors.primary },
              '&:active': { transform: 'scale(0.95)' },
            }}
          >
            PDF İndir (Tüm Set)
          </Button>
        </Box>
      </Box>

      {/* Bento Layout */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            lg: 'minmax(0, 7fr) minmax(0, 5fr)',
            xl: 'minmax(0, 8fr) minmax(0, 4fr)',
          },
          gap: 3,
        }}
      >
        {/* Left: Orijinal CV şablonu (CompanyBasedCVPreview) */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Box sx={{ position: 'relative' }}>
            {!props.isEditing && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 16,
                  right: 16,
                  zIndex: 10,
                  display: 'flex',
                  gap: 1,
                }}
              >
                <Button
                  startIcon={<EditIcon sx={{ fontSize: 20 }} />}
                  onClick={props.handleStartEditing}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    px: 2,
                    py: 1,
                    bgcolor: '#ffffff',
                    border: `1px solid ${colors.outlineVariant}`,
                    borderRadius: 2,
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    textTransform: 'none',
                    color: colors.onSurface,
                    boxShadow: 1,
                    '&:hover': { bgcolor: colors.surfaceContainerHigh },
                  }}
                >
                  Manuel Düzenle
                </Button>
              </Box>
            )}

            {props.editableCVData && (
              <Box
                sx={{
                  bgcolor: colors.surfaceContainerLowest,
                  borderRadius: 1,
                  boxShadow: '0 4px 6px -1px rgba(15, 23, 42, 0.1)',
                  overflow: 'hidden',
                }}
              >
                <Box sx={{ px: 2, pt: 2 }}>
                  <FontSizeSelector
                    bodyValue={props.bodyFontSize}
                    headingValue={props.headingFontSize}
                    jobTitleValue={props.jobTitleFontSize}
                    skillsValue={props.skillsFontSize}
                    onBodyChange={props.setBodyFontSize}
                    onHeadingChange={props.setHeadingFontSize}
                    onJobTitleChange={props.setJobTitleFontSize}
                    onSkillsChange={props.setSkillsFontSize}
                  />
                </Box>
                <CompanyBasedCVPreview
                  data={props.editableCVData}
                  isEditing={props.isEditing}
                  cvLanguage={props.cvLanguage}
                  bodyFontSize={props.bodyFontSize}
                  headingFontSize={props.headingFontSize}
                  jobTitleFontSize={props.jobTitleFontSize}
                  skillsFontSize={props.skillsFontSize}
                  nameFontSize={props.nameFontSize}
                  profileTitleFontSize={props.profileTitleFontSize}
                  onUpdateField={props.handleUpdateField}
                  onUpdateWorkExperience={props.handleUpdateWorkExperience}
                  onUpdateWorkExperienceBullet={props.handleUpdateWorkExperienceBullet}
                  onAddWorkExperienceBullet={props.handleAddWorkExperienceBullet}
                  onRemoveWorkExperienceBullet={props.handleRemoveWorkExperienceBullet}
                  onStartEditing={props.handleStartEditing}
                  onCancelEditing={props.handleCancelEditing}
                  onSaveEditing={props.handleSaveEditing}
                  onTranslateToEnglish={props.handleTranslateToEnglish}
                />
              </Box>
            )}
          </Box>
        </Box>

        {/* Right: Cover Letter + LinkedIn + Tip */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Kapak Mektubu — ai-glow glass-card */}
          <Box
            sx={{
              borderRadius: 3,
              p: 3,
              background: 'rgba(255, 255, 255, 0.8)',
              backdropFilter: 'blur(8px)',
              border: '1px solid transparent',
              backgroundImage: `linear-gradient(white, white), ${gradients.aiGlowBorder}`,
              backgroundOrigin: 'border-box',
              backgroundClip: 'padding-box, border-box',
            }}
          >
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  mb: 2,
                }}
              >
                <Box>
                  <Typography
                    sx={{
                      fontFamily: fonts.display,
                      fontSize: '1.25rem',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                    }}
                  >
                    <AutoAwesomeIcon sx={{ color: colors.secondary }} />
                    Kapak Mektubu
                  </Typography>
                  <Box
                    component="span"
                    sx={{
                      display: 'inline-block',
                      mt: 0.5,
                      px: 1,
                      py: '2px',
                      borderRadius: 999,
                      bgcolor: colors.tertiaryFixedDim,
                      color: colors.onTertiaryContainer,
                      fontSize: '0.75rem',
                      fontWeight: 500,
                    }}
                  >
                    AI Tarafından Optimize Edildi
                    {props.coverLetterLanguage
                      ? ` · ${props.coverLetterLanguage === 'english' ? 'EN' : 'TR'}`
                      : ''}
                  </Box>
                </Box>
                <Tooltip title={copyCoverDone ? 'Kopyalandı' : 'Kopyala'}>
                  <Box component="span" sx={{ display: 'inline-flex' }}>
                    <IconButton
                      onClick={() => void onCopyCover()}
                      disabled={!props.coverLetter}
                      sx={{
                        '&:hover': { bgcolor: colors.surfaceContainerHigh },
                        borderRadius: 2,
                      }}
                    >
                      {copyCoverDone ? (
                        <DoneIcon sx={{ color: 'success.main' }} />
                      ) : (
                        <ContentCopyIcon />
                      )}
                    </IconButton>
                  </Box>
                </Tooltip>
              </Box>

              {props.coverLetter ? (
                <>
                  <TextField
                    fullWidth
                    multiline
                    value={props.coverLetter}
                    onChange={(e) => props.setCoverLetter(e.target.value)}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        bgcolor: colors.surfaceContainerLow,
                        borderRadius: 2,
                        fontSize: '0.875rem',
                        lineHeight: 1.6,
                        alignItems: 'flex-start',
                        '& fieldset': { border: 'none' },
                      },
                      '& textarea': {
                        maxHeight: 300,
                        overflowY: 'auto !important',
                        resize: 'none',
                      },
                    }}
                  />
                  <Typography
                    variant="caption"
                    color={
                      props.coverLetterWordCount >= 250 && props.coverLetterWordCount <= 350
                        ? 'success.main'
                        : 'text.secondary'
                    }
                    sx={{ mt: 1, display: 'block' }}
                  >
                    Toplam kelime (imza dahil): {props.coverLetterWordCount} / hedef: 250-350
                  </Typography>
                </>
              ) : (
                <Box
                  sx={{
                    bgcolor: colors.surfaceContainerLow,
                    p: 2,
                    borderRadius: 2,
                    fontSize: '0.875rem',
                    color: colors.onSurfaceVariant,
                  }}
                >
                  Bu analizde kapak mektubu üretilmedi. Gerekirse önceki adımda seçeneği açıp yeniden
                  üretin.
                </Box>
              )}
            </Box>

          {/* LinkedIn Mesajı */}
          <Box
            sx={{
              borderRadius: 3,
              p: 3,
              background: 'rgba(255, 255, 255, 0.8)',
              backdropFilter: 'blur(8px)',
              border: `1px solid ${colors.outlineVariant}`,
            }}
          >
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                mb: 2,
              }}
            >
              <Typography
                sx={{
                  fontFamily: fonts.display,
                  fontSize: '1.25rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                <ChatBubbleOutlineIcon sx={{ color: colors.primary }} />
                LinkedIn Mesajı
              </Typography>
              <Tooltip title={copyLinkedinDone ? 'Kopyalandı' : 'Kopyala'}>
                <Box component="span" sx={{ display: 'inline-flex' }}>
                  <IconButton
                    onClick={() => void onCopyLinkedin()}
                    disabled={!props.linkedinMessage}
                    sx={{
                      '&:hover': { bgcolor: colors.surfaceContainerHigh },
                      borderRadius: 2,
                    }}
                  >
                    {copyLinkedinDone ? (
                      <DoneIcon sx={{ color: 'success.main' }} />
                    ) : (
                      <ContentCopyIcon />
                    )}
                  </IconButton>
                </Box>
              </Tooltip>
            </Box>

            {props.linkedinMessage ? (
              <>
                <TextField
                  fullWidth
                  multiline
                  value={props.linkedinMessage}
                  onChange={(e) => props.setLinkedinMessage(e.target.value)}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      bgcolor: colors.surfaceContainerLow,
                      borderRadius: 2,
                      fontSize: '0.875rem',
                      fontStyle: 'italic',
                      lineHeight: 1.6,
                      alignItems: 'flex-start',
                      '& fieldset': { border: 'none' },
                    },
                    '& textarea': {
                      maxHeight: 220,
                      overflowY: 'auto !important',
                      resize: 'none',
                    },
                  }}
                />
                <Typography
                  variant="caption"
                  color={
                    linkedinBodyWordCount >= 50 && linkedinBodyWordCount <= 70
                      ? 'success.main'
                      : 'text.secondary'
                  }
                  sx={{ mt: 1, display: 'block' }}
                >
                  Gövde: {linkedinBodyWordCount} / 50-70 — toplam: {linkedinTotalWordCount}
                </Typography>
              </>
            ) : (
              <Box
                sx={{
                  bgcolor: colors.surfaceContainerLow,
                  p: 2,
                  borderRadius: 2,
                  fontSize: '0.875rem',
                  fontStyle: 'italic',
                  color: colors.onSurfaceVariant,
                }}
              >
                Bu analizde LinkedIn mesajı üretilmedi.
              </Box>
            )}

            <Typography
              sx={{
                mt: 2,
                fontSize: '0.75rem',
                fontWeight: 500,
                color: colors.onSurfaceVariant,
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
              }}
            >
              <InfoOutlinedIcon sx={{ fontSize: 16 }} />
              İK Uzmanlarına doğrudan ulaşmak şansınızı %40 artırır.
            </Typography>
          </Box>

          {/* Uzman İpucu */}
          <Box
            sx={{
              p: 3,
              bgcolor: colors.secondaryFixed,
              borderRadius: 3,
              border: `1px solid ${colors.secondaryFixedDim}`,
            }}
          >
            <Typography
              sx={{
                fontWeight: 600,
                fontSize: '0.875rem',
                color: colors.onSecondaryFixed,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                mb: 0.5,
              }}
            >
              <TipsAndUpdatesIcon fontSize="small" />
              Uzman İpucu
            </Typography>
            <Typography
              sx={{
                fontSize: '0.875rem',
                color: colors.onSecondaryFixedVariant,
                lineHeight: 1.5,
              }}
            >
                  {props.analysisResult ? (
                tipKeywords.length > 0 ? (
                  <>
                    Bu CV, hedef şirketin iş tanımındaki{' '}
                    {tipKeywords.map((k, i) => (
                      <span key={k}>
                        {i > 0 && (i === tipKeywords.length - 1 ? ' ve ' : ', ')}
                        <Box component="strong" sx={{ fontWeight: 700 }}>
                          &quot;{k}&quot;
                        </Box>
                      </span>
                    ))}{' '}
                    anahtar kelimelerine göre{' '}
                    <strong>%{props.analysisResult.matchScore}</strong> uyum sağladı.
                  </>
                ) : (
                  <>
                    Bu CV, hedef şirketin iş tanımına göre{' '}
                    <strong>%{props.analysisResult.matchScore}</strong> uyum sağladı.
                  </>
                )
              ) : (
                'Analiz sonucu hazırlanıyor.'
              )}
            </Typography>
          </Box>
        </Box>
      </Box>

      {keywordStatusList.length > 0 && (
        <Box
          sx={{
            mt: 3,
            p: 3,
            borderRadius: 3,
            border: `1px solid ${colors.outlineVariant}`,
            bgcolor: 'rgba(255,255,255,0.9)',
          }}
        >
          <Typography sx={{ fontFamily: fonts.display, fontWeight: 600, mb: 0.5 }}>
            Hedef anahtar kelimeler (KW)
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            İlan/sayfadan ~10 aday KW çıkarılır; CV’de zaten geçenler elenir; kalanlardan en fazla
            5’i seçili alana (önce Hakkımda, yoksa Deneyim) doğal şekilde işlenir.
          </Typography>

          <Box sx={{ mb: 2 }}>
            <Typography fontWeight={600} fontSize="0.875rem" sx={{ mb: 1 }}>
              Kullanılan / dokunan ({usedKeywords.length})
            </Typography>
            {usedKeywords.length > 0 ? (
              <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1}>
                {usedKeywords.map((item) => (
                  <Chip
                    key={`used-${item.keyword}`}
                    color="success"
                    variant="outlined"
                    label={`${item.keyword} · ${formatIntegratedInLabel(item.integratedIn)}`}
                    size="small"
                  />
                ))}
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Dokunacak yeni KW kalmadı veya entegre edilemedi.
              </Typography>
            )}
          </Box>

          <Box sx={{ mb: 2 }}>
            <Typography fontWeight={600} fontSize="0.875rem" sx={{ mb: 1 }}>
              CV’de zaten var ({alreadyPresentKeywords.length})
            </Typography>
            {alreadyPresentKeywords.length > 0 ? (
              <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1}>
                {alreadyPresentKeywords.map((item) => (
                  <Chip
                    key={`present-${item.keyword}`}
                    color="info"
                    variant="outlined"
                    label={item.keyword}
                    size="small"
                  />
                ))}
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Aday KW’lerin hiçbiri CV’de önceden geçmiyordu.
              </Typography>
            )}
          </Box>

          <Box sx={{ mb: 2 }}>
            <Typography fontWeight={600} fontSize="0.875rem" sx={{ mb: 1 }}>
              Kullanılamayan / üst 5 dışı ({unusedKeywords.length})
            </Typography>
            {unusedKeywords.length > 0 ? (
              <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1}>
                {unusedKeywords.map((item) => (
                  <Tooltip key={`unused-${item.keyword}`} title={item.note || 'Entegre edilemedi'}>
                    <Chip color="default" variant="outlined" label={item.keyword} size="small" />
                  </Tooltip>
                ))}
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Eklenen aday kalmadı.
              </Typography>
            )}
          </Box>

          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>KW</TableCell>
                <TableCell>Durum</TableCell>
                <TableCell>Not</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {keywordStatusList.map((row) => (
                <TableRow key={`kw-row-${row.keyword}`}>
                  <TableCell>
                    <strong>{row.keyword}</strong>
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      color={
                        row.used
                          ? 'success'
                          : row.integratedIn === 'already_present'
                            ? 'info'
                            : 'warning'
                      }
                      label={formatIntegratedInLabel(row.integratedIn)}
                      variant={row.used ? 'filled' : 'outlined'}
                    />
                  </TableCell>
                  <TableCell>{row.note}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      )}

      {props.analysisResult && (
        <Accordion
          defaultExpanded
          sx={{
            mt: 3,
            borderRadius: 3,
            boxShadow: 'none',
            border: `1px solid ${colors.outlineVariant}`,
            '&:before': { display: 'none' },
            bgcolor: 'rgba(255,255,255,0.8)',
          }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography fontWeight={600}>
              Optimizasyon sonuçları · Uyum %{props.analysisResult.matchScore}
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Uyum Skoru: {props.analysisResult.matchScore}%
              </Typography>
              <LinearProgress
                variant="determinate"
                value={props.analysisResult.matchScore}
                sx={{ mt: 1, height: 8, borderRadius: 1 }}
              />
            </Box>

            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              Pozitif Uyum (Güçlü Yönler)
            </Typography>
            <Table size="small" sx={{ mb: 2 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: '40%' }}>İlan gereksinimi</TableCell>
                  <TableCell>CV kanıtı</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(props.analysisResult.positiveMatches ?? []).map((m, index) => (
                  <TableRow key={`${m.label}-${index}`}>
                    <TableCell>
                      <strong>{m.label}</strong>
                    </TableCell>
                    <TableCell>{m.evidence}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              Negatif Uyumsuzluk
            </Typography>
            <Table size="small" sx={{ mb: 2 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: '40%' }}>İlan gereksinimi</TableCell>
                  <TableCell>Uyumsuzluk nedeni</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(props.analysisResult.negativeMismatches ?? []).map((m, index) => (
                  <TableRow key={`${m.label}-${index}`}>
                    <TableCell>
                      <strong>{m.label}</strong>
                    </TableCell>
                    <TableCell>
                      {m.gap}
                      {m.evidence ? (
                        <Typography variant="body2" color="text.secondary">
                          ({m.evidence})
                        </Typography>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <Typography variant="body2" sx={{ mb: 1 }}>
              <strong>Öneriler:</strong>
            </Typography>
            <Stack spacing={0.5}>
              {props.analysisResult.recommendations.map((rec, index) => (
                <Typography key={index} variant="body2" sx={{ pl: 2 }}>
                  • {rec}
                </Typography>
              ))}
            </Stack>

            {(keywordStatusList.length > 0 ||
              props.analysisResult.detectedKeywords?.length ||
              props.analysisResult.keywordIntegrationReport?.length) && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle1" sx={{ mb: 1 }}>
                  Anahtar Kelime Entegrasyonu
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Kullanılan: {usedKeywords.length} · Kullanılamayan: {unusedKeywords.length}
                </Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>KW</TableCell>
                      <TableCell>Durum</TableCell>
                      <TableCell>Not</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {keywordStatusList.map((row, index) => (
                      <TableRow key={`${row.keyword}-${index}`}>
                        <TableCell>
                          <strong>{row.keyword}</strong>
                        </TableCell>
                        <TableCell>{formatIntegratedInLabel(row.integratedIn)}</TableCell>
                        <TableCell>{row.note}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            )}
          </AccordionDetails>
        </Accordion>
      )}

      {props.shouldSendCompanyEmail && (
        <Box
          sx={{
            mt: 3,
            p: 3,
            borderRadius: 3,
            border: `1px solid ${colors.outlineVariant}`,
            bgcolor: 'rgba(255,255,255,0.9)',
          }}
        >
          <Typography sx={{ fontFamily: fonts.display, fontWeight: 600, mb: 1 }}>
            Mail gönderimi — onay adımı
          </Typography>
          <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
            {props.autoSendOutreachAfterAnalysis ? (
              <>
                Profil ayarı açık: analiz sonrası mailler <strong>otomatik gönderilir</strong>.
                Bu adımda yalnızca sonucu ve metni görürsünüz; manuel gönderim kapalıdır.
                Değiştirmek için Profilim sayfasındaki ayarı kapatın.
              </>
            ) : (
              <>
                Analiz sonrası mailler <strong>otomatik gönderilmez</strong>. Aşağıdaki içeriği
                kontrol edin, onaylayın; ardından onay diyaloğunda kesinleştirin. Otomatik gönderim
                için Profilim ayarını açın.
              </>
            )}
          </Alert>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
              gap: 2,
              mb: 2,
            }}
          >
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: colors.surfaceContainerLow,
                border: `1px solid ${colors.outlineVariant}`,
              }}
            >
              <Typography fontWeight={700} sx={{ mb: 1, fontSize: '0.875rem' }}>
                CV durumu
              </Typography>
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                Dosya: {props.cvFile?.name || '—'}
              </Typography>
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                Aday:{' '}
                {[
                  props.cvData?.personalInfo?.firstName,
                  props.cvData?.personalInfo?.lastName,
                ]
                  .filter(Boolean)
                  .join(' ') || '—'}
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Uyum skoru: {props.analysisResult?.matchScore ?? '—'}%
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                {cvStatusLines.map((line) => (
                  <Chip key={line} size="small" label={line} />
                ))}
              </Box>
            </Box>

            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: colors.surfaceContainerLow,
                border: `1px solid ${colors.outlineVariant}`,
              }}
            >
              <Typography fontWeight={700} sx={{ mb: 1, fontSize: '0.875rem' }}>
                Hedef firma / alıcılar
              </Typography>
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                Firma:{' '}
                {props.coverLetterCompanyName ||
                  props.companyInfo?.name ||
                  '—'}
              </Typography>
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                Domain: @{resolvedDomain || 'belirtilmedi'}
              </Typography>
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                Pozisyon: {props.targetPosition || '—'}
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Mail dili:{' '}
                {resolvedMailLanguage === 'english' ? 'English' : 'Türkçe'}
                {props.outreachEmailLanguageMode === 'auto' ? ' (otomatik)' : ''}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                Aday listesi ({previewRecipients.length}). Gönderilecekleri tek tek seçin
                (önerilen: en fazla 5).
              </Typography>
              <FormControlLabel
                control={
                  <Checkbox
                    size="small"
                    checked={props.includePrimaryEmailInSend}
                    onChange={(e) => {
                      const next = e.target.checked;
                      props.setIncludePrimaryEmailInSend(next);
                      if (!next) props.setSkipPrimaryEmailVerification(false);
                      const raw = props.emailDomainOverride.trim();
                      if (!raw.includes('@')) {
                        setOutreachApproved(false);
                        return;
                      }
                      const domain = normalizeEmailDomainInput(raw);
                      const local = raw.split('@')[0]?.trim().toLowerCase();
                      const primary = local && domain ? `${local}@${domain}` : null;
                      if (!primary) {
                        setOutreachApproved(false);
                        return;
                      }
                      props.setSelectedOutreachRecipients((prev) => {
                        if (next) {
                          return prev.includes(primary) ? prev : [primary, ...prev];
                        }
                        return prev.filter((x) => x !== primary);
                      });
                      setOutreachApproved(false);
                    }}
                    disabled={!props.emailDomainOverride.trim().includes('@')}
                  />
                }
                label="Ana adresi de gönder"
                sx={{ mb: 0 }}
              />
              <FormControlLabel
                control={
                  <Checkbox
                    size="small"
                    checked={props.skipPrimaryEmailVerification}
                    onChange={(e) => {
                      props.setSkipPrimaryEmailVerification(e.target.checked);
                      setOutreachApproved(false);
                    }}
                    disabled={
                      !props.includePrimaryEmailInSend ||
                      !props.emailDomainOverride.trim().includes('@')
                    }
                  />
                }
                label="Ana adresi doğrulamadan geçir (trusted)"
                sx={{ mb: 0.5 }}
              />
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                <Button
                  size="small"
                  sx={{ textTransform: 'none' }}
                  onClick={() => {
                    props.setSelectedOutreachRecipients(previewRecipients.slice(0, 3));
                    setOutreachApproved(false);
                  }}
                >
                  İlk 3
                </Button>
                <Button
                  size="small"
                  sx={{ textTransform: 'none' }}
                  onClick={() => {
                    props.setSelectedOutreachRecipients(previewRecipients.slice(0, 5));
                    setOutreachApproved(false);
                  }}
                >
                  İlk 5
                </Button>
                <Button
                  size="small"
                  sx={{ textTransform: 'none' }}
                  onClick={() => {
                    props.setSelectedOutreachRecipients([]);
                    setOutreachApproved(false);
                  }}
                >
                  Temizle
                </Button>
              </Box>
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 0.25,
                  maxHeight: 180,
                  overflow: 'auto',
                }}
              >
                {previewRecipients.map((email) => (
                  <FormControlLabel
                    key={email}
                    control={
                      <Checkbox
                        size="small"
                        checked={props.selectedOutreachRecipients.includes(email)}
                        onChange={() => toggleRecipient(email)}
                      />
                    }
                    label={
                      <Typography sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                        {email}
                      </Typography>
                    }
                  />
                ))}
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Seçili: {props.selectedOutreachRecipients.length} · CV PDF eki:{' '}
                {props.outreachCvAttachmentSource === 'optimized'
                  ? 'Optimize edilmiş CV'
                  : props.cvFile?.name || 'orijinal yükleme'}
              </Typography>

              <Typography fontWeight={600} fontSize="0.875rem" sx={{ mt: 2, mb: 0.5 }}>
                Eklenecek CV
              </Typography>
              <RadioGroup
                value={props.outreachCvAttachmentSource}
                onChange={(e) =>
                  props.setOutreachCvAttachmentSource(
                    e.target.value === 'original' ? 'original' : 'optimized'
                  )
                }
              >
                <FormControlLabel
                  value="optimized"
                  control={<Radio size="small" />}
                  disabled={!props.editableCVData && !props.cvData}
                  label={
                    <Typography fontSize="0.875rem">
                      Optimize / düzenlenmiş CV (önizlemedeki)
                    </Typography>
                  }
                />
                <FormControlLabel
                  value="original"
                  control={<Radio size="small" />}
                  disabled={!props.cvFile}
                  label={
                    <Typography fontSize="0.875rem">
                      Orijinal yüklenen PDF
                      {props.cvFile?.name ? ` (${props.cvFile.name})` : ''}
                    </Typography>
                  }
                />
              </RadioGroup>

              <Alert severity="info" sx={{ mt: 1.5, py: 0.5 }}>
                {!props.includePrimaryEmailInSend
                  ? 'Ana adres gönderime kapalı — yalnızca baz domain / seçili prefix’ler. '
                  : props.skipPrimaryEmailVerification
                    ? 'Ana adres listede ve doğrulanmadan (trusted) gider. '
                    : 'Ana adres listede; diğerleri gibi doğrulamadan geçer. '}
                Diğer adaylar MX + Reacher/EmailVerify ile doğrulanır; geçerli olanlar da
                gönderilir (tek sefer limiti dahilinde).
              </Alert>
            </Box>
          </Box>

          <Typography sx={{ fontWeight: 600, mb: 1 }}>Cold mail içeriği</Typography>
          <RadioGroup
            row
            value={props.outreachEmailLanguageMode}
            onChange={(e) => {
              props.setOutreachEmailLanguageMode(e.target.value as OutreachEmailLanguageMode);
              setOutreachApproved(false);
            }}
            sx={{ mb: 2 }}
          >
            <FormControlLabel
              value="auto"
              control={<Radio size="small" />}
              label="Otomatik (sayfa dili)"
            />
            <FormControlLabel value="turkish" control={<Radio size="small" />} label="Türkçe" />
            <FormControlLabel value="english" control={<Radio size="small" />} label="English" />
          </RadioGroup>
          <TextField
            fullWidth
            label="Mail konusu"
            value={props.outreachEmailSubject}
            onChange={(e) => {
              props.setOutreachEmailSubject(e.target.value);
              setOutreachApproved(false);
            }}
            placeholder="Full Stack Developer – Başvuru"
            sx={{ mb: 2 }}
          />
          {(() => {
            const recipients = props.selectedOutreachRecipients;
            const showStandard = hasStandardRecipientEmails(recipients);
            const showInfoContact = anyInfoOrContactEmail(recipients);
            const onlyInfo = onlyInfoOrContactEmails(recipients);

            if (!recipients.length) {
              return (
                <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
                  Alıcı seçince cold mail önizlemesi burada görünür. Tek info@/contact@ ise yalnızca
                  yönlendirmeli sürüm; diğer adreslerde standart cold mail gösterilir.
                </Alert>
              );
            }

            return (
              <Stack spacing={2} sx={{ mb: 2 }}>
                {showStandard && (
                  <Box>
                    <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>
                      Standart cold mail
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                      hr@, careers@, founders@ vb. adreslere bu metin gider.
                    </Typography>
                    <TextField
                      fullWidth
                      label="Standart mail gövdesi"
                      value={props.outreachEmailBody}
                      onChange={(e) => {
                        props.setOutreachEmailBody(e.target.value);
                        setOutreachApproved(false);
                      }}
                      multiline
                      minRows={8}
                      maxRows={16}
                    />
                  </Box>
                )}
                {showInfoContact && (
                  <Box>
                    <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>
                      info@ / contact@ özel cold mail
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                      {onlyInfo
                        ? 'Yalnızca girilen ana adres info/contact olduğu için standart sürüm üretilmez / gösterilmez; bu metin kullanılır.'
                        : 'info@ ve contact@ adreslerine İK yönlendirme girişli bu sürüm gider; diğer alıcılar standart metni alır.'}
                    </Typography>
                    <TextField
                      fullWidth
                      label="info/contact mail gövdesi"
                      value={props.outreachInfoContactEmailBody}
                      onChange={(e) => {
                        props.setOutreachInfoContactEmailBody(e.target.value);
                        setOutreachApproved(false);
                      }}
                      multiline
                      minRows={8}
                      maxRows={16}
                    />
                  </Box>
                )}
                {!showStandard && !showInfoContact && (
                  <Alert severity="warning" sx={{ borderRadius: 2 }}>
                    Seçili alıcılar için cold mail sınıflandırılamadı.
                  </Alert>
                )}
              </Stack>
            );
          })()}

          <FormControlLabel
            control={
              <Checkbox
                checked={outreachApproved}
                onChange={(e) => setOutreachApproved(e.target.checked)}
                disabled={props.autoSendOutreachAfterAnalysis}
              />
            }
            label={
              props.autoSendOutreachAfterAnalysis
                ? 'Otomatik gönderim aktif — manuel onay gerekmez.'
                : 'CV uyarlamasını, mail metnini ve seçili alıcıları kontrol ettim; gönderimi onaylıyorum.'
            }
            sx={{ mb: 1, alignItems: 'flex-start' }}
          />
          {!props.autoSendOutreachAfterAnalysis && (
            <FormControlLabel
              control={
                <Checkbox
                  checked={props.forceOutreachResend}
                  onChange={(e) => props.setForceOutreachResend(e.target.checked)}
                />
              }
              label="Bu domain’e daha önce mail atıldıysa yine de gönder (force)"
              sx={{ mb: 2, alignItems: 'flex-start' }}
            />
          )}

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
            <Button
              variant="outlined"
              onClick={() => {
                setOutreachApproved(false);
                void props.handleRegenerateColdEmail();
              }}
              disabled={props.loading}
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              Cold maili yeniden üret
            </Button>
            {!props.autoSendOutreachAfterAnalysis && (
              <Button
                variant="contained"
                onClick={() => setConfirmOpen(true)}
                disabled={
                  props.outreachSending ||
                  props.loading ||
                  !outreachApproved ||
                  props.selectedOutreachRecipients.length === 0 ||
                  (onlyInfoOrContactEmails(props.selectedOutreachRecipients)
                    ? !props.outreachInfoContactEmailBody.trim() &&
                      !props.outreachEmailBody.trim()
                    : !props.outreachEmailBody.trim())
                }
                sx={{ textTransform: 'none', fontWeight: 600 }}
              >
                Onayla ve gönder…
              </Button>
            )}
          </Box>

          {props.autoSendOutreachAfterAnalysis && (
            <Alert
              severity={props.outreachSendResult ? 'success' : props.outreachSending ? 'info' : 'warning'}
              sx={{ mt: 2, borderRadius: 2 }}
            >
              {props.outreachSending
                ? 'Mailler otomatik gönderiliyor…'
                : props.outreachSendResult
                  ? 'Otomatik gönderim tamamlandı. Manuel tekrar gönderim bu ayar açıkken kapalıdır.'
                  : 'Otomatik gönderim bekleniyor veya başarısız oldu. Hata varsa yukarıdaki mesaja bakın; manuel gönderim için Profilim’de ayarı kapatın.'}
            </Alert>
          )}

          {/* Deliverability Score */}
          {(props.deliverabilityScore || props.deliverabilityLoading) && (
            <DeliverabilityScore
              data={props.deliverabilityScore}
              loading={props.deliverabilityLoading}
              onRefresh={() => void props.refreshDeliverabilityScore()}
            />
          )}

          {/* Domain Already Contacted Hatası için "Yine de Gönder" Butonu */}
          {props.error && props.error.includes('daha önce mail gönderildi') && !props.outreachSending && (
            <Alert severity="warning" sx={{ mt: 2, borderRadius: 2 }}>
              <Typography variant="body2" sx={{ mb: 1.5 }}>
                {props.error}
              </Typography>
              <Button
                variant="contained"
                color="warning"
                onClick={() => {
                  props.setError(null);
                  void props.handleSendCompanyEmail({ forceResend: true });
                }}
                disabled={props.outreachSending || props.selectedOutreachRecipients.length === 0}
                sx={{ textTransform: 'none', fontWeight: 600 }}
              >
                Yine de Gönder
              </Button>
            </Alert>
          )}

          {props.selectedOutreachRecipients.length === 0 && (
            <Alert severity="warning" sx={{ mt: 2, borderRadius: 2 }}>
              Hiç alıcı seçili değil. Listeden tek tek işaretleyin.
            </Alert>
          )}

          {props.outreachSendResult && (
            <Typography variant="body2" color="success.main" sx={{ mt: 1.5 }}>
              {props.outreachSendResult}{' '}
              <Box
                component="a"
                href="/outreach-logs"
                sx={{ color: 'inherit', fontWeight: 700 }}
              >
                Logları görüntüle
              </Box>
            </Typography>
          )}

          {!props.autoSendOutreachAfterAnalysis && (
          <Dialog
            open={confirmOpen}
            onClose={() => !props.outreachSending && setConfirmOpen(false)}
            fullWidth
            maxWidth="sm"
          >
            <DialogTitle>Son onay — mailleri gönder</DialogTitle>
            <DialogContent dividers>
              <Typography variant="body2" sx={{ mb: 1.5 }}>
                Bu işlem geri alınamaz. Aşağıdaki özetle SMTP üzerinden gönderim yapılacak:
              </Typography>
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                <strong>Firma:</strong>{' '}
                {props.coverLetterCompanyName || props.companyInfo?.name || '—'}
              </Typography>
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                <strong>Domain:</strong> @{resolvedDomain || '—'}
              </Typography>
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                <strong>Alıcı adayları:</strong> {props.selectedOutreachRecipients.length}
                {props.includePrimaryEmailInSend
                  ? props.skipPrimaryEmailVerification
                    ? ' (ana adres trusted/doğrulamasız; diğerleri doğrulanır)'
                    : ' (ana adres listede ve doğrulanır)'
                  : ' (ana adres kapalı; diğerleri doğrulanır)'}
              </Typography>
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                <strong>CV PDF eki:</strong>{' '}
                {props.outreachCvAttachmentSource === 'optimized'
                  ? 'Optimize / düzenlenmiş CV'
                  : props.cvFile?.name || 'Orijinal yok'}
              </Typography>
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                <strong>Konu:</strong> {props.outreachEmailSubject || '—'}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, my: 1 }}>
                {props.selectedOutreachRecipients.map((email) => (
                  <Chip
                    key={email}
                    size="small"
                    label={email}
                    sx={{ fontFamily: 'monospace', fontSize: '0.65rem' }}
                  />
                ))}
              </Box>
              <Alert severity="warning" sx={{ my: 1, py: 0.5 }}>
                {!props.includePrimaryEmailInSend
                  ? 'Ana adres gönderime kapalı; '
                  : props.skipPrimaryEmailVerification
                    ? 'Ana adres doğrulanmadan (trusted) gider; '
                    : 'Ana adres diğerleri gibi doğrulanır; '}
                diğer adaylar doğrulanır ve geçerli olanlara mail atılır (tek sefer limiti
                dahilinde).
              </Alert>
              <Alert severity="info" sx={{ my: 1, py: 0.5 }}>
                {onlyInfoOrContactEmails(props.selectedOutreachRecipients)
                  ? 'Seçili alıcılar info@/contact@ — yalnızca yönlendirmeli cold mail gönderilir.'
                  : anyInfoOrContactEmail(props.selectedOutreachRecipients)
                    ? 'Karışık liste: info/contact adreslerine özel sürüm, diğerlerine standart cold mail.'
                    : 'Seçili alıcılara standart cold mail gönderilir.'}
              </Alert>
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                <strong>CV:</strong> {props.cvFile?.name || '—'} · skor{' '}
                {props.analysisResult?.matchScore ?? '—'}%
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  display: 'block',
                  mt: 1.5,
                  whiteSpace: 'pre-wrap',
                  maxHeight: 320,
                  overflow: 'auto',
                  p: 1.5,
                  bgcolor: colors.surfaceContainerLow,
                  borderRadius: 1,
                }}
              >
                {onlyInfoOrContactEmails(props.selectedOutreachRecipients)
                  ? props.outreachInfoContactEmailBody || props.outreachEmailBody
                  : props.outreachEmailBody}
              </Typography>
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2 }}>
              <Button
                onClick={() => setConfirmOpen(false)}
                disabled={props.outreachSending}
                sx={{ textTransform: 'none' }}
              >
                Vazgeç
              </Button>
              <Button
                variant="contained"
                color="primary"
                disabled={props.outreachSending}
                startIcon={
                  props.outreachSending ? (
                    <CircularProgress size={18} color="inherit" />
                  ) : undefined
                }
                onClick={() => {
                  void (async () => {
                    await props.handleSendCompanyEmail();
                    setConfirmOpen(false);
                  })();
                }}
                sx={{ textTransform: 'none', fontWeight: 700 }}
              >
                {props.outreachSending ? 'Gönderiliyor...' : 'Evet, gönder'}
              </Button>
            </DialogActions>
          </Dialog>
          )}
        </Box>
      )}

      {/* Footer Action — tasarım birebir */}
      <Box
        sx={{
          mt: 6,
          pt: 6,
          pb: 5,
          borderTop: `1px solid ${colors.outlineVariant}`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 3,
        }}
      >
        <Typography
          sx={{
            fontFamily: fonts.body,
            fontSize: '1rem',
            color: colors.onSurfaceVariant,
            textAlign: 'center',
            maxWidth: 448,
          }}
        >
          Harika bir iş çıkardın! Bu başvuru için her şey hazır. Yeni bir fırsat mı buldun?
        </Typography>
        <Button
          onClick={props.handlePrepareNewAnalysisSameCv}
          disabled={
            props.outreachSending ||
            (props.autoSendOutreachAfterAnalysis &&
              props.shouldSendCompanyEmail &&
              !props.outreachSendResult &&
              props.loading)
          }
          startIcon={
            props.outreachSending ? (
              <CircularProgress size={18} color="inherit" />
            ) : (
              <SyncIcon
                sx={{
                  transition: 'transform 0.5s',
                  '.MuiButton-root:hover &': { transform: 'rotate(180deg)' },
                }}
              />
            )
          }
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            px: 6,
            py: 1.5,
            bgcolor: '#ffffff',
            border: `2px solid ${colors.secondary}`,
            color: colors.secondary,
            borderRadius: 999,
            fontWeight: 600,
            fontSize: '0.875rem',
            textTransform: 'none',
            boxShadow: 3,
            transition: 'all 0.3s',
            '&:hover': {
              bgcolor: colors.secondary,
              color: colors.onSecondary,
              transform: 'scale(1.05)',
            },
            '&:active': { transform: 'scale(0.95)' },
            '&.Mui-disabled': {
              bgcolor: colors.surfaceContainerLow,
              borderColor: colors.outlineVariant,
              color: colors.onSurfaceVariant,
              boxShadow: 'none',
              opacity: 0.7,
            },
          }}
        >
          {props.outreachSending
            ? 'Mail gönderiliyor…'
            : 'Başka Bir Şirket İçin Dene'}
        </Button>
      </Box>
    </Box>
  );
}
