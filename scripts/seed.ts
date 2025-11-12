import 'dotenv/config'
import { env } from '../lib/env'
import { supabaseAdmin } from '../lib/supabaseAdmin'
import { fetchCsv } from '../lib/fetchCsv'
import { parseCsv } from '../lib/csv'

async function upsert(table: string, rows: any[]) {
  if (!rows.length) return;
  const { error } = await supabaseAdmin.from(table).upsert(rows);
  if (error) throw error;
  console.log(`Upserted ${rows.length} into ${table}`);
}

async function seedItems() {
  if (!env.SHEETS_ITEMS_CSV) return;
  const csv = await fetchCsv(env.SHEETS_ITEMS_CSV);
  const rows = parseCsv(csv).map((r:any) => {
    const id = r.item_id || r.id;
    const yearToken = (id && String(id).includes('-')) ? String(id).split('-')[0] : (r.year || r.year_label || r.grade || 'Y7');
    const options = (() => {
      const raw = r.mcq_options_json || r.options_joined || r.options || r.mcq_options || '';
      try { if (typeof raw === 'string' && raw.trim().startsWith('[')) return JSON.parse(raw).map((x:any)=>String(x)); } catch {}
      return String(raw).split('\n').filter(Boolean).map((x:any)=>String(x));
    })();
    const correct = (r.answer_key !== undefined && r.answer_key !== null) ? String(r.answer_key) : (r.correct || r.correct_answer || null);
    return { id, year: yearToken, domain: r.domain || 'English', stem: r.display_question || r.stimulus_text || r.stem || r.text || r.prompt || '', type: (r.type || 'MCQ').toString().toLowerCase() === 'mcq' ? 'mcq' : 'short', options, correct, programme: r.programme || r.curriculum || 'UK' }
  });
  await upsert('items', rows);
}

async function seedAssets() {
  if (!env.SHEETS_ASSETS_CSV) return;
  const csv = await fetchCsv(env.SHEETS_ASSETS_CSV);
  const rows = parseCsv(csv).map((r:any) => ({
    item_id: r.item_id, video_title: r.video_title, video_id: r.video_id, share_url: r.share_url, download_url: r.download_url,
    duration_seconds: r.duration_seconds, avatar_voice_id: r.avatar_voice_id, avatar_style: r.avatar_style, background: r.background,
    resolution: r.resolution, video_thumbnail: r.video_thumbnail, script_audio: r.script_audio, script_audio_original: r.script_audio_original,
    intro: r.intro, outro: r.outro, a_intro: r.a_intro, b_intro: r.b_intro, c_intro: r.c_intro, d_intro: r.d_intro, end: r.end,
    script_version: r.script_version, current_script_hash: r.current_script_hash, last_rendered_script_hash: r.last_rendered_script_hash,
    error: r.error, status: r.status, __sheet: r.__sheet, programme: r.programme, _has_vid: String(r._has_vid).toLowerCase()==='true',
    _has_share: String(r._has_share).toLowerCase()==='true', talking_photo_id: r.talking_photo_id, notes: r.notes, player_url: r.player_url
  }));
  await upsert('assets', rows);
}

async function seedBlueprints() {
  if (!env.SHEETS_BLUEPRINTS_CSV) return;
  const csv = await fetchCsv(env.SHEETS_BLUEPRINTS_CSV);
  const rows = parseCsv(csv).map((r:any) => ({
    programme: r.programme, grade: Number(r.grade), subject: r.subject,
    base_count: Number(r.base_count || 0), easy_count: Number(r.easy_count || 0),
    core_count: Number(r.core_count || 0), hard_count: Number(r.hard_count || 0)
  }));
  await upsert('blueprints', rows);
}

async function run() {
  await seedItems();
  await seedAssets();
  await seedBlueprints();
  console.log('Seed complete.');
}

run().catch((e) => { console.error(e); process.exit(1) })
