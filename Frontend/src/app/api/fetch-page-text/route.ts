import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Hedef şirket sayfasından düz metin çeker (AI analizine girdi).
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { url?: string };
    const rawUrl = String(body.url || '').trim();
    if (!rawUrl) {
      return NextResponse.json({ ok: false, message: 'url zorunlu' }, { status: 400 });
    }

    let parsed: URL;
    try {
      parsed = new URL(rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`);
    } catch {
      return NextResponse.json({ ok: false, message: 'Geçersiz URL' }, { status: 400 });
    }

    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return NextResponse.json({ ok: false, message: 'Sadece http/https' }, { status: 400 });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const response = await fetch(parsed.toString(), {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; CareerAIBot/1.0; +https://careerai.local)',
        Accept: 'text/html,application/xhtml+xml',
      },
    }).finally(() => clearTimeout(timeout));

    if (!response.ok) {
      return NextResponse.json(
        {
          ok: false,
          message: `Sayfa alınamadı (${response.status})`,
          url: parsed.toString(),
        },
        { status: 502 }
      );
    }

    const html = await response.text();
    const text = stripHtml(html).slice(0, 14000);

    return NextResponse.json({
      ok: true,
      url: parsed.toString(),
      text,
      length: text.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Fetch hatası';
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
