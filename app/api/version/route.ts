
import { env } from '../../../lib/env'
export async function GET() {
  return new Response(JSON.stringify({
    name: 'evalent-pro-pack',
    version: '1.0.1',
    features: {
      csvSeed: true,
      videoAboveQuestion: true,
      blueprintSelection: env.USE_BLUEPRINTS,
      pdfReport: true
    },
    runtime: 'nodejs'
  }, null, 2), { headers: { 'Content-Type': 'application/json' }})
}
