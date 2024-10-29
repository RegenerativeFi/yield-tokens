import { stcelo } from './sources/stcelo'
import { moola } from './sources/moola'

export interface Env {
  YIELD_TOKENS: KVNamespace
  SUBGRAPH_API_KEY: string
}

const tokens = [
  { name: 'moola', fetchFn: moola },
  { name: 'stcelo', fetchFn: stcelo },
]

const names = tokens.map((t) => t.name)

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    // Check if the request has a path
    const url = new URL(request.url)
    const path = url.pathname.slice(1)

    if (path && names.includes(path)) {
      const token = tokens.find((t) => t.name === path)
      if (token) {
        const aprs = await token.fetchFn()
        if (aprs) {
          ctx.waitUntil(storeAprs(env.YIELD_TOKENS, aprs))
          return new Response(JSON.stringify(aprs), {
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*', // Allow CORS
            },
          })
        }
      }
      return new Response('Not found', {
        status: 404,
      })
    }

    const json = await env.YIELD_TOKENS.get('all', 'text')
    return new Response(json, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': `s-maxage=600`, // Cache for 10 minutes
        'Access-Control-Allow-Origin': '*', // Allow CORS
      },
    })
  },

  // Scheduled events are run every 10 minutes
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(fetchAndStoreAll(env.YIELD_TOKENS))
  },
}

// Fetch APRs for all tokens and store them in KV
const fetchAndStoreAll = async (store: KVNamespace) => {
  const tokensPerBatch = 20
  const totalTokens = tokens.length
  const now = Math.floor(Date.now() / 1000) // current timestamp in seconds
  const interval = 600 // 10 minutes in seconds

  // Calculate the number of 10-minute intervals since a fixed reference point (e.g., epoch time)
  const intervalsSinceEpoch = Math.floor(now / interval)
  const batchNumber =
    intervalsSinceEpoch % Math.ceil(totalTokens / tokensPerBatch)
  const offset = batchNumber * tokensPerBatch

  // Select the current batch of tokens
  const currentBatch = tokens.slice(offset, offset + tokensPerBatch)

  const responses = await Promise.allSettled(
    currentBatch.map(({ fetchFn }) => fetchFn()),
  )
  const aprs = responses
    .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
    .map((r) => r.value)
    .reduce((acc, val) => ({ ...acc, ...val }), {})
  if (Object.keys(aprs).length > 0) {
    await storeAprs(store, aprs)
  }
  return aprs
}

// Fetch APRs for a single token and store them in KV
const fetchAndStore = async (store: KVNamespace) => {
  const next = Number(await store.get('next'))
  const token = tokens[next]
  const aprs = await token.fetchFn()
  if (aprs) {
    await storeAprs(store, aprs)
  }
  return await store.put('next', String((next + 1) % tokens.length))
}

// Store APRs in KV only if they have changed, to avoid unnecessary writes
// KV is limited to 1k writes per day
const storeAprs = async (
  store: KVNamespace,
  aprs: { [key: string]: number },
) => {
  const all =
    ((await store.get('all', 'json')) as { [key: string]: number }) || {}

  let changes = false
  Object.keys(aprs).forEach((key) => {
    if (all[key] !== aprs[key]) changes = true
    all[key] = aprs[key]
  })

  if (changes) {
    await store.put('all', JSON.stringify(all))
  }
}
