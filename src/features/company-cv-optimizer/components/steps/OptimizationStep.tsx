'use client';

import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import CancelIcon from '@mui/icons-material/Cancel';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import InfoIcon from '@mui/icons-material/Info';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import LinkIcon from '@mui/icons-material/Link';
import PsychologyIcon from '@mui/icons-material/Psychology';
import SettingsIcon from '@mui/icons-material/Settings';
import VerifiedIcon from '@mui/icons-material/Verified';
import type { CompanyCvOptimizerState } from '../../types';
import { GlassCard } from '../shell/GlassCard';
import { dashboardTokens } from '@/features/dashboard/styles/dashboardTokens';

type OptimizationStepProps = Pick<
  CompanyCvOptimizerState,
  | 'companyInfo'
  | 'aiSettings'
  | 'analysisResult'
  | 'loading'
  | 'setActiveStep'
  | 'handleAnalyzeCV'
>;

export function OptimizationStep({
  companyInfo,
  aiSettings,
  analysisResult,
  loading,
  setActiveStep,
  handleAnalyzeCV,
}: OptimizationStepProps) {
  const { colors, fonts } = dashboardTokens;
  const matchScore = analysisResult?.matchScore ?? 85;

  const strengths =
    analysisResult?.positiveMatches?.slice(0, 2).map((m) => m.label) ?? [
      'Teknik beceriler yüksek uyumlu',
      'Deneyim süresi kriterleri karşılıyor',
    ];

  const improvements =
    analysisResult?.negativeMismatches?.slice(0, 2).map((m) => m.gap || m.label) ?? [
      'Eylem odaklı kelime eksikliği',
      'Sektörel anahtar kelime optimizasyonu',
    ];

  const comparisonRows = analysisResult
    ? [
        ...(analysisResult.positiveMatches ?? []).map((item) => ({
          requirement: item.label,
          evidence: item.evidence,
          status: 'match' as const,
        })),
        ...(analysisResult.negativeMismatches ?? []).map((item) => ({
          requirement: item.label,
          evidence: item.evidence ?? item.gap,
          status: 'missing' as const,
        })),
      ]
    : [
        {
          requirement: 'React & TypeScript Uzmanlığı',
          evidence: '4 yıl boyunca büyük ölçekli SaaS projelerinde React ve TS kullanımı...',
          status: 'match' as const,
        },
        {
          requirement: 'Cloud Servisleri (AWS/Azure)',
          evidence: 'Bulut tabanlı mimariler ile çalışma deneyimi (Genel).',
          status: 'partial' as const,
        },
        {
          requirement: 'Agile/Scrum Deneyimi',
          evidence: 'CV içerisinde doğrudan kanıt bulunamadı.',
          status: 'missing' as const,
        },
      ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 2 }}>
      {companyInfo && (
        <GlassCard sx={{ p: 3 }}>
          <Typography sx={{ fontFamily: fonts.display, fontWeight: 600, mb: 1 }}>
            {companyInfo.name}
          </Typography>
          <Typography sx={{ fontSize: '0.875rem', color: colors.onSurfaceVariant, mb: 2 }}>
            {companyInfo.description}
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip label={companyInfo.industry} size="small" sx={{ bgcolor: colors.secondaryFixed }} />
            {companyInfo.values.slice(0, 3).map((value, index) => (
              <Chip key={index} label={value} variant="outlined" size="small" />
            ))}
          </Stack>
          {companyInfo.analyzedLinks && companyInfo.analyzedLinks.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Analiz Edilen Linkler:
              </Typography>
              <Stack spacing={1}>
                {companyInfo.analyzedLinks.map((link, index) => (
                  <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LinkIcon fontSize="small" sx={{ color: colors.secondary }} />
                    <Typography variant="body2">{link.description}</Typography>
                  </Box>
                ))}
              </Stack>
            </Box>
          )}
        </GlassCard>
      )}

      <GlassCard sx={{ p: 2, bgcolor: colors.surfaceContainerLow }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <SettingsIcon sx={{ color: colors.secondary, fontSize: 20 }} />
          <Typography fontWeight={600}>AI Uyarlama Ayarları</Typography>
        </Box>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {aiSettings.about && <Chip label="Hakkımda" size="small" color="success" />}
          {aiSettings.workExperience && <Chip label="İş Deneyimi" size="small" color="success" />}
          {aiSettings.skills && <Chip label="Beceriler" size="small" color="success" />}
          {!aiSettings.about && !aiSettings.workExperience && !aiSettings.skills && (
            <Chip label="Hiçbir bölüm uyarlanmayacak" size="small" color="warning" />
          )}
        </Stack>
      </GlassCard>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '5fr 7fr' },
          gap: 3,
        }}
      >
        <GlassCard sx={{ p: 3 }}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              alignItems: 'center',
              gap: 3,
            }}
          >
            <Box
              sx={{
                position: 'relative',
                width: 160,
                height: 160,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: `radial-gradient(closest-side, white 79%, transparent 80% 100%), conic-gradient(${colors.secondary} calc(${matchScore} * 1%), ${colors.outlineVariant} 0)`,
              }}
            >
              <Box sx={{ textAlign: 'center' }}>
                <Typography
                  sx={{
                    fontFamily: fonts.display,
                    fontSize: '2.25rem',
                    fontWeight: 700,
                    color: colors.primary,
                    lineHeight: 1,
                  }}
                >
                  {matchScore}
                  <Typography component="span" sx={{ fontSize: '1.25rem' }}>
                    %
                  </Typography>
                </Typography>
                <Typography
                  sx={{
                    fontSize: '0.75rem',
                    color: colors.onSurfaceVariant,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Eşleşme
                </Typography>
              </Box>
            </Box>

            <Box sx={{ flex: 1, width: '100%' }}>
              <Typography
                sx={{
                  fontWeight: 700,
                  color: colors.secondary,
                  mb: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  fontSize: '0.875rem',
                }}
              >
                <VerifiedIcon sx={{ fontSize: 18 }} /> Güçlü Yönler
              </Typography>
              <Stack spacing={0.5} sx={{ mb: 2 }}>
                {strengths.map((item, i) => (
                  <Box key={i} sx={{ display: 'flex', gap: 0.5, fontSize: '0.875rem' }}>
                    <CheckCircleIcon sx={{ fontSize: 16, color: colors.secondary, mt: 0.25 }} />
                    <span>{item}</span>
                  </Box>
                ))}
              </Stack>

              <Typography
                sx={{
                  fontWeight: 700,
                  color: colors.error,
                  mb: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  fontSize: '0.875rem',
                }}
              >
                <LightbulbIcon sx={{ fontSize: 18 }} /> Gelişim Alanları
              </Typography>
              <Stack spacing={0.5}>
                {improvements.map((item, i) => (
                  <Box key={i} sx={{ display: 'flex', gap: 0.5, fontSize: '0.875rem' }}>
                    <InfoIcon sx={{ fontSize: 16, color: colors.error, mt: 0.25 }} />
                    <span>{item}</span>
                  </Box>
                ))}
              </Stack>
            </Box>
          </Box>
        </GlassCard>

        <GlassCard sx={{ p: 3, display: 'flex', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
            <Box
              sx={{
                p: 1,
                bgcolor: `${colors.secondary}1A`,
                borderRadius: 2,
                color: colors.secondary,
              }}
            >
              <PsychologyIcon />
            </Box>
            <Box>
              <Typography sx={{ fontFamily: fonts.display, fontWeight: 600, mb: 0.5 }}>
                AI Strateji Önerisi
              </Typography>
              <Typography sx={{ color: colors.onSurfaceVariant }}>
                {analysisResult?.recommendations?.[0] ??
                  'Mevcut CV\'niz bu pozisyon için oldukça güçlü. Hedef şirketin değerleri ve ilan metnindeki anahtar kelimeleri vurgulayarak eşleşme skorunuzu artırabilirsiniz.'}
              </Typography>
            </Box>
          </Box>
        </GlassCard>
      </Box>

      <GlassCard sx={{ overflow: 'hidden' }}>
        <Box
          sx={{
            p: 3,
            borderBottom: `1px solid ${colors.outlineVariant}`,
            bgcolor: colors.surfaceContainerLowest,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Typography sx={{ fontFamily: fonts.display, fontWeight: 600 }}>
            Detaylı Karşılaştırma
          </Typography>
        </Box>
        <Box sx={{ overflowX: 'auto' }}>
          <Table>
            <TableHead sx={{ bgcolor: colors.surfaceContainerLow }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, color: colors.onSurfaceVariant }}>
                  İş Gereksinimi
                </TableCell>
                <TableCell sx={{ fontWeight: 600, color: colors.onSurfaceVariant }}>
                  CV Kanıtı
                </TableCell>
                <TableCell sx={{ fontWeight: 600, color: colors.onSurfaceVariant }}>
                  Durum
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {comparisonRows.map((row, index) => (
                <TableRow key={index} hover>
                  <TableCell>
                    <Typography fontWeight={600} fontSize="0.875rem">
                      {row.requirement}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography fontSize="0.875rem" color="text.secondary" fontStyle="italic">
                      {row.evidence}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {row.status === 'match' && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: colors.secondary, fontWeight: 700, fontSize: '0.875rem' }}>
                        <CheckCircleIcon sx={{ fontSize: 18 }} /> Tam Eşleşme
                      </Box>
                    )}
                    {row.status === 'partial' && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#23005c', fontWeight: 700, fontSize: '0.875rem' }}>
                        <InfoIcon sx={{ fontSize: 18 }} /> Geliştirilebilir
                      </Box>
                    )}
                    {row.status === 'missing' && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: colors.error, fontWeight: 700, fontSize: '0.875rem' }}>
                        <CancelIcon sx={{ fontSize: 18 }} /> Eksik Madde
                      </Box>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      </GlassCard>

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 2,
          pt: 2,
        }}
      >
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => setActiveStep(1)}
          sx={{ color: colors.onSurfaceVariant, textTransform: 'none' }}
        >
          Önceki Adıma Dön
        </Button>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            sx={{
              borderRadius: 3,
              textTransform: 'none',
              borderColor: colors.outlineVariant,
            }}
          >
            Taslağı Paylaş
          </Button>
          <Button
            variant="contained"
            onClick={() => void handleAnalyzeCV()}
            disabled={loading}
            endIcon={
              loading ? <CircularProgress size={20} color="inherit" /> : <AutoFixHighIcon />
            }
            sx={{
              px: 4,
              py: 1.5,
              borderRadius: 3,
              bgcolor: colors.secondary,
              textTransform: 'none',
              fontWeight: 600,
              boxShadow: '0 12px 24px rgba(70, 72, 212, 0.2)',
              '&:hover': { bgcolor: colors.secondaryContainer },
            }}
          >
            {loading ? 'Analiz Ediliyor...' : 'Optimizasyonu Başlat'}
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
