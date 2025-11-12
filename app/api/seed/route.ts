import { env } from '../../../lib/env'
import { supabaseAdmin } from '../../../lib/supabaseAdmin'
import { fetchCsv } from '../../../lib/fetchCsv'
import { parseCsv } from '../../../lib/csv'

function ok(data: any) { return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' }}) }

export async function POST() {
  const result:any = { items: null, assets: null, blueprints: null };

  if (env.SHEETS_ITEMS_CSV) {
    const csv = await fetchCsv(env.SHEETS_ITEMS_CSV)
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
    })
    const { error } = await supabaseAdmin.from('items').upsert(rows)
    if (error) return new Response(`Items upsert failed: ${error.message}`, { status: 500 })
    result.items = rows.length
  }

  if (env.SHEETS_ASSETS_CSV) {
    const csv = await fetchCsv(env.SHEETS_ASSETS_CSV)
    const rows = parseCsv(csv).map((r:any) => ({
      item_id: r.item_id, video_title: r.video_title, video_id: r.video_id, share_url: r.share_url, download_url: r.download_url,
      duration_seconds: r.duration_seconds, avatar_voice_id: r.avatar_voice_id, avatar_style: r.avatar_style, background: r.background,
      resolution: r.resolution, video_thumbnail: r.video_thumbnail, script_audio: r.script_audio, script_audio_original: r.script_audio_original,
      intro: r.intro, outro: r.outro, a_intro: r.a_intro, b_intro: r.b_intro, c_intro: r.c_intro, d_intro: r.d_intro, end: r.end,
      script_version: r.script_version, current_script_hash: r.current_script_hash, last_rendered_script_hash: r.last_rendered_script_hash,
      error: r.error, status: r.status, __sheet: r.__sheet, programme: r.programme, _has_vid: String(r._has_vid).toLowerCase()==='true',
      _has_share: String(r._has_share).toLowerCase()==='true', talking_photo_id: r.talking_photo_id, notes: r.notes, player_url: r.player_url
    }))
    const { error } = await supabaseAdmin.from('assets').upsert(rows)
    if (error) return new Response(`Assets upsert failed: ${error.message}`, { status: 500 })
    result.assets = rows.length
  }

  if (env.SHEETS_BLUEPRINTS_CSV) {
    const csv = await fetchCsv(env.SHEETS_BLUEPRINTS_CSV)
    const rows = parseCsv(csv).map((r:any) => ({
      programme: r.programme, grade: Number(r.grade), subject: r.subject,
      base_count: Number(r.base_count || 0), easy_count: Number(r.easy_count || 0),
      core_count: Number(r.core_count || 0), hard_count: Number(r.hard_count || 0)
    }))
    const { error } = await supabaseAdmin.from('blueprints').upsert(rows)
    if (error) return new Response(`Blueprints upsert failed: ${error.message}`, { status: 500 })
    result.blueprints = rows.length
  }

  if (!env.SHEETS_ITEMS_CSV && !env.SHEETS_ASSETS_CSV && !env.SHEETS_BLUEPRINTS_CSV) {
    return new Response('No CSV env vars set (SHEETS_ITEMS_CSV / SHEETS_ASSETS_CSV / SHEETS_BLUEPRINTS_CSV)', { status: 400 });
  }

  return ok(result)
}
