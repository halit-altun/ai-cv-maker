import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const MAX_BYTES = 4 * 1024 * 1024;

/**
 * Tarayıcı CORS yüzünden Cloudinary fotoğrafını data URL'e çeviremezse
 * PDF export buradan alır (aynı origin).
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as { url?: string };
    const rawUrl = String(body.url || '').trim();
    if (!rawUrl) {
      return NextResponse.json({ ok: false, message: 'url zorunlu' }, { status: 400 });
    }

    let parsed: URL;
    try {
      parsed = new URL(rawUrl);
    } catch {
      return NextResponse.json({ ok: false, message: 'Geçersiz URL' }, { status: 400 });
    }

    if (parsed.protocol !== 'https:') {
      return NextResponse.json({ ok: false, message: 'Sadece https' }, { status: 400 });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const response = await fetch(parsed.toString(), {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    if (!response.ok) {
      return NextResponse.json(
        { ok: false, message: `Görsel alınamadı (${response.status})` },
        { status: 502 }
      );
    }

    const contentType = String(response.headers.get('content-type') || '')
      .split(';')[0]
      .trim()
      .toLowerCase();
    if (!contentType.startsWith('image/')) {
      return NextResponse.json({ ok: false, message: 'Yanıt görsel değil' }, { status: 400 });
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length < 32 || buffer.length > MAX_BYTES) {
      return NextResponse.json({ ok: false, message: 'Görsel boyutu geçersiz' }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      dataUrl: `data:${contentType};base64,${buffer.toString('base64')}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Görsel alınamadı';
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
