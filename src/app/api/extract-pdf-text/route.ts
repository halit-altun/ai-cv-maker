import { spawnSync } from 'child_process';

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

    const anyFile = fileEntry as any;
    if (typeof anyFile.arrayBuffer !== 'function') {
      return Response.json({ error: 'Invalid file entry: arrayBuffer not found' }, { status: 400 });
    }

    const arrayBuffer = await anyFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const b64 = buffer.toString('base64');

    // `pdf-parse`/`pdfjs-dist` Next dev bundling sırasında patlayabildiği için,
    // child-process içinde “gerçek Node” ortamında require ederek çalıştırıyoruz.
    const childScript = `
      const fs = require('fs');
      const { PDFParse } = require('pdf-parse');
      const b64 = fs.readFileSync(0, 'utf8').trim();
      const buf = Buffer.from(b64, 'base64');
      (async () => {
        const parser = new PDFParse({ data: buf });
        const parsed = await parser.getText({
          pageJoiner: 'page_number:page_number/total_number:total_number'
        });
        const text = (parsed && parsed.text ? parsed.text : '').toString();
        process.stdout.write(JSON.stringify({ text }));
      })().catch((err) => {
        process.stderr.write((err && err.stack) ? err.stack : String(err));
        process.exit(1);
      });
    `;

    const result = spawnSync(process.execPath, ['-e', childScript], {
      input: b64,
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024
    });

    if (result.error) {
      throw result.error;
    }
    if (result.status !== 0) {
      const stderr =
        typeof result.stderr === 'string'
          ? result.stderr
          : String((result as any).stderr ?? '');
      throw new Error(`pdf-parse child failed: ${stderr}`);
    }

    const json = (() => {
      try {
        return JSON.parse(result.stdout || '{}');
      } catch {
        return {};
      }
    })();

    const text = typeof json?.text === 'string' ? json.text : '';

    return Response.json({ text }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error('extract-pdf-text route error:', { message, stack });
    return Response.json({ error: message, stack }, { status: 500 });
  }
}

