'use client'
import { useState, useEffect } from 'react'
import { Loader2, Save, Video } from 'lucide-react'

export default function SiteVideosPage() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/site-video')
      .then(r => r.json())
      .then(d => { setUrl(d.url || ''); setLoading(false) })
  }, [])

  async function save() {
    setSaving(true); setSaved(false)
    await fetch('/api/admin/site-video', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'marketing_hero', url }),
    })
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center">
          <Video className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Site Videos</h1>
          <p className="text-sm text-gray-500">Control videos shown on the marketing site</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-6">
        <div className="mb-1">
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Homepage “See how it works” video
          </label>
          <p className="text-xs text-gray-400 mb-3">
            Paste a Vimeo or YouTube URL. This opens as a popup when visitors click “See how it works” on evalent.io.
          </p>
          {loading ? (
            <div className="flex items-center gap-2 text-gray-400 text-sm py-3">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading...
            </div>
          ) : (
            <input
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://vimeo.com/123456789 or https://youtu.be/abc123"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}
        </div>

        {url && (
          <div className="mt-4 rounded-xl overflow-hidden bg-gray-50 border border-gray-200">
            <div className="text-xs text-gray-400 px-3 py-2 border-b border-gray-200">Preview</div>
            <div className="aspect-video">
              <iframe
                src={url.replace('vimeo.com/', 'player.vimeo.com/video/').replace('youtu.be/', 'www.youtube.com/embed/')}
                className="w-full h-full"
                allow="autoplay; fullscreen"
                frameBorder="0"
              />
            </div>
          </div>
        )}

        <button
          onClick={save}
          disabled={saving || loading}
          className="mt-5 flex items-center gap-2 bg-brand text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-800 transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saved ? 'Saved ✓' : 'Save video URL'}
        </button>
      </div>
    </div>
  )
}
