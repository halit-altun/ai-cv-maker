'use client';

import { useState } from 'react';
import { Box, Button, Divider, IconButton, Tooltip } from '@mui/material';
import { ZoomIn, ZoomOut, Download, Share } from '@mui/icons-material';
import { pdf } from '@react-pdf/renderer';
import CVPreview from '@/components/cv-maker/CVPreview';
import PDFDocument from '@/components/cv-maker/PDFDocument';
import { dashboardTokens } from '@/features/dashboard/styles/dashboardTokens';
import { aiCvBuilderCopy } from '../../constants/copy';
import type { AiCvBuilderState } from '../../hooks/useAiCvBuilderState';

interface PreviewPanelProps {
  state: AiCvBuilderState;
}

export function PreviewPanel({ state }: PreviewPanelProps) {
  const { colors, fonts, radius } = dashboardTokens;
  const [zoom, setZoom] = useState(1);
  const [isExporting, setIsExporting] = useState(false);

  const handleExportPdf = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const blob = await pdf(
        <PDFDocument
          data={state.cvData}
          isEnglish={state.isEnglish}
          bodyFontSize={state.bodyFontSize}
          headingFontSize={state.headingFontSize}
          jobTitleFontSize={state.jobTitleFontSize}
          skillsFontSize={state.skillsFontSize}
          nameFontSize={state.nameFontSize}
          profileTitleFontSize={state.profileTitleFontSize}
          skillsStyle={state.skillsStyle}
          languagesStyle={state.languagesStyle}
        />
      ).toBlob();
      const fileName = `${state.cvData.personalInfo.firstName || 'CV'}_${state.cvData.personalInfo.lastName || 'Resume'}.pdf`;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('PDF export error:', error);
      alert('PDF oluşturulurken bir hata oluştu.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Box
      component="section"
      sx={{
        flex: 1,
        bgcolor: colors.surfaceContainerLow,
        p: 3,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        overflowY: 'auto',
        height: { xs: 'auto', lg: 'calc(100vh - 64px)' },
        minHeight: { xs: 480, lg: 'auto' },
        '&::-webkit-scrollbar': { width: 6 },
        '&::-webkit-scrollbar-thumb': {
          bgcolor: '#E2E8F0',
          borderRadius: 10,
        },
      }}
    >
      <Box
        sx={{
          width: '100%',
          maxWidth: 850,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 5,
          pb: 8,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            bgcolor: '#fff',
            p: 1,
            borderRadius: radius.full,
            boxShadow: '0 8px 24px rgba(15,23,42,0.12)',
            border: `1px solid ${colors.outlineVariant}`,
            position: 'sticky',
            top: 0,
            zIndex: 10,
            mb: 2,
          }}
        >
          <Tooltip title={aiCvBuilderCopy.zoomIn}>
            <IconButton
              onClick={() => setZoom((z) => Math.min(1.4, z + 0.1))}
              sx={{ width: 40, height: 40 }}
            >
              <ZoomIn />
            </IconButton>
          </Tooltip>
          <Tooltip title={aiCvBuilderCopy.zoomOut}>
            <IconButton
              onClick={() => setZoom((z) => Math.max(0.7, z - 0.1))}
              sx={{ width: 40, height: 40 }}
            >
              <ZoomOut />
            </IconButton>
          </Tooltip>
          <Divider
            orientation="vertical"
            flexItem
            sx={{ mx: 0.5, height: 24, alignSelf: 'center' }}
          />
          <Button
            startIcon={<Download sx={{ fontSize: 18 }} />}
            onClick={handleExportPdf}
            disabled={isExporting}
            sx={{
              px: 2,
              height: 40,
              borderRadius: radius.full,
              bgcolor: colors.primary,
              color: colors.onPrimary,
              fontFamily: fonts.body,
              fontSize: 14,
              fontWeight: 600,
              textTransform: 'none',
              '&:hover': { bgcolor: colors.primary, opacity: 0.9 },
            }}
          >
            {isExporting ? '...' : aiCvBuilderCopy.exportPdf}
          </Button>
          <Button
            startIcon={<Share sx={{ fontSize: 18 }} />}
            sx={{
              px: 2,
              height: 40,
              borderRadius: radius.full,
              border: `1px solid ${colors.outlineVariant}`,
              fontFamily: fonts.body,
              fontSize: 14,
              fontWeight: 600,
              textTransform: 'none',
              color: colors.onSurface,
              '&:hover': { bgcolor: colors.surfaceContainerLow },
            }}
          >
            {aiCvBuilderCopy.share}
          </Button>
        </Box>

        <Box
          sx={{
            width: '100%',
            transform: `scale(${zoom})`,
            transformOrigin: 'top center',
            transition: 'transform 0.2s',
          }}
        >
          <CVPreview
            data={state.cvData}
            isEnglish={state.isEnglish}
            hideChrome
            bodyFontSize={state.bodyFontSize}
            headingFontSize={state.headingFontSize}
            jobTitleFontSize={state.jobTitleFontSize}
            skillsFontSize={state.skillsFontSize}
            nameFontSize={state.nameFontSize}
            profileTitleFontSize={state.profileTitleFontSize}
            skillsStyle={state.skillsStyle}
            languagesStyle={state.languagesStyle}
          />
        </Box>
      </Box>
    </Box>
  );
}
