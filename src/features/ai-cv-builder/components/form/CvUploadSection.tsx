'use client';

import { Alert, Box, Button, CircularProgress, Typography } from '@mui/material';
import { dashboardTokens } from '@/features/dashboard/styles/dashboardTokens';
import { aiCvBuilderCopy } from '../../constants/copy';

interface CvUploadSectionProps {
  selectedFile: File | null;
  isUploading: boolean;
  uploadMessage: string;
  uploadError: string;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onAnalyze: () => void;
}

export function CvUploadSection({
  selectedFile,
  isUploading,
  uploadMessage,
  uploadError,
  onFileChange,
  onAnalyze,
}: CvUploadSectionProps) {
  const { colors, fonts, radius } = dashboardTokens;

  return (
    <Box
      sx={{
        p: 2,
        borderRadius: radius.lg,
        border: `1px solid ${colors.outlineVariant}`,
        bgcolor: colors.surfaceContainerLow,
      }}
    >
      <Typography
        sx={{
          fontFamily: fonts.display,
          fontSize: 16,
          fontWeight: 600,
          mb: 0.5,
          color: colors.primary,
        }}
      >
        {aiCvBuilderCopy.uploadTitle}
      </Typography>
      <Typography
        sx={{
          fontFamily: fonts.body,
          fontSize: 14,
          color: colors.onSurfaceVariant,
          mb: 2,
        }}
      >
        {aiCvBuilderCopy.uploadHint}
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center' }}>
        <Button
          variant="outlined"
          component="label"
          disabled={isUploading}
          sx={{ textTransform: 'none', borderRadius: radius.md }}
        >
          {aiCvBuilderCopy.chooseFile}
          <input hidden type="file" accept=".pdf" onChange={onFileChange} />
        </Button>
        <Button
          variant="contained"
          onClick={onAnalyze}
          disabled={!selectedFile || isUploading}
          startIcon={isUploading ? <CircularProgress size={16} color="inherit" /> : undefined}
          sx={{
            textTransform: 'none',
            borderRadius: radius.md,
            bgcolor: colors.secondary,
            '&:hover': { bgcolor: colors.secondary, opacity: 0.9 },
          }}
        >
          {isUploading ? aiCvBuilderCopy.analyzing : aiCvBuilderCopy.analyzeAi}
        </Button>
        {selectedFile && (
          <Typography variant="body2" color="text.secondary">
            {selectedFile.name}
          </Typography>
        )}
      </Box>
      {uploadMessage && (
        <Alert severity="success" sx={{ mt: 2 }}>
          {uploadMessage}
        </Alert>
      )}
      {uploadError && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {uploadError}
        </Alert>
      )}
    </Box>
  );
}
