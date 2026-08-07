'use client';

import { useAiCvBuilderState } from '../hooks/useAiCvBuilderState';
import { EditorWorkspace } from './workspace/EditorWorkspace';

export interface AiCvBuilderViewProps {
  /** Varsa edit modu — dummy/DB’den CV yüklenir */
  cvId?: string;
}

/**
 * AI CV Builder — new & edit ortak view.
 * Routes: /my-cvs/ai-cv-builder/new | /my-cvs/ai-cv-builder/edit/[id]
 */
export function AiCvBuilderView({ cvId }: AiCvBuilderViewProps) {
  const state = useAiCvBuilderState(cvId);
  return <EditorWorkspace state={state} />;
}
