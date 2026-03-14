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

export interface JavaParseResult {
  entities: CodeEntity[]
  routes: RouteInfo[]
}

/** Strip single-line and multi-line Java comments */
function stripComments(content: string): string {
  // Remove multi-line comments
  let stripped = content.replace(/\/\*[\s\S]*?\*\//g, (match) => {
    // Preserve line count by replacing with newlines
    return match.replace(/[^\n]/g, '')
  })
  // Remove single-line comments
  stripped = stripped.replace(/\/\/.*$/gm, '')
  return stripped
}

function buildEntityId(filePath: string, name: string, line: number): string {
  return `${filePath}:${name}:${line}`
}

const MAPPING_ANNOTATIONS: Record<string, RouteInfo['method']> = {
  GetMapping: 'GET',
  PostMapping: 'POST',
  PutMapping: 'PUT',
  DeleteMapping: 'DELETE',
  PatchMapping: 'PATCH'
}

export function parseJavaFile(content: string, filePath: string): JavaParseResult {
  const entities: CodeEntity[] = []
  const routes: RouteInfo[] = []

  const stripped = stripComments(content)
  const lines = stripped.split('\n')

  // Detect controller and base path
  let isController = false
  let controllerName = ''
  let basePath = ''

  // Check for @RestController or @Controller
  if (/@(RestController|Controller)\b/.test(stripped)) {
    isController = true
  }

  // Extract @RequestMapping base path on class
  const basePathMatch = stripped.match(/@RequestMapping\(\s*(?:value\s*=\s*)?["']([^"']+)["']/)
  if (basePathMatch) {
    basePath = basePathMatch[1]
  }

  // Extract class declarations
  const classRegex = /^(\s*)(public\s+)?(abstract\s+)?(class|interface|enum)\s+(\w+)/
  let currentClassId: string | null = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const lineNum = i + 1

    // Class declaration
    const classMatch = line.match(classRegex)
    if (classMatch) {
      const className = classMatch[5]
      controllerName = className

      let kind: CodeEntity['kind'] = 'class'
      const decorators: string[] = []

      // Gather decorators from preceding lines
      for (let j = i - 1; j >= 0 && j >= i - 10; j--) {
        const prevLine = lines[j].trim()
        if (prevLine.startsWith('@')) {
          const decMatch = prevLine.match(/@(\w+)/)
          if (decMatch) decorators.push(decMatch[1])
        } else if (prevLine.length > 0) {
          break
        }
      }

      if (decorators.includes('RestController') || decorators.includes('Controller')) {
        kind = 'controller'
      } else if (decorators.includes('Service')) {
        kind = 'service'
      } else if (decorators.includes('Repository')) {
        kind = 'repository'
      }

      // Find end line (matching closing brace)
      let braceCount = 0
      let endLine = lineNum
      for (let j = i; j < lines.length; j++) {
        for (const ch of lines[j]) {
          if (ch === '{') braceCount++
          if (ch === '}') braceCount--
        }
        if (braceCount <= 0 && j > i) {
          endLine = j + 1
          break
        }
      }
      if (endLine === lineNum) endLine = lines.length

      const entityId = buildEntityId(filePath, className, lineNum)
      currentClassId = entityId

      entities.push({
        id: entityId,
        name: className,
        kind,
        filePath,
        line: lineNum,
        endLine,
        decorators,
        parameters: [],
        returnType: '',
        summary: '',
        parentId: null
      })
    }

    // Method declarations
    const methodRegex =
      /^\s*(public|private|protected)\s+(static\s+)?([\w<>\[\]?,\s]+)\s+(\w+)\s*\(([^)]*)\)/
    const methodMatch = line.match(methodRegex)
    if (methodMatch && currentClassId) {
      const returnType = methodMatch[3].trim()
      const methodName = methodMatch[4]
      const paramsStr = methodMatch[5]

      // Skip if it looks like a class declaration
      if (['class', 'interface', 'enum'].includes(returnType)) continue

      const decorators: string[] = []
      // Gather decorators from preceding lines
      for (let j = i - 1; j >= 0 && j >= i - 10; j--) {
        const prevLine = lines[j].trim()
        if (prevLine.startsWith('@')) {
          const decMatch = prevLine.match(/@(\w+)/)
          if (decMatch) decorators.push(decMatch[1])
        } else if (prevLine.length > 0) {
          break
        }
      }

      // Parse parameters
      const parameters: { name: string; type: string }[] = []
      if (paramsStr.trim()) {
        const params = paramsStr.split(',')
        for (const p of params) {
          const parts = p.trim().split(/\s+/)
          // Filter out annotations
          const nonAnnotation = parts.filter((pt) => !pt.startsWith('@'))
          if (nonAnnotation.length >= 2) {
            parameters.push({
              type: nonAnnotation.slice(0, -1).join(' '),
              name: nonAnnotation[nonAnnotation.length - 1]
            })
          }
        }
      }

      const entityId = buildEntityId(filePath, methodName, lineNum)
      entities.push({
        id: entityId,
        name: methodName,
        kind: 'method',
        filePath,
        line: lineNum,
        endLine: lineNum, // Approximation for regex parser
        decorators,
        parameters,
        returnType,
        summary: '',
        parentId: currentClassId
      })

      // Check for route mapping decorators
      if (isController) {
        for (const dec of decorators) {
          const httpMethod = MAPPING_ANNOTATIONS[dec]
          if (httpMethod) {
            // Extract path from decorator
            let routePath = ''
            for (let j = i - 1; j >= 0 && j >= i - 5; j--) {
              const prevLine = lines[j].trim()
              const pathMatch = prevLine.match(
                new RegExp(`@${dec}\\(\\s*(?:value\\s*=\\s*)?["']([^"']+)["']`)
              )
              if (pathMatch) {
                routePath = pathMatch[1]
                break
              }
              // Handle @GetMapping without path argument
              if (new RegExp(`^@${dec}$`).test(prevLine)) {
                routePath = ''
                break
              }
            }

            const normalizedBase = basePath.startsWith('/') ? basePath : '/' + basePath
            const normalizedRoute = routePath.startsWith('/') ? routePath : '/' + routePath
            const fullPath =
              normalizedBase === '/'
                ? normalizedRoute
                : normalizedRoute === '/'
                  ? normalizedBase
                  : normalizedBase + normalizedRoute

            routes.push({
              method: httpMethod,
              path: routePath,
              handlerName: methodName,
              controllerName,
              filePath,
              line: lineNum,
              fullPath
            })
          }

          // Handle @RequestMapping on method
          if (dec === 'RequestMapping') {
            for (let j = i - 1; j >= 0 && j >= i - 5; j--) {
              const prevLine = lines[j].trim()
              const rmMatch = prevLine.match(
                /@RequestMapping\(\s*(?:value\s*=\s*)?["']([^"']+)["'](?:.*?method\s*=\s*RequestMethod\.(\w+))?/
              )
              if (rmMatch) {
                const routePath = rmMatch[1]
                const method = (rmMatch[2] as RouteInfo['method']) || 'GET'
                const normalizedBase = basePath.startsWith('/') ? basePath : '/' + basePath
                const normalizedRoute = routePath.startsWith('/') ? routePath : '/' + routePath
                const fullPath =
                  normalizedBase === '/'
                    ? normalizedRoute
                    : normalizedRoute === '/'
                      ? normalizedBase
                      : normalizedBase + normalizedRoute

                routes.push({
                  method,
                  path: routePath,
                  handlerName: methodName,
                  controllerName,
                  filePath,
                  line: lineNum,
                  fullPath
                })
                break
              }
            }
          }
        }
      }
    }
  }

  return { entities, routes }
}

export function parseJavaFiles(
  files: { path: string; content: string }[]
): JavaParseResult {
  const entities: CodeEntity[] = []
  const routes: RouteInfo[] = []

  for (const file of files) {
    const result = parseJavaFile(file.content, file.path)
    entities.push(...result.entities)
    routes.push(...result.routes)
  }

  return { entities, routes }
}
