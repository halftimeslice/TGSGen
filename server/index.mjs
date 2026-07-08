// TGSgen helper server — holds the AI API key (never in the browser) and
// forwards generation requests. Start with: npm run server

import { createServer } from 'node:http'
import { fileURLToPath } from 'node:url'
import { buildGenerationRequest, buildCorrectionRequest } from './pipeline.mjs'
import { checkTGS } from './checker.mjs'

// API keys live in the project .env (gitignored)
try {
  process.loadEnvFile(fileURLToPath(new URL('../.env', import.meta.url)))
} catch {
  // no .env — rely on the environment
}

// Provider swap point. Explicit TGS_PROVIDER (claude | gemini | mock) wins;
// otherwise auto-pick whichever provider has a key in .env, mock as fallback.
async function pickProvider() {
  const forced = process.env.TGS_PROVIDER
  if (forced === 'mock') return import('./providers/mock.mjs')
  if (forced === 'gemini') return import('./providers/gemini.mjs')
  if (forced === 'claude') return import('./providers/claude.mjs')
  if (process.env.ANTHROPIC_API_KEY) return import('./providers/claude.mjs')
  if (process.env.GEMINI_API_KEY) return import('./providers/gemini.mjs')
  console.log('No AI key found in .env — using the mock provider')
  return import('./providers/mock.mjs')
}
const provider = await pickProvider()

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

      // Generate → check against TCAWS tables → send failures back to the AI
      // to fix → re-check. Correction rounds are capped; if the design still
      // fails, it ships with loud warnings rather than silently.
      const MAX_CORRECTION_ROUNDS = 2
      let { output, usage } = await provider.generate(buildGenerationRequest(job))
      let failures = checkTGS(output, job)
      let rounds = 0
      while (failures.length > 0 && rounds < MAX_CORRECTION_ROUNDS) {
        rounds++
        console.log(`[checker] round ${rounds}: ${failures.length} failure(s) — asking the AI to correct`)
        ;({ output, usage } = await provider.generate(buildCorrectionRequest(job, output, failures)))
        failures = checkTGS(output, job)
      }

      if (failures.length > 0) {
        output.warnings = [
          ...failures.map(f => `COMPLIANCE CHECK FAILED: ${f}`),
          ...(output.warnings ?? []),
        ]
      } else {
        output.complianceNotes = [
          rounds === 0
            ? 'Automatic TCAWS check: passed'
            : `Automatic TCAWS check: passed after ${rounds} correction round${rounds > 1 ? 's' : ''}`,
          ...(output.complianceNotes ?? []),
        ]
      }

      sendJson(res, 200, {
        tgs: output,
        usage,
        checker: { passed: failures.length === 0, correctionRounds: rounds, failures },
      })
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
