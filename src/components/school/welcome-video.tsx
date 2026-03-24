'use client'
import { useEffect, useState } from 'react'

function VideoModal({ url, onClose }: { url: string; onClose: () => void }) {
  const vimeoId = url.match(/vimeo\.com\/(\d+)/)?.[1]
  const embedUrl = vimeoId
    ? `https://player.vimeo.com/video/${vimeoId}?autoplay=1&badge=0&autopause=0`
    : url
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="relative w-full max-w-4xl mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-white font-semibold text-sm">Welcome to Evalent — Getting Started</p>
          <button onClick={onClose} className="text-white/70 hover:text-white text-3xl leading-none">&times;</button>
        </div>
        <div className="relative rounded-xl overflow-hidden shadow-2xl bg-black" style={{ paddingTop: '56.25%' }}>
          <iframe
            src={embedUrl}
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
            frameBorder="0"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            title="Getting Started with Evalent"
          />
        </div>
        <p className="text-white/40 text-xs text-center mt-3">
          This introduction plays once. You can find it again via the Learn more links on each page.
        </p>
      </div>
    </div>
  )
}

export function WelcomeVideo() {
  const [url, setUrl] = useState<string | null>(null)
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (localStorage.getItem('evalent_welcome_seen')) return
    fetch('/api/admin/help-videos')
      .then(r => r.ok ? r.json() : [])
      .then((videos: any[]) => {
        const v = videos.find((v: any) => v.id === 'getting_started')
        if (v?.url) {
          setUrl(v.url)
          setShow(true)
          localStorage.setItem('evalent_welcome_seen', '1')
        }
      })
      .catch(() => {})
  }, [])

  if (!show || !url) return null
  return <VideoModal url={url} onClose={() => setShow(false)} />
}
