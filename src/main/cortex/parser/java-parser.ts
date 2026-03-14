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
    | 'configuration'
    | 'aspect'
    | 'filter'
    | 'port-in'
    | 'port-out'
    | 'web-adapter'
    | 'db-adapter'
    | 'http-adapter'
    | 'error-handler'
    | 'client-impl'
    | 'shared'
  filePath: string
  line: number
  endLine: number
  decorators: string[]
  parameters: { name: string; type: string }[]
  returnType: string
  summary: string
  parentId: string | null
}

interface CallEdge {
  id: string
  callerId: string
  calleeId: string
  filePath: string
  line: number
  type: 'inject' | 'call'
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
  callEdges: CallEdge[]
  architecture: JavaArchitecture
}

type JavaArchitecture = 'hexagonal' | 'domain' | 'layered'

function detectJavaArchitecture(filePaths: string[]): JavaArchitecture {
  const hasAdapters = filePaths.some(f => /\/adapters\//.test(f))
  const hasPorts = filePaths.some(f => /\/port\/(in|out)\//.test(f))
  if (hasAdapters && hasPorts) return 'hexagonal'

  // Domain: multiple sibling packages each with controller+service
  const domainPackages = new Map<string, Set<string>>()
  for (const f of filePaths) {
    const match = f.match(/\/([^/]+)\/(controller|service|repository)\//)
    if (match) {
      const domain = match[1]
      if (!domainPackages.has(domain)) domainPackages.set(domain, new Set())
      domainPackages.get(domain)!.add(match[2])
    }
  }
  const domainCount = [...domainPackages.values()].filter(s => s.size >= 2).length
  if (domainCount >= 2) return 'domain'

  return 'layered'
}

function classifyByPath(filePath: string, arch: JavaArchitecture): CodeEntity['kind'] | null {
  if (arch !== 'hexagonal') return null
  if (/\/application\/.*\/port\/in\//.test(filePath)) return 'port-in'
  if (/\/application\/.*\/port\/out\//.test(filePath)) return 'port-out'
  if (/\/adapters\/(web|rest)\//.test(filePath)) return 'web-adapter'
  if (/\/adapters\/(db|persistence)\//.test(filePath)) return 'db-adapter'
  if (/\/adapters\/http\//.test(filePath)) return 'http-adapter'
  if (/\/application\//.test(filePath)) return 'service'
  if (/\/config\//.test(filePath)) return 'configuration'
  if (/\/clients\//.test(filePath)) return 'client-impl'
  if (/\/common\//.test(filePath)) return 'shared'
  if (/\/errors\//.test(filePath)) return 'error-handler'
  return null
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

export function parseJavaFile(
  content: string,
  filePath: string,
  arch: JavaArchitecture = 'layered'
): Omit<JavaParseResult, 'architecture'> & { constructorParams: Map<string, string[]> } {
  const entities: CodeEntity[] = []
  const routes: RouteInfo[] = []
  const callEdges: CallEdge[] = []
  // Map from class entity id -> list of injected type names (from constructor params)
  const constructorParams = new Map<string, string[]>()

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
  let currentClassName: string | null = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const lineNum = i + 1

    // Class declaration
    const classMatch = line.match(classRegex)
    if (classMatch) {
      const className = classMatch[5]
      controllerName = className
      currentClassName = className

      // Path-based classification takes priority for hexagonal arch
      const pathKind = classifyByPath(filePath, arch)
      let kind: CodeEntity['kind'] = pathKind ?? 'class'
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

      // Annotation-based kind detection (only if path didn't classify it)
      if (pathKind === null) {
        if (decorators.includes('RestController') || decorators.includes('Controller')) {
          kind = 'controller'
        } else if (decorators.includes('Service')) {
          kind = 'service'
        } else if (decorators.includes('Repository')) {
          kind = 'repository'
        } else if (decorators.includes('Configuration')) {
          kind = 'configuration'
        } else if (decorators.includes('Component')) {
          kind = 'component'
        } else if (decorators.includes('Aspect')) {
          kind = 'aspect'
        } else if (decorators.includes('Filter')) {
          kind = 'filter'
        }
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

    // Constructor injection detection:
    // A constructor is a method whose name matches the current class name and has no return type token
    // Pattern: public ClassName(params)
    if (currentClassId && currentClassName) {
      const ctorRegex = new RegExp(
        `^\\s*(public|protected|private)\\s+${currentClassName}\\s*\\(([^)]*)\\)`
      )
      const ctorMatch = line.match(ctorRegex)
      if (ctorMatch) {
        const paramsStr = ctorMatch[2]
        if (paramsStr.trim()) {
          const injectedTypes: string[] = []
          const params = paramsStr.split(',')
          for (const p of params) {
            const parts = p.trim().split(/\s+/)
            const nonAnnotation = parts.filter((pt) => !pt.startsWith('@'))
            if (nonAnnotation.length >= 2) {
              // The type is everything except the last token (param name)
              const typeName = nonAnnotation.slice(0, -1).join(' ').replace(/[<>[\]]/g, '').trim()
              injectedTypes.push(typeName)
            }
          }
          if (injectedTypes.length > 0) {
            constructorParams.set(currentClassId, injectedTypes)
          }
        }
      }
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
            // Find the annotation line by scanning backward (up to 8 lines for multi-line annotations)
            let annotationLine = ''
            for (let j = i - 1; j >= 0 && j >= i - 8; j--) {
              const prevLine = lines[j].trim()
              if (prevLine.startsWith(`@${dec}`)) {
                annotationLine = prevLine
                break
              }
            }

            // Extract paths from annotation: handles these patterns:
            //   @GetMapping("/path")
            //   @GetMapping(value = "/path")
            //   @GetMapping(path = "/path")
            //   @GetMapping({"/path1", "/path2"})
            //   @GetMapping  (no args = maps to "")
            const routePaths: string[] = []

            if (annotationLine) {
              const parenIdx = annotationLine.indexOf('(')
              if (parenIdx === -1) {
                // No parentheses: @GetMapping alone
                routePaths.push('')
              } else {
                const argsStr = annotationLine.slice(parenIdx + 1, annotationLine.lastIndexOf(')'))
                // Multi-value: {"/path1", "/path2"}
                const multiMatch = argsStr.match(/\{([^}]+)\}/)
                if (multiMatch) {
                  const allPaths = [...multiMatch[1].matchAll(/["']([^"']+)["']/g)]
                  for (const m of allPaths) routePaths.push(m[1])
                } else {
                  // Single value: "/path" or value="/path" or path="/path"
                  const singleMatch = argsStr.match(/(?:(?:value|path)\s*=\s*)?["']([^"']+)["']/)
                  if (singleMatch) {
                    routePaths.push(singleMatch[1])
                  } else {
                    // Empty parens @GetMapping()
                    routePaths.push('')
                  }
                }
              }
            } else {
              // Decorator found in decorator list but annotation line not found — emit with empty path
              routePaths.push('')
            }

            const normalizedBase = basePath.startsWith('/') ? basePath : '/' + basePath
            for (const routePath of routePaths) {
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
          }

          // Handle @RequestMapping on method
          if (dec === 'RequestMapping') {
            for (let j = i - 1; j >= 0 && j >= i - 8; j--) {
              const prevLine = lines[j].trim()
              const rmMatch = prevLine.match(
                /@RequestMapping\(\s*(?:(?:value|path)\s*=\s*)?["']([^"']+)["'](?:.*?method\s*=\s*RequestMethod\.(\w+))?/
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

  return { entities, routes, callEdges, constructorParams }
}

export function parseJavaFiles(
  files: { path: string; content: string }[]
): JavaParseResult {
  const allFilePaths = files.map(f => f.path)
  const architecture = detectJavaArchitecture(allFilePaths)

  const entities: CodeEntity[] = []
  const routes: RouteInfo[] = []
  const callEdges: CallEdge[] = []

  // Map from class name -> entity id for injection edge resolution
  const classNameToId = new Map<string, string>()

  // First pass: parse all files and collect class names
  const fileResults = files.map(file => {
    const result = parseJavaFile(file.content, file.path, architecture)
    for (const entity of result.entities) {
      if (entity.parentId === null) {
        // Top-level class/interface
        classNameToId.set(entity.name, entity.id)
      }
    }
    return result
  })

  // Second pass: aggregate and build injection edges
  for (const result of fileResults) {
    entities.push(...result.entities)
    routes.push(...result.routes)
    callEdges.push(...result.callEdges)

    // Resolve constructor injection edges
    for (const [classId, injectedTypes] of result.constructorParams) {
      for (const typeName of injectedTypes) {
        const targetId = classNameToId.get(typeName)
        if (targetId && targetId !== classId) {
          callEdges.push({
            id: `${classId}->${targetId}`,
            callerId: classId,
            calleeId: targetId,
            filePath: '',
            line: 0,
            type: 'inject'
          })
        }
      }
    }
  }

  return { entities, routes, callEdges, architecture }
}
