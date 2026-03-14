// Duplicated types from renderer to avoid cross-process imports
interface CodeEntity {
  id: string
  name: string
  kind:
    | 'function'
    | 'class'
    | 'method'
    | 'route'
    | 'component'
    | 'controller'
    | 'service'
    | 'repository'
    | 'middleware'
    | 'decorator'
    | 'dag'
    | 'task'
  filePath: string
  line: number
  endLine: number
  decorators: string[]
  parameters: { name: string; type: string }[]
  returnType: string
  summary: string
  parentId: string | null
}

interface RouteInfo {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'ALL'
  path: string
  handlerName: string
  controllerName: string
  filePath: string
  line: number
  fullPath: string
}

export interface PythonParseResult {
  entities: CodeEntity[]
  routes: RouteInfo[]
}

function buildEntityId(filePath: string, name: string, line: number): string {
  return `${filePath}:${name}:${line}`
}

/** Strip Python comments (lines starting with #) */
function stripComments(content: string): string {
  return content
    .split('\n')
    .map((line) => {
      // Remove inline comments but preserve strings
      // Simple approach: remove # that isn't inside quotes
      const idx = line.indexOf('#')
      if (idx === -1) return line
      // Check if # is inside a string (simple heuristic)
      const beforeHash = line.slice(0, idx)
      const singleQuotes = (beforeHash.match(/'/g) || []).length
      const doubleQuotes = (beforeHash.match(/"/g) || []).length
      if (singleQuotes % 2 === 0 && doubleQuotes % 2 === 0) {
        return line.slice(0, idx)
      }
      return line
    })
    .join('\n')
}

const FLASK_ROUTE_REGEX = /@(?:app|blueprint|bp)\.route\(\s*['"]([^'"]+)['"]\s*(?:,\s*methods\s*=\s*\[([^\]]+)\])?\s*\)/
const FASTAPI_ROUTE_REGEX = /@(?:app|router)\.(\w+)\(\s*['"]([^'"]+)['"]/
const DJANGO_PATH_REGEX = /path\(\s*['"]([^'"]+)['"]\s*,\s*(\w+)/

export function parsePythonFile(content: string, filePath: string): PythonParseResult {
  const entities: CodeEntity[] = []
  const routes: RouteInfo[] = []

  const stripped = stripComments(content)
  const lines = stripped.split('\n')

  let currentClassId: string | null = null
  let currentClassName = ''
  let currentClassIndent = -1

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const lineNum = i + 1
    const trimmed = line.trimStart()
    const indent = line.length - trimmed.length

    // Reset class context if we've left the class scope
    if (currentClassIndent >= 0 && indent <= currentClassIndent && trimmed.length > 0) {
      currentClassId = null
      currentClassName = ''
      currentClassIndent = -1
    }

    // Class declarations
    const classMatch = trimmed.match(/^class\s+(\w+)\s*[:(]/)
    if (classMatch) {
      const className = classMatch[1]
      currentClassName = className
      currentClassIndent = indent

      // Gather decorators from preceding lines
      const decorators: string[] = []
      for (let j = i - 1; j >= 0; j--) {
        const prevTrimmed = lines[j].trimStart()
        if (prevTrimmed.startsWith('@')) {
          const decMatch = prevTrimmed.match(/@(\w+)/)
          if (decMatch) decorators.push(decMatch[1])
        } else if (prevTrimmed.length > 0) {
          break
        }
      }

      // Find end line by indentation
      let endLine = lineNum
      for (let j = i + 1; j < lines.length; j++) {
        const nextTrimmed = lines[j].trimStart()
        const nextIndent = lines[j].length - nextTrimmed.length
        if (nextTrimmed.length > 0 && nextIndent <= indent) {
          endLine = j
          break
        }
        endLine = j + 1
      }

      const entityId = buildEntityId(filePath, className, lineNum)
      currentClassId = entityId

      entities.push({
        id: entityId,
        name: className,
        kind: 'class',
        filePath,
        line: lineNum,
        endLine,
        decorators,
        parameters: [],
        returnType: '',
        summary: '',
        parentId: null
      })
      continue
    }

    // Function/method declarations
    const funcMatch = trimmed.match(
      /^(?:async\s+)?def\s+(\w+)\s*\(([^)]*)\)(?:\s*->\s*(\S+))?\s*:/
    )
    if (funcMatch) {
      const funcName = funcMatch[1]
      const paramsStr = funcMatch[2]
      const returnType = funcMatch[3] || ''

      // Gather decorators
      const decorators: string[] = []
      for (let j = i - 1; j >= 0; j--) {
        const prevTrimmed = lines[j].trimStart()
        if (prevTrimmed.startsWith('@')) {
          const decMatch = prevTrimmed.match(/@(\w[\w.]*)/)
          if (decMatch) decorators.push(decMatch[1])
        } else if (prevTrimmed.length > 0) {
          break
        }
      }

      // Parse parameters
      const parameters: { name: string; type: string }[] = []
      if (paramsStr.trim()) {
        const params = paramsStr.split(',')
        for (const p of params) {
          const paramTrimmed = p.trim()
          if (paramTrimmed === 'self' || paramTrimmed === 'cls') continue
          const colonIdx = paramTrimmed.indexOf(':')
          if (colonIdx > 0) {
            let paramType = paramTrimmed.slice(colonIdx + 1).trim()
            // Remove default value
            const eqIdx = paramType.indexOf('=')
            if (eqIdx > 0) paramType = paramType.slice(0, eqIdx).trim()
            parameters.push({
              name: paramTrimmed.slice(0, colonIdx).trim(),
              type: paramType
            })
          } else {
            let paramName = paramTrimmed
            const eqIdx = paramName.indexOf('=')
            if (eqIdx > 0) paramName = paramName.slice(0, eqIdx).trim()
            if (paramName.startsWith('*') || paramName.startsWith('**')) continue
            parameters.push({ name: paramName, type: 'any' })
          }
        }
      }

      // Determine if method or function
      const isMethod = currentClassId !== null && indent > currentClassIndent

      // Find end line
      let endLine = lineNum
      for (let j = i + 1; j < lines.length; j++) {
        const nextTrimmed = lines[j].trimStart()
        const nextIndent = lines[j].length - nextTrimmed.length
        if (nextTrimmed.length > 0 && nextIndent <= indent) {
          endLine = j
          break
        }
        endLine = j + 1
      }

      const entityId = buildEntityId(filePath, funcName, lineNum)

      entities.push({
        id: entityId,
        name: funcName,
        kind: isMethod ? 'method' : 'function',
        filePath,
        line: lineNum,
        endLine,
        decorators,
        parameters,
        returnType,
        summary: '',
        parentId: isMethod ? currentClassId : null
      })

      // Check for route decorators
      for (let j = i - 1; j >= 0; j--) {
        const prevLine = lines[j].trim()

        if (!prevLine.startsWith('@')) {
          if (prevLine.length > 0) break
          continue
        }

        // Flask: @app.route('/path', methods=['GET', 'POST'])
        const flaskMatch = prevLine.match(FLASK_ROUTE_REGEX)
        if (flaskMatch) {
          const routePath = flaskMatch[1]
          const methodsStr = flaskMatch[2]
          const methods: RouteInfo['method'][] = methodsStr
            ? methodsStr
                .replace(/['"]/g, '')
                .split(',')
                .map((m) => m.trim().toUpperCase() as RouteInfo['method'])
            : ['GET']

          for (const method of methods) {
            routes.push({
              method,
              path: routePath,
              handlerName: funcName,
              controllerName: currentClassName || '',
              filePath,
              line: lineNum,
              fullPath: routePath
            })
          }
          break
        }

        // FastAPI: @app.get('/path'), @router.post('/path')
        const fastapiMatch = prevLine.match(FASTAPI_ROUTE_REGEX)
        if (fastapiMatch) {
          const methodStr = fastapiMatch[1].toUpperCase()
          const routePath = fastapiMatch[2]
          const method = (['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].includes(methodStr)
            ? methodStr
            : 'GET') as RouteInfo['method']

          routes.push({
            method,
            path: routePath,
            handlerName: funcName,
            controllerName: currentClassName || '',
            filePath,
            line: lineNum,
            fullPath: routePath
          })
          break
        }
      }
    }

    // Django URL patterns: path('url/', view_func)
    const djangoMatch = trimmed.match(DJANGO_PATH_REGEX)
    if (djangoMatch) {
      const routePath = djangoMatch[1]
      const viewFunc = djangoMatch[2]

      routes.push({
        method: 'ALL',
        path: routePath,
        handlerName: viewFunc,
        controllerName: '',
        filePath,
        line: lineNum,
        fullPath: '/' + routePath
      })
    }
  }

  return { entities, routes }
}

export function parsePythonFiles(
  files: { path: string; content: string }[]
): PythonParseResult {
  const entities: CodeEntity[] = []
  const routes: RouteInfo[] = []

  for (const file of files) {
    const result = parsePythonFile(file.content, file.path)
    entities.push(...result.entities)
    routes.push(...result.routes)
  }

  return { entities, routes }
}
