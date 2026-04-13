import { extractPdfTextFromBuffer } from '@/lib/server/extractPdfText';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return Response.json(
        { error: `Expected multipart/form-data but got: ${contentType || 'unknown'}` },
        { status: 400 }
      );
    }

    const formData = await req.formData();
    const fileEntry = formData.get('file');

    if (!fileEntry || typeof fileEntry === 'string') {
      return Response.json({ error: 'Missing file field (multipart/form-data)' }, { status: 400 });
    }

    const anyFile = fileEntry as Blob & { arrayBuffer?: () => Promise<ArrayBuffer> };
    if (typeof anyFile.arrayBuffer !== 'function') {
      return Response.json({ error: 'Invalid file entry: arrayBuffer not found' }, { status: 400 });
    }

    const arrayBuffer = await anyFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const text = await extractPdfTextFromBuffer(buffer);

    return Response.json({ text }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error('extract-pdf-text route error:', { message, stack });
    return Response.json({ error: message, stack }, { status: 500 });
  }
}
