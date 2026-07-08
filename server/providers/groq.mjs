// Groq provider (free tier) — same contract as claude.mjs / gemini.mjs.
// Groq serves open models (Llama etc.) via an OpenAI-style REST API.
// Model overridable via TGS_GROQ_MODEL in .env.
// No enforced output schema here — the schema is stated in the prompt and the
// TCAWS checker + correction loop catch anything malformed.

const MODEL = process.env.TGS_GROQ_MODEL ?? 'llama-3.3-70b-versatile'

export const providerName = `Groq (${MODEL})`

export function isConfigured() {
  return Boolean(process.env.GROQ_API_KEY)
}

export async function generate({ system, user, schema, maxTokens = 32000 }) {
  const systemText = [
    ...system.map(b => b.text),
    'You MUST reply with a single JSON object (no prose, no markdown fences) that conforms exactly to this JSON schema:',
    JSON.stringify(schema),
  ].join('\n\n---\n\n')

  const content = user.map(p =>
    p.type === 'image'
      ? { type: 'image_url', image_url: { url: `data:${p.mediaType};base64,${p.base64}` } }
      : { type: 'text', text: p.text },
  )

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemText },
        { role: 'user', content },
      ],
    }),
  })

  if (!res.ok) {
    const errBody = await res.text().catch(() => '')
    let message = `Groq error ${res.status}`
    try {
      message = JSON.parse(errBody)?.error?.message ?? message
    } catch { /* keep the status message */ }
    if (res.status === 429) message = 'Groq free-tier limit reached — wait a minute and try again'
    throw new Error(message)
  }

  const json = await res.json()
  const choice = json.choices?.[0]
  if (!choice?.message?.content) throw new Error('The AI returned no output')
  if (choice.finish_reason === 'length') throw new Error('The AI response was cut off — try again')

  return { output: JSON.parse(choice.message.content), usage: json.usage ?? null }
}
