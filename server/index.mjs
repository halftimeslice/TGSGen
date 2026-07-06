// TGSgen helper server — holds the AI API key (never in the browser) and
// forwards generation requests. Start with: npm run server

import { createServer } from 'node:http'
import { fileURLToPath } from 'node:url'
import { buildGenerationRequest } from './pipeline.mjs'
import * as provider from './providers/claude.mjs'

// API keys live in the project .env (gitignored)
try {
  process.loadEnvFile(fileURLToPath(new URL('../.env', import.meta.url)))
} catch {
  // no .env — rely on the environment
}

const PORT = Number(process.env.TGS_SERVER_PORT ?? 8787)
const MAX_BODY_BYTES = 25 * 1024 * 1024 // room for an aerial snapshot

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on('data', c => {
      size += c.length
      if (size > MAX_BODY_BYTES) {
        reject(new Error('Request too large'))
        req.destroy()
        return
      }
      chunks.push(c)
    })
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')))
      } catch {
        reject(new Error('Invalid JSON body'))
      }
    })
    req.on('error', reject)
  })
}

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(body))
}

const server = createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && req.url === '/api/health') {
      sendJson(res, 200, { ok: true, provider: provider.providerName, keyConfigured: provider.isConfigured() })
      return
    }

    if (req.method === 'POST' && req.url === '/api/generate') {
      if (!provider.isConfigured()) {
        sendJson(res, 503, { error: 'No AI API key configured. Add ANTHROPIC_API_KEY to the project .env file.' })
        return
      }
      const job = await readJsonBody(req)
      const request = buildGenerationRequest(job)
      const { output, usage } = await provider.generate(request)
      sendJson(res, 200, { tgs: output, usage })
      return
    }

    sendJson(res, 404, { error: 'Not found' })
  } catch (err) {
    console.error(`[${new Date().toISOString()}]`, err)
    sendJson(res, 500, { error: err?.message ?? 'Server error' })
  }
})

server.listen(PORT, () => {
  console.log(`TGSgen helper server on http://localhost:${PORT}`)
  console.log(`Provider: ${provider.providerName}`)
  if (!provider.isConfigured()) {
    console.log('⚠ ANTHROPIC_API_KEY not set — /api/generate will refuse until it is added to .env')
  }
})
