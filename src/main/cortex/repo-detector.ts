import fs from 'fs/promises'
import path from 'path'

export interface RepoClassification {
  type: 'backend' | 'frontend' | 'data-engineering' | 'fullstack' | 'unknown'
  framework: string
  language: string
  confidence: number
  entryPoints: string[]
  signals: string[]
}

interface ScoreCard {
  score: number
  framework: string
  language: string
  entryPoints: string[]
  signals: string[]
}

async function readFileIfExists(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, 'utf-8')
  } catch {
    return null
  }
}

export async function detectRepoType(
  repoPath: string,
  fileList: string[]
): Promise<RepoClassification> {
  const feScore: ScoreCard = { score: 0, framework: '', language: '', entryPoints: [], signals: [] }
  const beScore: ScoreCard = { score: 0, framework: '', language: '', entryPoints: [], signals: [] }
  const deScore: ScoreCard = { score: 0, framework: '', language: '', entryPoints: [], signals: [] }

  const hasFile = (name: string): boolean => fileList.includes(name)
  const hasFileMatching = (pattern: RegExp): string[] =>
    fileList.filter((f) => pattern.test(f))

  // --- Node.js / JavaScript / TypeScript ---
  if (hasFile('package.json')) {
    const pkgRaw = await readFileIfExists(path.join(repoPath, 'package.json'))
    if (pkgRaw) {
      try {
        const pkg = JSON.parse(pkgRaw)
        const allDeps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) }
        const depNames = Object.keys(allDeps)

        // Frontend frameworks
        if (depNames.includes('react') || depNames.includes('react-dom')) {
          feScore.score += 0.6
          feScore.framework = depNames.includes('next') ? 'next' : 'react'
          feScore.language = 'typescript'
          feScore.signals.push('react in dependencies')
        }
        if (depNames.includes('vue')) {
          feScore.score += 0.6
          feScore.framework = depNames.includes('nuxt') ? 'nuxt' : 'vue'
          feScore.language = 'javascript'
          feScore.signals.push('vue in dependencies')
        }
        if (depNames.includes('@angular/core')) {
          feScore.score += 0.6
          feScore.framework = 'angular'
          feScore.language = 'typescript'
          feScore.signals.push('@angular/core in dependencies')
        }
        if (depNames.includes('svelte')) {
          feScore.score += 0.6
          feScore.framework = depNames.includes('@sveltejs/kit') ? 'sveltekit' : 'svelte'
          feScore.language = 'javascript'
          feScore.signals.push('svelte in dependencies')
        }

        // Backend frameworks (Node.js)
        if (depNames.includes('express')) {
          beScore.score += 0.6
          beScore.framework = 'express'
          beScore.language = 'typescript'
          beScore.signals.push('express in dependencies')
        }
        if (depNames.includes('fastify')) {
          beScore.score += 0.6
          beScore.framework = 'fastify'
          beScore.language = 'typescript'
          beScore.signals.push('fastify in dependencies')
        }
        if (depNames.includes('@nestjs/core')) {
          beScore.score += 0.7
          beScore.framework = 'nestjs'
          beScore.language = 'typescript'
          beScore.signals.push('@nestjs/core in dependencies')
        }
        if (depNames.includes('koa')) {
          beScore.score += 0.6
          beScore.framework = 'koa'
          beScore.language = 'typescript'
          beScore.signals.push('koa in dependencies')
        }
        if (depNames.includes('@hapi/hapi')) {
          beScore.score += 0.6
          beScore.framework = 'hapi'
          beScore.language = 'typescript'
          beScore.signals.push('@hapi/hapi in dependencies')
        }

        // Detect TS
        if (depNames.includes('typescript') || hasFile('tsconfig.json')) {
          if (feScore.framework) feScore.language = 'typescript'
          if (beScore.framework) beScore.language = 'typescript'
        }
      } catch {
        // Invalid JSON, skip
      }
    }
  }

  // --- Java (Maven / Gradle) ---
  if (hasFile('pom.xml')) {
    const pomRaw = await readFileIfExists(path.join(repoPath, 'pom.xml'))
    if (pomRaw && pomRaw.includes('spring-boot')) {
      beScore.score = Math.max(beScore.score, 0.8)
      beScore.framework = 'spring-boot'
      beScore.language = 'java'
      beScore.signals.push('spring-boot in pom.xml')
      beScore.entryPoints.push(
        ...hasFileMatching(/Application\.java$/).slice(0, 3)
      )
    } else {
      beScore.score = Math.max(beScore.score, 0.5)
      beScore.framework = beScore.framework || 'maven'
      beScore.language = 'java'
      beScore.signals.push('pom.xml detected')
    }
  }

  if (hasFile('build.gradle') || hasFile('build.gradle.kts')) {
    const gradleFile = hasFile('build.gradle') ? 'build.gradle' : 'build.gradle.kts'
    const gradleRaw = await readFileIfExists(path.join(repoPath, gradleFile))
    if (gradleRaw && (gradleRaw.includes('spring') || gradleRaw.includes('org.springframework'))) {
      beScore.score = Math.max(beScore.score, 0.8)
      beScore.framework = 'spring-boot'
      beScore.language = gradleFile.endsWith('.kts') ? 'kotlin' : 'java'
      beScore.signals.push('spring in build.gradle')
    } else {
      beScore.score = Math.max(beScore.score, 0.5)
      beScore.framework = beScore.framework || 'gradle'
      beScore.language = gradleFile.endsWith('.kts') ? 'kotlin' : 'java'
      beScore.signals.push(`${gradleFile} detected`)
    }
  }

  // --- Python ---
  const hasPythonDeps = hasFile('requirements.txt') || hasFile('pyproject.toml') || hasFile('setup.py')
  if (hasPythonDeps) {
    const reqRaw =
      (await readFileIfExists(path.join(repoPath, 'requirements.txt'))) ||
      (await readFileIfExists(path.join(repoPath, 'pyproject.toml'))) ||
      ''

    if (reqRaw.includes('flask')) {
      beScore.score = Math.max(beScore.score, 0.7)
      beScore.framework = 'flask'
      beScore.language = 'python'
      beScore.signals.push('flask in python deps')
    }
    if (reqRaw.includes('django')) {
      beScore.score = Math.max(beScore.score, 0.7)
      beScore.framework = 'django'
      beScore.language = 'python'
      beScore.signals.push('django in python deps')
    }
    if (reqRaw.includes('fastapi')) {
      beScore.score = Math.max(beScore.score, 0.7)
      beScore.framework = 'fastapi'
      beScore.language = 'python'
      beScore.signals.push('fastapi in python deps')
    }
    if (reqRaw.includes('airflow')) {
      deScore.score = Math.max(deScore.score, 0.8)
      deScore.framework = 'airflow'
      deScore.language = 'python'
      deScore.signals.push('airflow in python deps')
    }
  }

  // --- Go ---
  if (hasFile('go.mod')) {
    const goModRaw = await readFileIfExists(path.join(repoPath, 'go.mod'))
    if (goModRaw) {
      const goFrameworks: [string, string][] = [
        ['github.com/gin-gonic/gin', 'gin'],
        ['github.com/go-chi/chi', 'chi'],
        ['github.com/labstack/echo', 'echo'],
        ['github.com/gofiber/fiber', 'fiber']
      ]
      for (const [mod, fw] of goFrameworks) {
        if (goModRaw.includes(mod)) {
          beScore.score = Math.max(beScore.score, 0.7)
          beScore.framework = fw
          beScore.language = 'go'
          beScore.signals.push(`${fw} in go.mod`)
          break
        }
      }
      if (!beScore.framework || beScore.language !== 'go') {
        beScore.score = Math.max(beScore.score, 0.4)
        beScore.framework = beScore.framework || 'go'
        beScore.language = 'go'
        beScore.signals.push('go.mod detected')
      }
    }
  }

  // --- Data Engineering signals ---
  const dagFiles = hasFileMatching(/^dags\//)
  if (dagFiles.length > 0) {
    deScore.score = Math.max(deScore.score, 0.7)
    deScore.framework = deScore.framework || 'airflow'
    deScore.language = 'python'
    deScore.signals.push(`dags/ directory with ${dagFiles.length} files`)
    deScore.entryPoints.push(...dagFiles.slice(0, 5))
  }

  if (hasFile('dbt_project.yml')) {
    deScore.score = Math.max(deScore.score, 0.8)
    deScore.framework = 'dbt'
    deScore.language = 'sql'
    deScore.signals.push('dbt_project.yml detected')
  }

  // --- Additional FE signals ---
  const appTsx = hasFileMatching(/App\.(tsx|jsx)$/)
  if (appTsx.length > 0) {
    feScore.score = Math.max(feScore.score, feScore.score + 0.1)
    feScore.signals.push('App.tsx/App.jsx found')
    feScore.entryPoints.push(...appTsx.slice(0, 2))
  }

  // --- Entry points for BE ---
  const mainFiles = hasFileMatching(/(main|index|server|app)\.(ts|js|py|go|java)$/)
  if (mainFiles.length > 0) {
    beScore.entryPoints.push(...mainFiles.slice(0, 5))
  }

  // --- Determine winner ---
  const scores = [
    { type: 'frontend' as const, card: feScore },
    { type: 'backend' as const, card: beScore },
    { type: 'data-engineering' as const, card: deScore }
  ]

  // Check for fullstack
  if (feScore.score > 0.4 && beScore.score > 0.4) {
    return {
      type: 'fullstack',
      framework: `${feScore.framework}+${beScore.framework}`,
      language: beScore.language || feScore.language || 'unknown',
      confidence: Math.min(1, (feScore.score + beScore.score) / 2),
      entryPoints: [...feScore.entryPoints, ...beScore.entryPoints].slice(0, 5),
      signals: [...feScore.signals, ...beScore.signals]
    }
  }

  // Single type winner
  const winner = scores.reduce((best, cur) =>
    cur.card.score > best.card.score ? cur : best
  )

  if (winner.card.score === 0) {
    return {
      type: 'unknown',
      framework: 'unknown',
      language: 'unknown',
      confidence: 0,
      entryPoints: [],
      signals: ['No framework or language signals detected']
    }
  }

  return {
    type: winner.type,
    framework: winner.card.framework,
    language: winner.card.language,
    confidence: Math.min(1, winner.card.score),
    entryPoints: winner.card.entryPoints.slice(0, 5),
    signals: winner.card.signals
  }
}
