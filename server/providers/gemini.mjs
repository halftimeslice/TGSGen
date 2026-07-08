// Google Gemini provider — same contract as claude.mjs (the swap interface):
//   providerName, isConfigured(), generate({ system, user, schema, maxTokens })
// Uses the REST API directly (no extra dependency). Free-tier friendly.
// Model is overridable via TGS_GEMINI_MODEL in .env.

const MODEL = process.env.TGS_GEMINI_MODEL ?? 'gemini-2.5-pro'

export const providerName = `Gemini (${MODEL})`

export function isConfigured() {
  return Boolean(process.env.GEMINI_API_KEY)
}

// Gemini's responseSchema is an OpenAPI subset: no additionalProperties, and
// null-unions like type:['string','null'] become nullable:true. Convert our
// provider-neutral JSON schema on the way in so tgsSchema.mjs stays the
// single source of truth.
function toGeminiSchema(node) {
  if (Array.isArray(node)) return node.map(toGeminiSchema)
  if (node === null || typeof node !== 'object') return node

  const out = {}
  for (const [key, value] of Object.entries(node)) {
    if (key === 'additionalProperties') continue
    if (key === 'type' && Array.isArray(value)) {
      const types = value.filter(t => t !== 'null')
      out.type = types[0] ?? 'string'
      if (types.length < value.length) out.nullable = true
      continue
    }
    out[key] = toGeminiSchema(value)
  }
  return out
}

export async function generate({ system, user, schema, maxTokens = 32000 }) {
  const key = process.env.GEMINI_API_KEY
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`

  const body = {
    systemInstruction: {
      parts: [{ text: system.map(b => b.text).join('\n\n---\n\n') }],
    },
    contents: [
      {
        role: 'user',
        parts: user.map(p =>
          p.type === 'image'
            ? { inlineData: { mimeType: p.mediaType, data: p.base64 } }
            : { text: p.text },
        ),
      },
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: toGeminiSchema(schema),
      maxOutputTokens: maxTokens,
    },
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const errBody = await res.text().catch(() => '')
    let message = `Gemini error ${res.status}`
    try {
      message = JSON.parse(errBody)?.error?.message ?? message
    } catch { /* keep the status message */ }
    if (res.status === 429) message = 'Gemini free-tier limit reached — wait a minute and try again'
    throw new Error(message)
  }

  const json = await res.json()
  const candidate = json.candidates?.[0]
  if (!candidate || candidate.finishReason === 'SAFETY') {
    throw new Error('The AI declined this request')
  }
  if (candidate.finishReason === 'MAX_TOKENS') {
    throw new Error('The AI response was cut off — try again')
  }

  const text = (candidate.content?.parts ?? []).map(p => p.text ?? '').join('')
  if (!text) throw new Error('The AI returned no output')

  return { output: JSON.parse(text), usage: json.usageMetadata ?? null }
}
