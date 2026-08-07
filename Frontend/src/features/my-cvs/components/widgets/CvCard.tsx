'use client';

import Link from 'next/link';
import Image from 'next/image';
import {
  Box,
  Button,
  IconButton,
  Typography,
} from '@mui/material';
import {
  EditOutlined,
  DownloadOutlined,
  MoreVert,
  AutoAwesome,
} from '@mui/icons-material';
import type { SavedCvRecord } from '../../types';
import { dashboardTokens } from '@/features/dashboard/styles/dashboardTokens';
import { myCvsCopy } from '../../constants/copy';
import { CvStrengthBar } from '../common/CvStrengthBar';

interface CvCardProps {
  cv: SavedCvRecord;
  emphasizeOptimize?: boolean;
}

export function CvCard({ cv, emphasizeOptimize = false }: CvCardProps) {
  const { colors, fonts, radius } = dashboardTokens;

  return (
    <Box
      className="cv-card-group"
      sx={{
        bgcolor: colors.surfaceContainerLowest,
        border: `1px solid ${colors.outlineVariant}`,
        borderRadius: radius.lg,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        transition: 'box-shadow 0.3s',
        '&:hover': {
          boxShadow: '0 12px 32px rgba(15, 23, 42, 0.12)',
          '& .cv-preview-img': { transform: 'scale(1.05)' },
          '& .cv-hover-actions': { opacity: 1 },
        },
      }}
    >
      <Box
        sx={{
          position: 'relative',
          height: 256,
          bgcolor: colors.surfaceContainerLow,
          overflow: 'hidden',
          borderBottom: `1px solid ${colors.outlineVariant}`,
        }}
      >
        <Box
          className="cv-preview-img"
          sx={{
            position: 'relative',
            width: '100%',
            height: '100%',
            transition: 'transform 0.5s',
          }}
        >
          <Image
            src={cv.previewImageUrl}
            alt={`${cv.displayTitle} resume preview`}
            fill
            sizes="(max-width: 900px) 100vw, 33vw"
            style={{ objectFit: 'cover' }}
            unoptimized
          />
        </Box>

        <Box
          className="cv-hover-actions"
          sx={{
            position: 'absolute',
            inset: 0,
            bgcolor: 'rgba(0,0,0,0.05)',
            opacity: 0,
            transition: 'opacity 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
          }}
        >
          <IconButton
            component={Link}
            href={cv.editHref}
            aria-label={myCvsCopy.editAria}
            sx={{
              bgcolor: colors.surfaceContainerLowest,
              boxShadow: 3,
              '&:hover': { bgcolor: colors.surfaceContainerLowest, color: colors.secondary },
            }}
          >
            <EditOutlined />
          </IconButton>
          <IconButton
            aria-label={myCvsCopy.downloadAria}
            sx={{
              bgcolor: colors.surfaceContainerLowest,
              boxShadow: 3,
              '&:hover': { bgcolor: colors.surfaceContainerLowest, color: colors.secondary },
            }}
          >
            <DownloadOutlined />
          </IconButton>
        </Box>

        {cv.badge === 'recently-edited' && (
          <Box
            sx={{
              position: 'absolute',
              top: 16,
              right: 16,
              px: 2,
              py: 0.5,
              borderRadius: radius.full,
              bgcolor: 'rgba(70, 72, 212, 0.1)',
              color: colors.secondary,
              border: '1px solid rgba(70, 72, 212, 0.2)',
              backdropFilter: 'blur(8px)',
              fontFamily: fonts.body,
              fontSize: 12,
              lineHeight: '14px',
              letterSpacing: '0.02em',
              fontWeight: 500,
            }}
          >
            {myCvsCopy.recentlyEdited}
          </Box>
        )}
      </Box>

      <Box sx={{ p: 3, flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box sx={{ minWidth: 0, pr: 1 }}>
            <Typography
              component="h3"
              sx={{
                fontFamily: fonts.display,
                fontSize: 20,
                lineHeight: '28px',
                fontWeight: 600,
                color: colors.primary,
              }}
            >
              {cv.displayTitle}
            </Typography>
            <Typography
              sx={{
                fontFamily: fonts.body,
                fontSize: 12,
                lineHeight: '14px',
                letterSpacing: '0.02em',
                fontWeight: 500,
                color: colors.onSurfaceVariant,
                mt: 0.25,
              }}
            >
              {cv.lastModifiedLabel}
            </Typography>
          </Box>
          <IconButton
            aria-label={myCvsCopy.moreAria}
            size="small"
            sx={{ color: colors.onSurfaceVariant, '&:hover': { color: colors.primary } }}
          >
            <MoreVert fontSize="small" />
          </IconButton>
        </Box>

        <CvStrengthBar percent={cv.strengthPercent} />

        <Box sx={{ mt: 'auto' }}>
          <Button
            component={Link}
            href={cv.optimizeHref}
            fullWidth
            startIcon={<AutoAwesome />}
            sx={{
              py: 2,
              borderRadius: radius.md,
              bgcolor: colors.primaryContainer,
              color: colors.onPrimaryContainer,
              border: '1px solid rgba(70, 72, 212, 0.1)',
              fontFamily: fonts.body,
              fontSize: 14,
              lineHeight: '16px',
              letterSpacing: '0.01em',
              fontWeight: 600,
              textTransform: 'none',
              ...(emphasizeOptimize
                ? {
                    backgroundImage: `linear-gradient(90deg, rgba(99,102,241,0) 0%, rgba(99,102,241,0.12) 50%, rgba(99,102,241,0) 100%), linear-gradient(${colors.primaryContainer}, ${colors.primaryContainer})`,
                    backgroundSize: '200% 100%, 100% 100%',
                    animation: 'career-ai-shimmer 3s infinite linear',
                  }
                : {}),
              '&:hover': { bgcolor: colors.primaryContainer, opacity: 0.9 },
            }}
          >
            {myCvsCopy.optimizeForCompany}
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
