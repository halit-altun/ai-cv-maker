'use client';

import { useEffect, useRef } from 'react';
import { Box, IconButton, Tooltip } from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import LanguageIcon from '@mui/icons-material/Language';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import BoltIcon from '@mui/icons-material/Bolt';
import { dashboardTokens } from '@/features/dashboard/styles/dashboardTokens';

type OptimizerFabProps = {
  activeStep: number;
  setActiveStep: (step: number) => void;
  setShouldSendCompanyEmail: (v: boolean) => void;
  /** CV seçildikten sonra 3 kısayol görünür */
  hasCvFile: boolean;
};

function flashHighlight(el: HTMLElement | null) {
  if (!el) return;
  el.style.outline = '2px solid #6366f1';
  el.style.outlineOffset = '4px';
  window.setTimeout(() => {
    el.style.outline = '';
    el.style.outlineOffset = '';
  }, 1800);
}

/** Tüm kısayollarda aynı hiza */
function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  flashHighlight(el);
}

function focusEmailDomainField() {
  const el = document.getElementById('optimizer-email-domain');
  if (!el) return;
  const input =
    el instanceof HTMLInputElement ? el : (el.querySelector('input') as HTMLInputElement | null);
  input?.focus();
  input?.select?.();
}

const fabBaseSx = {
  width: 52,
  height: 52,
  color: '#ffffff',
  transition: 'transform 0.2s ease',
  '&:hover': { transform: 'scale(1.08)' },
} as const;

type ShortcutAction = 'target-source' | 'email-domain' | 'start-analysis';

/**
 * Sağ alt:
 * - AI Asistan (her zaman)
 * - CV seçildikten sonra 3 bağımsız kısayol (alt alta):
 *   Ana domain mail | Hedef Kaynağı Seçimi | Optimizasyonu Başlat
 */
export function OptimizerFab({
  activeStep,
  setActiveStep,
  setShouldSendCompanyEmail,
  hasCvFile,
}: OptimizerFabProps) {
  const { colors, shadows, gradients } = dashboardTokens;
  const pendingAction = useRef<ShortcutAction | null>(null);

  useEffect(() => {
    if (activeStep !== 1 || !pendingAction.current) return;
    const action = pendingAction.current;
    pendingAction.current = null;
    const t = window.setTimeout(() => {
      runShortcut(action);
    }, 120);
    return () => window.clearTimeout(t);
  }, [activeStep]);

  const runShortcut = (action: ShortcutAction) => {
    if (action === 'target-source') {
      scrollToId('optimizer-target-source');
      return;
    }
    if (action === 'email-domain') {
      setShouldSendCompanyEmail(true);
      window.setTimeout(() => {
        scrollToId('optimizer-email-domain');
        focusEmailDomainField();
      }, 80);
      return;
    }
    if (action === 'start-analysis') {
      scrollToId('optimizer-start-analysis');
    }
  };

  const goTo = (action: ShortcutAction) => {
    if (activeStep !== 1) {
      pendingAction.current = action;
      setActiveStep(1);
      return;
    }
    runShortcut(action);
  };

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 60,
        display: 'flex',
        flexDirection: 'column-reverse',
        alignItems: 'center',
        gap: 1.25,
      }}
    >
      <Tooltip title="AI Asistanına Sor" placement="left">
        <IconButton
          aria-label="AI Asistanı"
          sx={{
            ...fabBaseSx,
            background: gradients.aiFab,
            boxShadow: shadows.fab,
            '&:hover': { ...fabBaseSx['&:hover'], background: gradients.aiFab },
          }}
        >
          <SmartToyIcon sx={{ fontSize: 26 }} />
        </IconButton>
      </Tooltip>

      {hasCvFile && (
        <>
          <Tooltip title="Ana domain mail" placement="left">
            <IconButton
              aria-label="Ana domain mail alanına git"
              onClick={() => goTo('email-domain')}
              sx={{
                ...fabBaseSx,
                bgcolor: colors.secondary,
                boxShadow: '0 8px 24px rgba(70, 72, 212, 0.35)',
                '&:hover': { ...fabBaseSx['&:hover'], bgcolor: colors.secondary },
              }}
            >
              <EmailOutlinedIcon sx={{ fontSize: 24 }} />
            </IconButton>
          </Tooltip>

          <Tooltip title="Hedef Kaynağı Seçimi" placement="left">
            <IconButton
              aria-label="Hedef kaynağı seçimine git"
              onClick={() => goTo('target-source')}
              sx={{
                ...fabBaseSx,
                bgcolor: colors.primary,
                boxShadow: '0 8px 24px rgba(15, 23, 42, 0.25)',
                '&:hover': { ...fabBaseSx['&:hover'], bgcolor: colors.primary },
              }}
            >
              <LanguageIcon sx={{ fontSize: 24 }} />
            </IconButton>
          </Tooltip>

          <Tooltip title="Optimizasyonu Başlat" placement="left">
            <IconButton
              aria-label="Optimizasyonu başlat butonuna git"
              onClick={() => goTo('start-analysis')}
              sx={{
                ...fabBaseSx,
                bgcolor: '#0f766e',
                boxShadow: '0 8px 24px rgba(15, 118, 110, 0.35)',
                '&:hover': { ...fabBaseSx['&:hover'], bgcolor: '#0f766e' },
              }}
            >
              <BoltIcon sx={{ fontSize: 24 }} />
            </IconButton>
          </Tooltip>
        </>
      )}
    </Box>
  );
}
