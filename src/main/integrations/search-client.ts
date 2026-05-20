import { spawn } from 'node:child_process'

export interface SearchResult {
  title: string
  url: string
  snippet: string
}

export interface SearchResponse {
  results: SearchResult[]
  skipped: boolean
  reason: 'error' | null
  strategy: 'gemini' | 'fetch' | null
}

async function isGeminiAvailable(): Promise<boolean> {
  try {
    return await new Promise<boolean>((resolve) => {
      const child = spawn('which', ['gemini'], { stdio: 'ignore' })
      child.on('close', (code) => resolve(code === 0))
      child.on('error', () => resolve(false))
    })
  } catch {
    return false
  }
}

async function searchViaGemini(query: string): Promise<SearchResult[]> {
  const prompt = `Search the web for: ${query}. Return the top 5 results as a JSON array with fields: title, url, snippet. Output ONLY the JSON array, no other text.`

  const stdout = await new Promise<string>((resolve, reject) => {
    const child = spawn('gemini', ['-p', prompt])
    let output = ''
    let timedOut = false

    const timer = setTimeout(() => {
      timedOut = true
      child.kill()
      reject(new Error('Gemini CLI timed out after 30 seconds'))
    }, 30_000)

    child.stdout.on('data', (chunk: Buffer) => {
      output += chunk.toString()
    })

    child.on('close', (code) => {
      clearTimeout(timer)
      if (timedOut) return
      if (code === 0) {
        resolve(output)
      } else {
        reject(new Error(`Gemini CLI exited with code ${code}`))
      }
    })

    child.on('error', (err) => {
      clearTimeout(timer)
      reject(err)
    })
  })

  const match = stdout.match(/\[[\s\S]*\]/)
  if (!match) throw new Error('No JSON array found in Gemini output')

  const parsed = JSON.parse(match[0]) as Array<Record<string, unknown>>
  const results: SearchResult[] = parsed
    .filter((item) => typeof item.url === 'string' && item.url.length > 0)
    .map((item) => ({
      title: typeof item.title === 'string' ? item.title : '',
      url: item.url as string,
      snippet: typeof item.snippet === 'string' ? item.snippet : ''
    }))
    .slice(0, 5)

  if (results.length === 0) throw new Error('Gemini returned no usable results')
  return results
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

function parseHtmlResults(html: string): SearchResult[] {
  const results: SearchResult[] = []

  // DuckDuckGo HTML uses <div class="result"> blocks for organic results
  const blockRe = /<div class="result[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/g
  const titleRe = /<a[^>]+class="result__a"[^>]*>([\s\S]*?)<\/a>/
  const urlRe = /<a[^>]+class="result__url"[^>]*>([\s\S]*?)<\/a>/
  const snippetRe = /<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/

  let m: RegExpExecArray | null
  while ((m = blockRe.exec(html)) !== null && results.length < 5) {
    const block = m[1]
    const titleM = titleRe.exec(block)
    const urlM = urlRe.exec(block)
    const snippetM = snippetRe.exec(block)

    if (!titleM || !urlM) continue

    const url = stripHtml(urlM[1])
    if (!url) continue

    results.push({
      title: stripHtml(titleM[1]),
      url,
      snippet: snippetM ? stripHtml(snippetM[1]) : ''
    })
  }

  return results
}

async function searchViaFetch(query: string): Promise<SearchResult[]> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 20_000)

  try {
    const resp = await fetch(
      `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-US,en;q=0.9'
        },
        signal: controller.signal
      }
    )

    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)

    const html = await resp.text()
    return parseHtmlResults(html)
  } finally {
    clearTimeout(timeoutId)
  }
}

export async function webSearch(query: string): Promise<SearchResponse> {
  try {
    const geminiAvail = await isGeminiAvailable()
    if (geminiAvail) {
      try {
        const results = await searchViaGemini(query)
        if (results.length > 0) {
          return { results, skipped: false, reason: null, strategy: 'gemini' }
        }
      } catch {
        // fall through to fetch strategy
      }
    }
    const results = await searchViaFetch(query)
    return { results, skipped: false, reason: null, strategy: 'fetch' }
  } catch {
    return { results: [], skipped: true, reason: 'error', strategy: null }
  }
}
