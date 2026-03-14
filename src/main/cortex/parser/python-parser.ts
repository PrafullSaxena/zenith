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
    | 'model'
    | 'spark-source'
    | 'spark-transform'
    | 'spark-sink'
    | 'spark-sql'
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

interface CallEdge {
  from: string
  to: string
  type: 'call' | 'inject' | 'spark-pipeline'
}

export interface PythonParseResult {
  entities: CodeEntity[]
  routes: RouteInfo[]
  callEdges: CallEdge[]
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

const FLASK_ROUTE_REGEX =
  /@(?:app|blueprint|bp)\.route\(\s*['"]([^'"]+)['"]\s*(?:,\s*methods\s*=\s*\[([^\]]+)\])?\s*\)/
const FASTAPI_ROUTE_REGEX = /@(?:app|router)\.(\w+)\(\s*['"]([^'"]+)['"]/
const DJANGO_PATH_REGEX = /path\(\s*['"]([^'"]+)['"]\s*,\s*(\w+)/

// APIRouter prefix: router = APIRouter(prefix="/some/path")
const API_ROUTER_PREFIX_REGEX =
  /(\w+)\s*=\s*APIRouter\s*\([^)]*prefix\s*=\s*['"]([^'"]+)['"]/

// PySpark patterns
const SPARK_READ_REGEX = /\bspark\.read\.(\w+)\s*\(/
const SPARK_DF_TRANSFORM_REGEX = /\.(?:filter|groupBy|join|withColumn|select)\s*\(/g
const SPARK_WRITE_REGEX = /\.(?:write\.\w+|saveAsTable)\s*\(/
const SPARK_SQL_REGEX = /\bspark\.sql\s*\(\s*(?:['"]([^'"]*)['""]|[^)]+)/

// Pydantic BaseModel
const BASE_MODEL_REGEX = /^class\s+(\w+)\s*\(\s*BaseModel\s*\)/

// FastAPI Depends()
const DEPENDS_REGEX = /Depends\s*\(\s*(\w+)\s*\)/g

/**
 * Detect whether the file uses PySpark (SparkSession or pyspark imports).
 */
function isPySparkFile(content: string): boolean {
  return /\bSparkSession\b/.test(content) || /\bimport\s+pyspark\b/.test(content) || /\bfrom\s+pyspark\b/.test(content)
}

/**
 * Parse PySpark-specific entities and pipeline edges from file content.
 * Returns new entities and call edges to be merged into the main result.
 */
function parsePySpark(
  lines: string[],
  filePath: string
): { entities: CodeEntity[]; callEdges: CallEdge[] } {
  const entities: CodeEntity[] = []
  const callEdges: CallEdge[] = []

  // Collect all spark-source, spark-transform, spark-sink, spark-sql entities
  // per logical block (we use the variable name assigned to the read as the pipeline anchor)
  // Simple heuristic: scan line by line

  // Track the last source entity id to chain transforms and sinks
  let lastPipelineEntityId: string | null = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const lineNum = i + 1
    const trimmed = line.trim()

    // spark.sql(...)
    const sqlMatch = trimmed.match(SPARK_SQL_REGEX)
    if (sqlMatch) {
      const sqlText = sqlMatch[1] || 'sql'
      const name = `spark_sql_${lineNum}`
      const id = buildEntityId(filePath, name, lineNum)
      entities.push({
        id,
        name,
        kind: 'spark-sql',
        filePath,
        line: lineNum,
        endLine: lineNum,
        decorators: [],
        parameters: [{ name: 'query', type: sqlText.slice(0, 80) }],
        returnType: 'DataFrame',
        summary: `spark.sql at line ${lineNum}`,
        parentId: null
      })
      if (lastPipelineEntityId) {
        callEdges.push({ from: lastPipelineEntityId, to: id, type: 'spark-pipeline' })
      }
      lastPipelineEntityId = id
      continue
    }

    // spark.read.*
    const readMatch = trimmed.match(SPARK_READ_REGEX)
    if (readMatch) {
      const readMethod = readMatch[1]
      const name = `spark_read_${readMethod}_${lineNum}`
      const id = buildEntityId(filePath, name, lineNum)
      entities.push({
        id,
        name,
        kind: 'spark-source',
        filePath,
        line: lineNum,
        endLine: lineNum,
        decorators: [],
        parameters: [{ name: 'format', type: readMethod }],
        returnType: 'DataFrame',
        summary: `spark.read.${readMethod} at line ${lineNum}`,
        parentId: null
      })
      // Start a new pipeline chain
      lastPipelineEntityId = id
      continue
    }

    // DataFrame transformations (.filter, .groupBy, .join, .withColumn, .select)
    const transformMatches = Array.from(trimmed.matchAll(SPARK_DF_TRANSFORM_REGEX))
    if (transformMatches.length > 0) {
      for (const match of transformMatches) {
        const op = match[0].replace(/\s*\($/, '').slice(1) // strip leading dot and trailing (
        const name = `spark_${op}_${lineNum}`
        const id = buildEntityId(filePath, name, lineNum)
        entities.push({
          id,
          name,
          kind: 'spark-transform',
          filePath,
          line: lineNum,
          endLine: lineNum,
          decorators: [],
          parameters: [{ name: 'operation', type: op }],
          returnType: 'DataFrame',
          summary: `DataFrame.${op} at line ${lineNum}`,
          parentId: null
        })
        if (lastPipelineEntityId) {
          callEdges.push({ from: lastPipelineEntityId, to: id, type: 'spark-pipeline' })
        }
        lastPipelineEntityId = id
      }
      continue
    }

    // .write.* or .saveAsTable
    const writeMatch = trimmed.match(SPARK_WRITE_REGEX)
    if (writeMatch) {
      const writeOp = writeMatch[0].replace(/\s*\($/, '').slice(1)
      const name = `spark_write_${lineNum}`
      const id = buildEntityId(filePath, name, lineNum)
      entities.push({
        id,
        name,
        kind: 'spark-sink',
        filePath,
        line: lineNum,
        endLine: lineNum,
        decorators: [],
        parameters: [{ name: 'operation', type: writeOp }],
        returnType: 'None',
        summary: `DataFrame.${writeOp} at line ${lineNum}`,
        parentId: null
      })
      if (lastPipelineEntityId) {
        callEdges.push({ from: lastPipelineEntityId, to: id, type: 'spark-pipeline' })
      }
      // Sink ends a pipeline chain
      lastPipelineEntityId = null
      continue
    }
  }

  return { entities, callEdges }
}

/**
 * Parse Pydantic BaseModel classes and their fields.
 */
function parseBaseModels(
  lines: string[],
  filePath: string
): CodeEntity[] {
  const entities: CodeEntity[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const lineNum = i + 1
    const trimmed = line.trimStart()
    const indent = line.length - trimmed.length

    const modelMatch = trimmed.match(BASE_MODEL_REGEX)
    if (!modelMatch) continue

    const modelName = modelMatch[1]

    // Collect fields: lines inside the class body that look like `field: Type`
    const parameters: { name: string; type: string }[] = []
    let endLine = lineNum
    for (let j = i + 1; j < lines.length; j++) {
      const bodyLine = lines[j]
      const bodyTrimmed = bodyLine.trimStart()
      const bodyIndent = bodyLine.length - bodyTrimmed.length
      if (bodyTrimmed.length > 0 && bodyIndent <= indent) {
        endLine = j
        break
      }
      endLine = j + 1
      // Match field: Type or field: Type = default
      const fieldMatch = bodyTrimmed.match(/^(\w+)\s*:\s*([^=\n]+?)(?:\s*=.*)?$/)
      if (fieldMatch && !fieldMatch[1].startsWith('class') && !fieldMatch[1].startsWith('def')) {
        parameters.push({
          name: fieldMatch[1],
          type: fieldMatch[2].trim()
        })
      }
    }

    const id = buildEntityId(filePath, modelName, lineNum)
    entities.push({
      id,
      name: modelName,
      kind: 'model',
      filePath,
      line: lineNum,
      endLine,
      decorators: [],
      parameters,
      returnType: '',
      summary: `Pydantic model ${modelName}`,
      parentId: null
    })
  }

  return entities
}

/**
 * Build a map of router variable name → prefix string from APIRouter declarations.
 * e.g. `router = APIRouter(prefix="/api/v1/items")` → { router: "/api/v1/items" }
 */
function parseAPIRouterPrefixes(lines: string[]): Map<string, string> {
  const prefixes = new Map<string, string>()
  for (const line of lines) {
    const match = line.match(API_ROUTER_PREFIX_REGEX)
    if (match) {
      prefixes.set(match[1], match[2])
    }
  }
  return prefixes
}

export function parsePythonFile(content: string, filePath: string): PythonParseResult {
  const entities: CodeEntity[] = []
  const routes: RouteInfo[] = []
  const callEdges: CallEdge[] = []

  const stripped = stripComments(content)
  const lines = stripped.split('\n')

  // --- Pre-pass: APIRouter prefixes ---
  const routerPrefixes = parseAPIRouterPrefixes(lines)

  // --- Pre-pass: Pydantic BaseModel classes ---
  const modelEntities = parseBaseModels(lines, filePath)
  entities.push(...modelEntities)

  // --- Pre-pass: PySpark ---
  if (isPySparkFile(content)) {
    const { entities: sparkEntities, callEdges: sparkEdges } = parsePySpark(lines, filePath)
    entities.push(...sparkEntities)
    callEdges.push(...sparkEdges)
  }

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

      // Skip if already added as a BaseModel entity
      const alreadyAdded = entities.some((e) => e.id === entityId)
      if (!alreadyAdded) {
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
      }
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

      // --- FastAPI Depends() injection edges ---
      // Scan parameters for Depends(func_name) annotations
      if (paramsStr.includes('Depends')) {
        let depsMatch: RegExpExecArray | null
        DEPENDS_REGEX.lastIndex = 0
        while ((depsMatch = DEPENDS_REGEX.exec(paramsStr)) !== null) {
          const depFunc = depsMatch[1]
          callEdges.push({
            from: entityId,
            to: depFunc, // resolve to id later if needed; use name as target
            type: 'inject'
          })
        }
      }

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
          const routerVar = fastapiMatch[0].match(/@(\w+)\./)?.[1] || ''
          const methodStr = fastapiMatch[1].toUpperCase()
          const routePath = fastapiMatch[2]
          const method = (['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].includes(methodStr)
            ? methodStr
            : 'GET') as RouteInfo['method']

          // Apply APIRouter prefix if the decorator uses a router variable with a known prefix
          const prefix = routerPrefixes.get(routerVar) || ''
          const fullPath = prefix ? `${prefix}${routePath}` : routePath

          routes.push({
            method,
            path: routePath,
            handlerName: funcName,
            controllerName: currentClassName || '',
            filePath,
            line: lineNum,
            fullPath
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

  return { entities, routes, callEdges }
}

export function parsePythonFiles(
  files: { path: string; content: string }[]
): PythonParseResult {
  const entities: CodeEntity[] = []
  const routes: RouteInfo[] = []
  const callEdges: CallEdge[] = []

  for (const file of files) {
    const result = parsePythonFile(file.content, file.path)
    entities.push(...result.entities)
    routes.push(...result.routes)
    callEdges.push(...result.callEdges)
  }

  return { entities, routes, callEdges }
}
