'use client';

import { Box } from '@mui/material';
import type { AiCvBuilderState } from '../../hooks/useAiCvBuilderState';
import { ResumeFormPanel } from '../form/ResumeFormPanel';
import { PreviewPanel } from '../preview/PreviewPanel';
import { AiWritingAssistantFab } from '../assistant/AiWritingAssistantFab';

interface EditorWorkspaceProps {
  state: AiCvBuilderState;
}

/** Sol form + sağ önizleme — new/edit ortak workspace */
export function EditorWorkspace({ state }: EditorWorkspaceProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', lg: 'row' },
        width: '100%',
        minHeight: { lg: 'calc(100vh - 64px)' },
      }}
    >
      <ResumeFormPanel state={state} />
      <PreviewPanel state={state} />
      <AiWritingAssistantFab />
    </Box>
  );
}
