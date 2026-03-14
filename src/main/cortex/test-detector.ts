export interface TestStats {
  testFiles: string[]
  testCount: number
  frameworks: string[]
  filesCovered: string[]       // source files that have a matching test
  filesUncovered: string[]     // source files with no matching test
  fileCoveragePercent: number  // filesCovered.length / total source files * 100
}

/** Patterns that identify test files */
const TEST_FILE_PATTERNS: RegExp[] = [
  /\*Test\.java$/,
  /\*Tests\.java$/,
  /\*IT\.java$/,
  /\.test\.ts$/,
  /\.test\.tsx$/,
  /\.spec\.ts$/,
  /\.spec\.tsx$/,
  /test_.*\.py$/,
  /.*_test\.py$/,
  /.*_test\.go$/
]

/** Glob-style basename patterns converted to string checks */
function isTestFile(filePath: string): boolean {
  const basename = filePath.split('/').pop() ?? filePath
  // Java: *Test.java, *Tests.java, *IT.java
  if (basename.endsWith('Test.java') || basename.endsWith('Tests.java') || basename.endsWith('IT.java')) return true
  // TS/JS: *.test.ts, *.test.tsx, *.spec.ts, *.spec.tsx
  if (
    basename.endsWith('.test.ts') ||
    basename.endsWith('.test.tsx') ||
    basename.endsWith('.spec.ts') ||
    basename.endsWith('.spec.tsx') ||
    basename.endsWith('.test.js') ||
    basename.endsWith('.test.jsx') ||
    basename.endsWith('.spec.js') ||
    basename.endsWith('.spec.jsx')
  )
    return true
  // Python: test_*.py, *_test.py
  if ((basename.startsWith('test_') || basename.endsWith('_test.py')) && basename.endsWith('.py')) return true
  // Go: *_test.go
  if (basename.endsWith('_test.go')) return true
  return false
}

/** Non-source files to exclude from "source files" set */
function isSourceFile(filePath: string): boolean {
  const basename = filePath.split('/').pop() ?? filePath
  // Exclude test files themselves
  if (isTestFile(filePath)) return false
  // Exclude config, build, and lock files
  const excludedExts = [
    '.json', '.yaml', '.yml', '.toml', '.ini', '.cfg', '.env',
    '.md', '.mdx', '.txt', '.lock', '.min.js', '.d.ts', '.map',
    '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico',
    '.woff', '.woff2', '.ttf', '.eot',
    '.zip', '.tar', '.gz', '.jar', '.war', '.class',
    '.pyc', '.pyo', '.so', '.dll', '.exe', '.pdf'
  ]
  for (const ext of excludedExts) {
    if (basename.endsWith(ext)) return false
  }
  // Exclude known non-source filenames
  const lc = basename.toLowerCase()
  if (
    lc === 'dockerfile' ||
    lc.startsWith('dockerfile.') ||
    lc === 'makefile' ||
    lc === '.gitignore' ||
    lc === '.dockerignore'
  )
    return false
  // Exclude config dirs
  const excludedDirs = [
    'node_modules/', '.git/', 'dist/', 'build/', 'out/', '.next/',
    '__pycache__/', '.tox/', '.venv/', 'venv/', '.mypy_cache/'
  ]
  for (const dir of excludedDirs) {
    if (filePath.includes(dir)) return false
  }
  // Only keep recognized source extensions
  const sourceExts = [
    '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
    '.java', '.py', '.go', '.rs', '.rb', '.php',
    '.cs', '.cpp', '.c', '.h', '.hpp',
    '.swift', '.kt', '.kts', '.scala',
    '.sql', '.sh', '.bash', '.zsh',
    '.html', '.htm', '.css', '.scss', '.less',
    '.graphql', '.gql', '.proto',
    '.r', '.lua', '.dart', '.vue', '.svelte'
  ]
  const ext = (basename.match(/(\.[^.]+)+$/) ?? [])[0] ?? ''
  return sourceExts.some((e) => basename.endsWith(e))
}

/** Count test methods/functions in a test file's content */
function countTests(content: string): number {
  let count = 0
  // JUnit: @Test annotation on separate line before a method
  const junitMatches = content.match(/@Test\b/g)
  if (junitMatches) count += junitMatches.length
  // Jest/Vitest: it( and test( calls
  const jestIt = content.match(/\bit\s*\(/g)
  if (jestIt) count += jestIt.length
  const jestTest = content.match(/\btest\s*\(/g)
  if (jestTest) count += jestTest.length
  // pytest: def test_
  const pytestMatches = content.match(/\bdef test_\w+/g)
  if (pytestMatches) count += pytestMatches.length
  // Go testing: func Test
  const goMatches = content.match(/\bfunc Test\w+/g)
  if (goMatches) count += goMatches.length
  return count
}

/** Detect frameworks used based on content signals */
function detectFrameworks(content: string, filePath: string): string[] {
  const frameworks: string[] = []
  if (content.includes('@Test') || content.includes('import org.junit')) frameworks.push('JUnit')
  if (content.includes('describe(') || content.includes("from 'jest'") || content.includes('"jest"'))
    frameworks.push('Jest')
  if (content.includes("from 'vitest'") || content.includes('"vitest"')) frameworks.push('Vitest')
  if (content.includes('def test_') && filePath.endsWith('.py')) frameworks.push('pytest')
  if (content.includes('func Test') && filePath.endsWith('_test.go')) frameworks.push('Go testing')
  return frameworks
}

/** Derive the source file path that a test file corresponds to */
function matchSourceFile(testFilePath: string, sourceFiles: Set<string>): string | null {
  const basename = testFilePath.split('/').pop() ?? testFilePath
  const dir = testFilePath.includes('/') ? testFilePath.slice(0, testFilePath.lastIndexOf('/')) : ''

  // Java: UserServiceTest.java -> UserService.java
  if (basename.endsWith('Test.java') || basename.endsWith('Tests.java') || basename.endsWith('IT.java')) {
    const sourceName = basename
      .replace(/Tests\.java$/, '.java')
      .replace(/Test\.java$/, '.java')
      .replace(/IT\.java$/, '.java')
    // Search in full filePaths (test is often under src/test/... while source is under src/main/...)
    for (const src of sourceFiles) {
      if (src.split('/').pop() === sourceName) return src
    }
  }

  // TS/JS: user.test.ts -> user.ts, user.test.tsx -> user.tsx, etc.
  const tsMatch = basename.match(/^(.+)\.(test|spec)\.(ts|tsx|js|jsx|mjs)$/)
  if (tsMatch) {
    const sourceName = tsMatch[1]
    const ext = tsMatch[3]
    // Try same directory first
    const candidates = [
      `${dir ? dir + '/' : ''}${sourceName}.${ext}`,
      `${dir ? dir + '/' : ''}${sourceName}.ts`,
      `${dir ? dir + '/' : ''}${sourceName}.tsx`,
      `${dir ? dir + '/' : ''}${sourceName}.js`,
      `${dir ? dir + '/' : ''}${sourceName}.jsx`
    ]
    for (const candidate of candidates) {
      if (sourceFiles.has(candidate)) return candidate
    }
    // Fallback: match by basename only
    const possibleExts = [`.${ext}`, '.ts', '.tsx', '.js', '.jsx']
    for (const src of sourceFiles) {
      const srcBase = src.split('/').pop() ?? ''
      for (const e of possibleExts) {
        if (srcBase === `${sourceName}${e}`) return src
      }
    }
  }

  // Python: test_user.py -> user.py, user_test.py -> user.py
  if (basename.endsWith('.py')) {
    let sourceName: string | null = null
    if (basename.startsWith('test_')) sourceName = basename.slice('test_'.length)
    else if (basename.endsWith('_test.py')) sourceName = basename.slice(0, -'_test.py'.length) + '.py'
    if (sourceName) {
      for (const src of sourceFiles) {
        if (src.split('/').pop() === sourceName) return src
      }
    }
  }

  // Go: foo_test.go -> foo.go
  if (basename.endsWith('_test.go')) {
    const sourceName = basename.slice(0, -'_test.go'.length) + '.go'
    for (const src of sourceFiles) {
      if (src.split('/').pop() === sourceName) return src
    }
  }

  return null
}

export function detectTests(
  filePaths: string[],
  fileContents: Map<string, string>
): TestStats {
  const testFiles: string[] = []
  let testCount = 0
  const frameworkSet = new Set<string>()

  // Separate test files from source files
  const sourceFileSet = new Set<string>()
  for (const fp of filePaths) {
    if (isTestFile(fp)) {
      testFiles.push(fp)
    } else if (isSourceFile(fp)) {
      sourceFileSet.add(fp)
    }
  }

  // Analyze each test file's content
  for (const tf of testFiles) {
    const content = fileContents.get(tf)
    if (content) {
      testCount += countTests(content)
      for (const fw of detectFrameworks(content, tf)) {
        frameworkSet.add(fw)
      }
    }
  }

  // Match test files to source files
  const covered = new Set<string>()
  for (const tf of testFiles) {
    const matched = matchSourceFile(tf, sourceFileSet)
    if (matched) covered.add(matched)
  }

  const filesCovered = Array.from(covered)
  const filesUncovered = Array.from(sourceFileSet).filter((f) => !covered.has(f))
  const total = sourceFileSet.size
  const fileCoveragePercent = total > 0 ? Math.round((filesCovered.length / total) * 100 * 10) / 10 : 0

  return {
    testFiles,
    testCount,
    frameworks: Array.from(frameworkSet),
    filesCovered,
    filesUncovered,
    fileCoveragePercent
  }
}
