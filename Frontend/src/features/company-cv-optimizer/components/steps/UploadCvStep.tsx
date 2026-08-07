'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControlLabel,
  IconButton,
  Switch,
  Typography,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DescriptionIcon from '@mui/icons-material/Description';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import Link from 'next/link';
import type { CompanyCvOptimizerState, RecentUploadItem } from '../../types';
import { dashboardTokens } from '@/features/dashboard/styles/dashboardTokens';
import { listCvsRequest } from '@/lib/cv/api';
import { appRoutes, getEditCvPath } from '@/features/dashboard/constants/routes';

type UploadCvStepProps = Pick<
  CompanyCvOptimizerState,
  | 'cvFile'
  | 'cvLanguage'
  | 'setCvLanguage'
  | 'includeCvPhoto'
  | 'setIncludeCvPhoto'
  | 'profilePhotoUrl'
  | 'cvRestoredFromCache'
  | 'fileInputRef'
  | 'handleFileUpload'
  | 'handleClearStoredCv'
  | 'setActiveStep'
>;

function mapSavedCvsToRecentUploads(
  records: Awaited<ReturnType<typeof listCvsRequest>>
): RecentUploadItem[] {
  return records.slice(0, 4).map((cv) => ({
    id: cv.id,
    name: cv.displayTitle || 'İsimsiz CV',
    type: 'pdf' as const,
    uploadedAt: cv.lastModifiedLabel,
    sizeLabel: `${cv.strengthPercent || 0}% güç`,
  }));
}

export function UploadCvStep({
  cvFile,
  cvLanguage,
  setCvLanguage,
  includeCvPhoto,
  setIncludeCvPhoto,
  profilePhotoUrl,
  cvRestoredFromCache,
  fileInputRef,
  handleFileUpload,
  handleClearStoredCv,
  setActiveStep,
}: UploadCvStepProps) {
  const { colors, fonts, gradients } = dashboardTokens;
  const [dragActive, setDragActive] = useState(false);
  const [recentUploads, setRecentUploads] = useState<RecentUploadItem[]>([]);
  const [recentLoading, setRecentLoading] = useState(true);
  const [recentError, setRecentError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setRecentLoading(true);
      setRecentError(null);
      try {
        const items = await listCvsRequest();
        if (cancelled) return;
        setRecentUploads(mapSavedCvsToRecentUploads(items));
      } catch (err) {
        if (cancelled) return;
        setRecentUploads([]);
        setRecentError(
          err instanceof Error ? err.message : 'Son yüklemeler alınamadı.'
        );
      } finally {
        if (!cancelled) setRecentLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      const file = e.dataTransfer.files?.[0];
      if (!file) return;
      const syntheticEvent = {
        target: { files: [file], value: '' },
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      handleFileUpload(syntheticEvent);
    },
    [handleFileUpload]
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <Box>
        <Typography
          sx={{
            fontFamily: fonts.display,
            fontSize: { xs: '1.25rem', md: '1.5rem' },
            fontWeight: 600,
            color: colors.primary,
            mb: 1,
          }}
        >
          CV&apos;nizi Güncelleyin
        </Typography>
        <Typography
          sx={{
            fontFamily: fonts.body,
            color: colors.onSurfaceVariant,
            maxWidth: 640,
          }}
        >
          Yapay zeka destekli analiz için mevcut özgeçmişinizi yükleyin. PDF formatını
          destekliyoruz.
        </Typography>
      </Box>

      {cvRestoredFromCache && cvFile && (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          Önceki oturumdan kayıtlı CV yüklendi: <strong>{cvFile.name}</strong>. Dil seçip
          hedef adımına geçebilir veya yeni PDF seçebilirsiniz.
        </Alert>
      )}

      <Box sx={{ mb: 2, maxWidth: 400 }}>
        <Typography
          sx={{ fontFamily: fonts.display, fontWeight: 600, mb: 2, color: colors.onSurface }}
        >
          CV&apos;nizin dili nedir?
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant={cvLanguage === 'turkish' ? 'contained' : 'outlined'}
            onClick={() => setCvLanguage('turkish')}
            sx={{
              minWidth: 120,
              textTransform: 'none',
              bgcolor: cvLanguage === 'turkish' ? colors.secondary : 'transparent',
              borderColor: colors.outlineVariant,
            }}
          >
            🇹🇷 Türkçe
          </Button>
          <Button
            variant={cvLanguage === 'english' ? 'contained' : 'outlined'}
            onClick={() => setCvLanguage('english')}
            sx={{
              minWidth: 120,
              textTransform: 'none',
              bgcolor: cvLanguage === 'english' ? colors.secondary : 'transparent',
              borderColor: colors.outlineVariant,
            }}
          >
            🇺🇸 English
          </Button>
        </Box>
      </Box>

      <Box sx={{ mb: 1, maxWidth: 520 }}>
        <FormControlLabel
          control={
            <Switch
              checked={includeCvPhoto && Boolean(profilePhotoUrl)}
              disabled={!profilePhotoUrl}
              onChange={(_, on) => setIncludeCvPhoto(on)}
              color="primary"
            />
          }
          label={
            <Box>
              <Typography sx={{ fontFamily: fonts.display, fontWeight: 600, color: colors.onSurface }}>
                CV&apos;ye profil fotoğrafı ekle
              </Typography>
              <Typography sx={{ fontFamily: fonts.body, fontSize: '0.85rem', color: colors.onSurfaceVariant }}>
                {profilePhotoUrl
                  ? 'Açıkken Profilim’deki fotoğraf CV’nin soluna eklenir.'
                  : 'Önce Profilim sayfasından bir profil fotoğrafı yükleyin.'}
              </Typography>
            </Box>
          }
          sx={{ alignItems: 'flex-start', ml: 0 }}
        />
      </Box>

      <Box
        onDragEnter={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragActive(false);
        }}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        sx={{
          position: 'relative',
          cursor: 'pointer',
          border: `2px dashed ${dragActive ? colors.secondary : colors.outlineVariant}`,
          borderRadius: 4,
          bgcolor: dragActive ? 'rgba(70, 72, 212, 0.04)' : colors.surfaceContainerLowest,
          p: { xs: 4, md: 6 },
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 320,
          transition: 'all 0.2s ease',
          '&:hover': {
            borderColor: colors.secondary,
            bgcolor: `${colors.secondaryFixed}1A`,
          },
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={handleFileUpload}
          style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
        />
        <Box
          sx={{
            width: 80,
            height: 80,
            mb: 3,
            borderRadius: '50%',
            bgcolor: colors.surfaceContainerLow,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: colors.secondary,
            transition: 'transform 0.2s',
            '.group:hover &': { transform: 'scale(1.1)' },
          }}
        >
          <CloudUploadIcon sx={{ fontSize: 48 }} />
        </Box>
        <Typography
          sx={{ fontFamily: fonts.display, fontSize: '1.25rem', fontWeight: 600, mb: 0.5 }}
        >
          Dosyayı buraya sürükleyin
        </Typography>
        <Typography sx={{ color: colors.onSurfaceVariant, mb: 4 }}>
          Veya dosya seçmek için{' '}
          <Box component="span" sx={{ color: colors.secondary, fontWeight: 700 }}>
            tıklayın
          </Box>
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Chip
            icon={<PictureAsPdfIcon sx={{ fontSize: 16 }} />}
            label="PDF"
            sx={{ bgcolor: colors.surfaceContainerLow, fontWeight: 600 }}
          />
          <Chip
            icon={<DescriptionIcon sx={{ fontSize: 16 }} />}
            label="DOCX"
            sx={{ bgcolor: colors.surfaceContainerLow, fontWeight: 600, opacity: 0.6 }}
          />
        </Box>
      </Box>

      {cvFile && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
          <Chip label={cvFile.name} color="primary" />
          <Chip
            label={cvLanguage === 'turkish' ? 'Türkçe CV' : 'English CV'}
            sx={{ bgcolor: colors.secondaryFixed, fontWeight: 600 }}
          />
          <Button size="small" onClick={() => setActiveStep(1)} sx={{ textTransform: 'none' }}>
            Bu CV ile devam et
          </Button>
          <Button
            size="small"
            color="inherit"
            onClick={() => void handleClearStoredCv()}
            sx={{ textTransform: 'none' }}
          >
            Kayıtlı CV&apos;yi kaldır
          </Button>
        </Box>
      )}

      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography
            sx={{
              fontSize: '0.75rem',
              fontWeight: 600,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: colors.primary,
            }}
          >
            Son Yüklemeler
          </Typography>
          <Button
            component={Link}
            href={appRoutes.myCvs}
            endIcon={<ArrowForwardIcon sx={{ fontSize: 16 }} />}
            sx={{ color: colors.secondary, textTransform: 'none', fontWeight: 600 }}
          >
            Hepsini Gör
          </Button>
        </Box>

        {recentLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        )}

        {!recentLoading && recentError && (
          <Alert severity="warning" sx={{ borderRadius: 2 }}>
            {recentError}
          </Alert>
        )}

        {!recentLoading && !recentError && recentUploads.length === 0 && (
          <Typography sx={{ color: colors.onSurfaceVariant, fontSize: '0.875rem' }}>
            Henüz kayıtlı CV yok. İlk CV&apos;nizi yükleyin veya My CVs üzerinden oluşturun.
          </Typography>
        )}

        {!recentLoading && recentUploads.length > 0 && (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
              gap: 2,
            }}
          >
            {recentUploads.map((item) => (
              <Box
                key={item.id}
                component={Link}
                href={getEditCvPath(item.id)}
                sx={{
                  p: 2,
                  bgcolor: colors.surfaceContainerLowest,
                  border: `1px solid ${colors.outlineVariant}4D`,
                  borderRadius: 3,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  textDecoration: 'none',
                  color: 'inherit',
                  transition: 'all 0.2s',
                  '&:hover': {
                    boxShadow: '0 12px 24px rgba(15,23,42,0.08)',
                    transform: 'translateY(-4px)',
                  },
                }}
              >
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor:
                      item.type === 'pdf'
                        ? 'rgba(255, 218, 214, 0.5)'
                        : 'rgba(96, 99, 238, 0.15)',
                    color: item.type === 'pdf' ? colors.error : colors.secondary,
                  }}
                >
                  {item.type === 'pdf' ? <PictureAsPdfIcon /> : <DescriptionIcon />}
                </Box>
                <Box sx={{ flex: 1, overflow: 'hidden' }}>
                  <Typography
                    sx={{ fontWeight: 600, fontSize: '0.875rem', color: colors.primary }}
                    noWrap
                  >
                    {item.name}
                  </Typography>
                  <Typography sx={{ fontSize: '0.75rem', color: colors.onSurfaceVariant }}>
                    Güncellendi: {item.uploadedAt} • {item.sizeLabel}
                  </Typography>
                </Box>
                <IconButton
                  size="small"
                  sx={{ opacity: 0.5 }}
                  onClick={(e) => e.preventDefault()}
                >
                  <MoreVertIcon fontSize="small" />
                </IconButton>
              </Box>
            ))}
          </Box>
        )}
      </Box>

      <Box
        sx={{
          mt: 2,
          p: 3,
          borderRadius: 4,
          background: gradients.aiBorder,
          backgroundImage: `linear-gradient(135deg, ${colors.secondary} 0%, ${colors.primaryContainer} 100%)`,
          color: colors.onSecondary,
          display: 'flex',
          gap: 3,
          alignItems: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            right: -80,
            top: -80,
            width: 256,
            height: 256,
            borderRadius: '50%',
            bgcolor: 'rgba(255,255,255,0.1)',
            filter: 'blur(40px)',
            pointerEvents: 'none',
          }}
        />
        <Box
          sx={{
            width: 48,
            height: 48,
            flexShrink: 0,
            bgcolor: 'rgba(255,255,255,0.2)',
            backdropFilter: 'blur(8px)',
            borderRadius: 3,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AutoAwesomeIcon />
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontFamily: fonts.display, fontWeight: 600, mb: 0.5 }}>
            Profesyonel İpucu
          </Typography>
          <Typography sx={{ fontSize: '0.875rem', opacity: 0.9 }}>
            Sürükle-bırak alanına birden fazla versiyon yükleyebilirsiniz. AI, en iyi başarı
            hikayelerinizi otomatik olarak sentezleyecektir.
          </Typography>
        </Box>
        <Button
          sx={{
            ml: 'auto',
            flexShrink: 0,
            bgcolor: colors.surfaceContainerLowest,
            color: colors.primary,
            fontWeight: 600,
            textTransform: 'none',
            px: 3,
            display: { xs: 'none', sm: 'inline-flex' },
          }}
        >
          Detaylar
        </Button>
      </Box>
    </Box>
  );
}
