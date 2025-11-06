export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { getSupaSR } from '../../../lib/supabase';

async function fetchCsv(url: string) {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`CSV fetch ${res.status}`);
  const text = await res.text();
  const lines = text.trim().split(/\r?\n/);
  const header = lines.shift()!;
  const cols = header.split(',');
  return lines.map((line) => {
    const vals = line.split(',').map(v => v.replace(/^"|"$/g,''));
    const obj: any = {};
    cols.forEach((c, i) => obj[c.trim()] = (vals[i] ?? '').trim());
    return obj;
  });
}

export async function GET() {
  try {
    const supa = getSupaSR();
    const itemsUrl = process.env.SHEET_ITEMS_CSV_URL!;
    const assetsUrl = process.env.SHEET_ASSETS_CSV_URL!;
    const [itemsCsv, assetsCsv] = await Promise.all([fetchCsv(itemsUrl), fetchCsv(assetsUrl)]);

    const upItems = itemsCsv.map((r:any) => ({
      item_id: r.item_id,
      programme: r.programme,
      grade: r.grade,
      domain: r.domain,
      type: (r.type || r.kind || 'mcq').toLowerCase(),
      stem: r.stem || r.text_or_html,
      options: r.options_joined ? r.options_joined.split('\n') :
               (r.options ? JSON.parse(r.options) : null),
      answer: r.answer || r.correct_answer,
      metadata: {
        strand: r.strand || null,
        standard_code: r.standard_code_raw || r.standard || null
      }
    }));
    if (upItems.length) {
      await supa.from('items').upsert(upItems, { onConflict: 'item_id' });
    }

    const upAssets = assetsCsv.map((r:any) => ({
      item_id: r.item_id || null,
      video_title: r.video_title || null,
      video_url: r.Video_URL || r.video_url || null,
      share_url: r.Share_URL || r.share_url || null,
      download_url: r.Download_URL || r.download_url || null,
      thumbnail_url: r.Thumbnail_URL || r.video_thumbnail || null,
      talking_photo_id: r.talking_photo_id || null,
      avatar_id: r.avatar_id || null,
      voice_id: r.voice_id || r.avatar_voice_id || null,
      background: r.background || null,
      resolution: r.resolution || null,
      status: (r.Status || r.status || '').toLowerCase() || null,
      notes: r.Notes || r.notes || null
    }));
    if (upAssets.length) {
      await supa.from('assets').upsert(upAssets, { onConflict: 'item_id' });
    }

    return NextResponse.json({ ok: true, items: upItems.length, assets: upAssets.length });
  } catch (e:any) {
    return NextResponse.json({ ok: false, error: e.message || String(e) }, { status: 500 });
  }
}
