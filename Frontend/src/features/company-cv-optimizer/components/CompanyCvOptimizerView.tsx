'use client';

import { Alert, Box } from '@mui/material';
import { useCompanyCvOptimizer } from '../hooks/useCompanyCvOptimizer';
import { OptimizerSubHeader } from './shell/OptimizerSubHeader';
import { OptimizerStepper } from './shell/OptimizerStepper';
import { OptimizerFab } from './shell/OptimizerFab';
import { UploadCvStep } from './steps/UploadCvStep';
import { JobAnalysisStep } from './steps/JobAnalysisStep';
import { PreviewStep } from './steps/PreviewStep';
import { dashboardTokens } from '@/features/dashboard/styles/dashboardTokens';

/**
 * Şirket odaklı CV Optimizer — 3 adım: Yükle → Analiz → Önizleme
 * Route: /company-based-cv-editor
 */
export function CompanyCvOptimizerView() {
  const state = useCompanyCvOptimizer();
  const { colors, contentMaxWidth } = dashboardTokens;
  const isPreview = state.activeStep === 2;
  const isWide = isPreview;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100%',
        bgcolor: '#F8FAFC',
      }}
    >
      <OptimizerSubHeader activeStep={state.activeStep} />

      <Box
        component="main"
        sx={{
          flex: 1,
          p: { xs: 2, md: 3 },
          maxWidth: isWide ? contentMaxWidth : 960,
          mx: 'auto',
          width: '100%',
        }}
      >
        {!isPreview && <OptimizerStepper activeStep={state.activeStep} />}

        {state.error && (
          <Alert
            severity="error"
            sx={{ mb: 3, borderRadius: 2 }}
            onClose={() => state.setError(null)}
          >
            {state.error}
          </Alert>
        )}

        {/* Önizleme adımı gönderim sonucunu kendi panelinde gösterir; diğer adımlarda üstte */}
        {!isPreview && state.outreachSendResult && (
          <Alert
            severity={state.outreachSendSeverity || 'success'}
            sx={{ mb: 3, borderRadius: 2 }}
          >
            {state.outreachSendResult}
          </Alert>
        )}

        {state.activeStep === 0 && <UploadCvStep {...state} />}
        {state.activeStep === 1 && <JobAnalysisStep {...state} />}
        {state.activeStep === 2 && <PreviewStep {...state} />}
      </Box>

      <OptimizerFab
        activeStep={state.activeStep}
        setActiveStep={state.setActiveStep}
        setShouldSendCompanyEmail={state.setShouldSendCompanyEmail}
        hasCvFile={Boolean(state.cvFile)}
      />
    </Box>
  );
}
