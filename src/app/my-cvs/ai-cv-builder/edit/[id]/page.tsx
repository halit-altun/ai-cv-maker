import { AiCvBuilderView } from '@/features/ai-cv-builder';

interface AiCvBuilderEditPageProps {
  params: Promise<{ id: string }>;
}

/** /my-cvs/ai-cv-builder/edit/[id] — mevcut CV düzenleme */
export default async function AiCvBuilderEditPage({ params }: AiCvBuilderEditPageProps) {
  const { id } = await params;
  return <AiCvBuilderView cvId={id} />;
}
