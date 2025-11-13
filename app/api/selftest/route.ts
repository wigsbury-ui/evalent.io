// app/api/selftest/route.ts
export const runtime = 'nodejs';

import PDFDocument from 'pdfkit';
import { supabase } from '@/lib/supabaseClient';
import { env } from '@/lib/env';

function ok(data: any) {
  return new Response(JSON.stringify({ ok: true, ...data }, null, 2), {
    headers: { 'Content-Type': 'application/json' },
  });
}

function fail(message: string, ctx: any = {}) {
  return new Response(
    JSON.stringify({ ok: false, error: message, context: ctx }, null, 2),
    {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    },
  );
}

export async function GET() {
  // Required server-side envs
  const required = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
  ] as const;

  const missingRequired = required.filter(
    (key) => !process.env[key as keyof NodeJS.ProcessEnv],
  );
  if (missingRequired.length) {
    return fail('Missing required envs', { missing: missingRequired });
  }

  // Optional-but-useful frontend envs; reported but not required
  const optional = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'NEXT_PUBLIC_START_PASSCODE',
  ] as const;

  async function count(name: string) {
    const { count, error } = await supabase
      .from(name)
      .select('id', { count: 'exact', head: true });
    if (error) return null;
    return count;
  }

  const [itemsV, itemsT] = await Promise.all([
    count('items_vw'),
    count('items'),
  ]);
  const [assetsV, assetsT] = await Promise.all([
    count('assets_vw'),
    count('assets'),
  ]);
  const [blueV, blueT] = await Promise.all([
    count('blueprints_vw'),
    count('blueprints'),
  ]);

  const counts = {
    items: itemsV ?? itemsT ?? 0,
    assets: assetsV ?? assetsT ?? 0,
    blueprints: blueV ?? blueT ?? 0,
  };

  if (!counts.items) {
    return fail('No items visible via views or tables', counts);
  }

  // Smoke-test PDFKit in the Node runtime
  try {
    const doc = new PDFDocument();
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));

    const done = new Promise<Buffer>((resolve) =>
      doc.on('end', () => resolve(Buffer.concat(chunks))),
    );

    doc.fontSize(14).text('Evalent Self-Test PDF');
    doc.text(`Timestamp: ${new Date().toISOString()}`);
    doc.text(`Required envs OK: ${required.join(', ')}`);
    doc.text(
      `Optional envs present: ${
        optional.filter((k) => !!process.env[k]).join(', ') || 'none'
      }`,
    );
    doc.end();

    const pdf = await done;
    if (!pdf || pdf.length < 100) {
      return fail('PDF output too small');
    }
  } catch (e: any) {
    return fail('PDF generation failed', { message: e?.message });
  }

  const videoOk = typeof env !== 'undefined';
  return ok({ counts, videoOk, useBlueprints: env.USE_BLUEPRINTS });
}
