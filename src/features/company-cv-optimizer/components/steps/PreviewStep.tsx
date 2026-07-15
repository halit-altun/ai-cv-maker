'use client';

import { useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  CircularProgress,
  IconButton,
  LinearProgress,
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
import type { CompanyCvOptimizerState } from '../../types';
import { PreviewStepper } from '../shell/PreviewStepper';
import { dashboardTokens } from '@/features/dashboard/styles/dashboardTokens';

type PreviewStepProps = Pick<
  CompanyCvOptimizerState,
  | 'analysisResult'
  | 'coverLetter'
  | 'coverLetterLanguage'
  | 'coverLetterWordCount'
  | 'linkedinMessage'
  | 'linkedinMessageLanguage'
  | 'editableCVData'
  | 'isEditing'
  | 'cvLanguage'
  | 'cvFile'
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
>;

export function PreviewStep(props: PreviewStepProps) {
  const { colors, fonts, gradients } = dashboardTokens;
  const [copyCoverDone, setCopyCoverDone] = useState(false);
  const [copyLinkedinDone, setCopyLinkedinDone] = useState(false);

  const linkedinBodyForCount = props.linkedinMessage
    ? CompanyBasedCVService.stripAppendedOutreachSignature(props.linkedinMessage)
    : '';
  const linkedinBodyWordCount = linkedinBodyForCount
    ? props.getWordCount(linkedinBodyForCount)
    : 0;
  const linkedinTotalWordCount = props.linkedinMessage
    ? props.getWordCount(props.linkedinMessage)
    : 0;

  const tipKeywords =
    props.analysisResult?.positiveMatches?.slice(0, 2).map((m) => m.label) ?? [];

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
                <CompanyBasedCVPreview
                  data={props.editableCVData}
                  isEditing={props.isEditing}
                  cvLanguage={props.cvLanguage}
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

      {/* Detaylı analiz — mevcut parametreler korunur */}
      {props.analysisResult && (
        <Accordion
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
            <Typography fontWeight={600}>Detaylı Analiz Sonuçları</Typography>
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
          </AccordionDetails>
        </Accordion>
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
          startIcon={
            <SyncIcon
              sx={{
                transition: 'transform 0.5s',
                '.MuiButton-root:hover &': { transform: 'rotate(180deg)' },
              }}
            />
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
          }}
        >
          Başka Bir Şirket İçin Dene
        </Button>
      </Box>
    </Box>
  );
}
