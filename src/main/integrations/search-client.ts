import { spawn } from 'node:child_process'
import { chromium } from 'playwright'

export interface SearchResult {
  title: string
  url: string
  snippet: string
}

export interface SearchResponse {
  results: SearchResult[]
  skipped: boolean
  reason: 'error' | null
  strategy: 'gemini' | 'playwright' | null
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
  if (!match) {
    throw new Error('No JSON array found in Gemini output')
  }

  const parsed = JSON.parse(match[0]) as Array<Record<string, unknown>>
  const results: SearchResult[] = parsed
    .filter((item) => typeof item.url === 'string' && item.url.length > 0)
    .map((item) => ({
      title: typeof item.title === 'string' ? item.title : '',
      url: item.url as string,
      snippet: typeof item.snippet === 'string' ? item.snippet : ''
    }))
    .slice(0, 5)

  if (results.length === 0) {
    throw new Error('Gemini returned no usable results')
  }

  return results
}

async function searchViaPlaywright(query: string): Promise<SearchResult[]> {
  const browser = await chromium.launch({ headless: true })
  try {
    const page = await browser.newPage()
    await page.goto(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
      timeout: 20_000
    })
    await page.waitForSelector('div.result', { timeout: 20_000 })

    const results = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('div.result:not(.result--ad)'))
        .slice(0, 5)
        .map((el) => ({
          title: el.querySelector('.result__title a')?.textContent?.trim() ?? '',
          url:
            el.querySelector('.result__url')?.textContent?.trim() ??
            (el.querySelector('.result__title a') as HTMLAnchorElement | null)?.href ??
            '',
          snippet: el.querySelector('.result__snippet')?.textContent?.trim() ?? ''
        }))
    })

    return results.filter((r) => r.url.length > 0)
  } finally {
    await browser.close()
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
        // fall through to Playwright
      }
    }
    const results = await searchViaPlaywright(query)
    return { results, skipped: false, reason: null, strategy: 'playwright' }
  } catch {
    return { results: [], skipped: true, reason: 'error', strategy: null }
  }
}
