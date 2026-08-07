import { generateOptimizedCvPdfAttachment } from '@/lib/company-based-cv-editor/generateCvPdfAttachment';
import type { CompanyBasedCVData } from '@/lib/company-based-cv-editor/types';

export const runtime = 'nodejs';

/**
 * Backend toplu pipeline → optimize CV PDF (mevcut react-pdf yolu).
 * Auth: X-Internal-Pipeline-Secret === INTERNAL_PIPELINE_SECRET
 */
export async function POST(req: Request) {
  try {
    const expected = String(process.env.INTERNAL_PIPELINE_SECRET || '').trim();
    const provided = String(req.headers.get('x-internal-pipeline-secret') || '').trim();
    if (!expected || !provided || provided !== expected) {
      return Response.json(
        { ok: false, message: 'Yetkisiz pipeline isteği.', code: 'PIPELINE_UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const body = (await req.json().catch(() => ({}))) as {
      cvData?: CompanyBasedCVData;
      isEnglish?: boolean;
      bodyFontSize?: number;
      headingFontSize?: number;
      jobTitleFontSize?: number;
      skillsFontSize?: number;
      nameFontSize?: number;
      profileTitleFontSize?: number;
    };

    if (!body.cvData || typeof body.cvData !== 'object') {
      return Response.json(
        { ok: false, message: 'cvData zorunlu.', code: 'CV_DATA_REQUIRED' },
        { status: 400 }
      );
    }

    const pdf = await generateOptimizedCvPdfAttachment(body.cvData, {
      isEnglish: Boolean(body.isEnglish),
      bodyFontSize: body.bodyFontSize as never,
      headingFontSize: body.headingFontSize as never,
      jobTitleFontSize: body.jobTitleFontSize as never,
      skillsFontSize: body.skillsFontSize as never,
      nameFontSize: body.nameFontSize as never,
      profileTitleFontSize: body.profileTitleFontSize as never,
    });

    return Response.json({
      ok: true,
      filename: pdf.filename,
      contentBase64: pdf.contentBase64,
      contentType: pdf.contentType,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[company-based/render-pdf]', message);
    return Response.json(
      { ok: false, message, code: 'PDF_RENDER_FAILED' },
      { status: 500 }
    );
  }
}
