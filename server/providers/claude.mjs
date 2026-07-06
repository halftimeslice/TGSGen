// The ONE file to swap for a different AI provider (decided 2026-07-06).
//
// Contract every provider must implement:
//   providerName — human-readable label
//   isConfigured() — true when credentials are available
//   generate({ system, user, schema, maxTokens }) → { output, usage }
//     system: [{ text, cache }]  stable-first prompt blocks; cache marks the
//             last stable block (provider decides how/whether to cache)
//     user:   [{ type:'text', text } | { type:'image', mediaType, base64 }]
//     schema: JSON schema the reply must satisfy
//     output: the parsed object; usage: provider token/cost info (opaque)

import Anthropic from '@anthropic-ai/sdk'

const MODEL = 'claude-opus-4-8'

export const providerName = `Claude (${MODEL})`

export function isConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY)
}

let client = null
function getClient() {
  if (!client) client = new Anthropic() // reads ANTHROPIC_API_KEY
  return client
}

export async function generate({ system, user, schema, maxTokens = 32000 }) {
  const stream = getClient().messages.stream({
    model: MODEL,
    max_tokens: maxTokens,
    thinking: { type: 'adaptive' },
    system: system.map(b => ({
      type: 'text',
      text: b.text,
      ...(b.cache ? { cache_control: { type: 'ephemeral' } } : {}),
    })),
    messages: [
      {
        role: 'user',
        content: user.map(p =>
          p.type === 'image'
            ? { type: 'image', source: { type: 'base64', media_type: p.mediaType, data: p.base64 } }
            : { type: 'text', text: p.text },
        ),
      },
    ],
    output_config: { format: { type: 'json_schema', schema } },
  })

  const message = await stream.finalMessage()

  if (message.stop_reason === 'refusal') {
    throw new Error('The AI declined this request')
  }
  if (message.stop_reason === 'max_tokens') {
    throw new Error('The AI response was cut off — try again')
  }

  const textBlock = message.content.find(b => b.type === 'text')
  if (!textBlock) throw new Error('The AI returned no output')

  return { output: JSON.parse(textBlock.text), usage: message.usage }
}
