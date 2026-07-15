'use client';

import { Alert, Box } from '@mui/material';
import { useCompanyCvOptimizer } from '../hooks/useCompanyCvOptimizer';
import { OptimizerSubHeader } from './shell/OptimizerSubHeader';
import { OptimizerStepper } from './shell/OptimizerStepper';
import { OptimizerFab } from './shell/OptimizerFab';
import { UploadCvStep } from './steps/UploadCvStep';
import { JobAnalysisStep } from './steps/JobAnalysisStep';
import { OptimizationStep } from './steps/OptimizationStep';
import { PreviewStep } from './steps/PreviewStep';
import { dashboardTokens } from '@/features/dashboard/styles/dashboardTokens';

/**
 * Şirket odaklı CV Optimizer — 4 adımlı CareerAI tasarımı.
 * Route: /company-based-cv-editor
 */
export function CompanyCvOptimizerView() {
  const state = useCompanyCvOptimizer();
  const { colors, contentMaxWidth } = dashboardTokens;
  const isPreview = state.activeStep === 3;
  const isWide = state.activeStep === 2 || isPreview;

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
        {/* Preview kendi stepper’ını kullanır (HTML: Analiz/Uyarlama/Onay/Önizleme) */}
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

        {state.activeStep === 0 && <UploadCvStep {...state} />}
        {state.activeStep === 1 && <JobAnalysisStep {...state} />}
        {state.activeStep === 2 && <OptimizationStep {...state} />}
        {state.activeStep === 3 && <PreviewStep {...state} />}
      </Box>

      <OptimizerFab />
    </Box>
  );
}
