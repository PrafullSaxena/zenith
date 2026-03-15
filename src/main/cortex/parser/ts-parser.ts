import * as ts from 'typescript'

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

interface CallEdge {
  id: string
  callerId: string
  calleeId: string
  filePath: string
  line: number
  type: 'call' | 'import' | 'inject' | 'route' | 'inferred'
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

export interface TSParseResult {
  entities: CodeEntity[]
  calls: CallEdge[]
  routes: RouteInfo[]
}

const HTTP_METHODS: Record<string, RouteInfo['method']> = {
  Get: 'GET',
  Post: 'POST',
  Put: 'PUT',
  Delete: 'DELETE',
  Patch: 'PATCH',
  get: 'GET',
  post: 'POST',
  put: 'PUT',
  delete: 'DELETE',
  patch: 'PATCH',
  all: 'ALL'
}

function buildEntityId(filePath: string, name: string, line: number): string {
  return `${filePath}:${name}:${line}`
}

function getDecoratorNames(node: ts.Node): string[] {
  const decorators: string[] = []

  // TS 5.x: decorators are on modifiers
  if (ts.canHaveDecorators(node)) {
    const mods = ts.getDecorators(node)
    if (mods) {
      for (const d of mods) {
        try {
          if (ts.isCallExpression(d.expression)) {
            const expr = d.expression.expression
            decorators.push(ts.isIdentifier(expr) ? expr.text : expr.getText())
          } else {
            decorators.push(ts.isIdentifier(d.expression) ? d.expression.text : d.expression.getText())
          }
        } catch {
          // getText() can fail for detached nodes — skip
        }
      }
    }
  }

  return decorators
}

function getDecoratorArg(node: ts.Node, decoratorName: string): string | null {
  if (!ts.canHaveDecorators(node)) return null
  const mods = ts.getDecorators(node)
  if (!mods) return null

  for (const d of mods) {
    if (ts.isCallExpression(d.expression)) {
      let name = ''
      try {
        const expr = d.expression.expression
        name = ts.isIdentifier(expr) ? expr.text : expr.getText()
      } catch { continue }
      if (name === decoratorName && d.expression.arguments.length > 0) {
        const arg = d.expression.arguments[0]
        if (ts.isStringLiteral(arg)) {
          return arg.text
        }
      }
    }
  }
  return null
}

function getParameters(
  node: ts.FunctionDeclaration | ts.MethodDeclaration | ts.ArrowFunction | ts.FunctionExpression,
  checker: ts.TypeChecker
): { name: string; type: string }[] {
  return node.parameters.map((p) => {
    let name = 'unknown'
    try { name = ts.isIdentifier(p.name) ? p.name.text : p.name.getText() } catch { /* skip */ }
    let type = 'any'
    if (p.type) {
      try { type = p.type.getText() } catch { /* skip */ }
    } else {
      try {
        const sym = checker.getSymbolAtLocation(p.name)
        if (sym) {
          const t = checker.getTypeOfSymbolAtLocation(sym, p)
          type = checker.typeToString(t)
        }
      } catch {
        // fallback
      }
    }
    return { name, type }
  })
}

function getReturnType(
  node: ts.FunctionDeclaration | ts.MethodDeclaration | ts.ArrowFunction | ts.FunctionExpression,
  checker: ts.TypeChecker
): string {
  if (node.type) {
    try { return node.type.getText() } catch { /* skip */ }
  }
  try {
    const sig = checker.getSignatureFromDeclaration(node)
    if (sig) {
      const retType = checker.getReturnTypeOfSignature(sig)
      return checker.typeToString(retType)
    }
  } catch {
    // fallback
  }
  return 'void'
}

export function parseTypeScriptProject(rootDir: string, filePaths: string[]): TSParseResult {
  const entities: CodeEntity[] = []
  const calls: CallEdge[] = []
  const routes: RouteInfo[] = []
  // Track constructor injection: classEntityId -> injected type names
  const constructorInjections = new Map<string, string[]>()

  const compilerOptions: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    allowJs: true,
    noEmit: true,
    skipLibCheck: true,
    baseUrl: rootDir,
    moduleResolution: ts.ModuleResolutionKind.Bundler
  }

  // Filter to TS/JS files only
  const tsFiles = filePaths.filter(
    (f) =>
      (f.endsWith('.ts') || f.endsWith('.tsx') || f.endsWith('.js') || f.endsWith('.jsx')) &&
      !f.endsWith('.d.ts') &&
      !f.includes('node_modules')
  )

  let program: ts.Program
  try {
    program = ts.createProgram(tsFiles, compilerOptions)
  } catch {
    // If program creation fails, return empty
    return { entities, calls, routes }
  }

  const checker = program.getTypeChecker()
  let callEdgeCounter = 0

  for (const sourceFile of program.getSourceFiles()) {
    // Skip declaration files and node_modules
    if (sourceFile.isDeclarationFile) continue
    if (sourceFile.fileName.includes('node_modules')) continue

    const relPath = sourceFile.fileName.startsWith(rootDir)
      ? sourceFile.fileName.slice(rootDir.length + 1)
      : sourceFile.fileName

    const contextStack: string[] = []
    let currentControllerName = ''
    let currentControllerBasePath = ''

    function visit(node: ts.Node): void {
      const line = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1
      const endLine = sourceFile.getLineAndCharacterOfPosition(node.getEnd()).line + 1

      // Class declarations
      if (ts.isClassDeclaration(node) && node.name) {
        const className = node.name.text
        const decorators = getDecoratorNames(node)
        let kind: CodeEntity['kind'] = 'class'

        // Check for controller/service/repository decorators (NestJS)
        if (decorators.includes('Controller')) {
          kind = 'controller'
          currentControllerName = className
          currentControllerBasePath = getDecoratorArg(node, 'Controller') || ''
        } else if (decorators.includes('Injectable') || decorators.includes('Service')) {
          kind = 'service'
        } else if (decorators.includes('Repository')) {
          kind = 'repository'
        } else if (decorators.includes('Middleware') || decorators.includes('UseGuards')) {
          kind = 'middleware'
        }

        const entityId = buildEntityId(relPath, className, line)
        entities.push({
          id: entityId,
          name: className,
          kind,
          filePath: relPath,
          line,
          endLine,
          decorators,
          parameters: [],
          returnType: '',
          summary: '',
          parentId: null
        })

        // Detect constructor injection (NestJS/Angular pattern)
        // e.g. constructor(private userService: UserService, private repo: UserRepo)
        for (const member of node.members) {
          if (ts.isConstructorDeclaration(member)) {
            const injectedTypes: string[] = []
            for (const param of member.parameters) {
              if (param.type && ts.isTypeReferenceNode(param.type)) {
                const typeName = param.type.typeName.getText()
                injectedTypes.push(typeName)
              }
            }
            if (injectedTypes.length > 0) {
              constructorInjections.set(entityId, injectedTypes)
            }
          }
        }

        contextStack.push(entityId)
        ts.forEachChild(node, visit)
        contextStack.pop()
        currentControllerName = ''
        currentControllerBasePath = ''
        return
      }

      // Method declarations
      if (ts.isMethodDeclaration(node) && node.name) {
        let methodName = ''
        try { methodName = ts.isIdentifier(node.name) ? node.name.text : node.name.getText() } catch { /* skip */ }
        if (!methodName) { ts.forEachChild(node, visit); return }
        const decorators = getDecoratorNames(node)
        const entityId = buildEntityId(relPath, methodName, line)
        const parentId = contextStack.length > 0 ? contextStack[contextStack.length - 1] : null

        entities.push({
          id: entityId,
          name: methodName,
          kind: 'method',
          filePath: relPath,
          line,
          endLine,
          decorators,
          parameters: getParameters(node, checker),
          returnType: getReturnType(node, checker),
          summary: '',
          parentId
        })

        // Check for route decorators (NestJS)
        for (const dec of decorators) {
          const method = HTTP_METHODS[dec]
          if (method && currentControllerName) {
            const routePath = getDecoratorArg(node, dec) || ''
            const basePath = currentControllerBasePath.startsWith('/')
              ? currentControllerBasePath
              : '/' + currentControllerBasePath
            const methodPath = routePath.startsWith('/') ? routePath : '/' + routePath
            const fullPath =
              basePath === '/'
                ? methodPath
                : methodPath === '/'
                  ? basePath
                  : basePath + methodPath

            routes.push({
              method,
              path: routePath,
              handlerName: methodName,
              controllerName: currentControllerName,
              filePath: relPath,
              line,
              fullPath
            })
          }
        }

        contextStack.push(entityId)
        ts.forEachChild(node, visit)
        contextStack.pop()
        return
      }

      // Function declarations
      if (ts.isFunctionDeclaration(node) && node.name) {
        const funcName = node.name.text
        const entityId = buildEntityId(relPath, funcName, line)
        const decorators = getDecoratorNames(node)

        entities.push({
          id: entityId,
          name: funcName,
          kind: 'function',
          filePath: relPath,
          line,
          endLine,
          decorators,
          parameters: getParameters(node, checker),
          returnType: getReturnType(node, checker),
          summary: '',
          parentId: null
        })

        contextStack.push(entityId)
        ts.forEachChild(node, visit)
        contextStack.pop()
        return
      }

      // Variable declarations with arrow functions (e.g., const handler = () => {})
      if (
        ts.isVariableDeclaration(node) &&
        node.name &&
        ts.isIdentifier(node.name) &&
        node.initializer &&
        (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer))
      ) {
        const funcName = node.name.text
        const entityId = buildEntityId(relPath, funcName, line)

        entities.push({
          id: entityId,
          name: funcName,
          kind: 'function',
          filePath: relPath,
          line,
          endLine,
          decorators: [],
          parameters: getParameters(node.initializer, checker),
          returnType: getReturnType(node.initializer, checker),
          summary: '',
          parentId: null
        })

        contextStack.push(entityId)
        ts.forEachChild(node.initializer, visit)
        contextStack.pop()
        return
      }

      // Call expressions — detect Express-style routes and general calls
      if (ts.isCallExpression(node)) {
        // Check for Express-style router.get('/path', handler)
        if (ts.isPropertyAccessExpression(node.expression)) {
          const methodName = node.expression.name.text.toLowerCase()
          const httpMethod = HTTP_METHODS[methodName]

          if (httpMethod && node.arguments.length >= 2) {
            const pathArg = node.arguments[0]
            if (ts.isStringLiteral(pathArg)) {
              const handlerArg = node.arguments[node.arguments.length - 1]
              let handlerName = 'anonymous'
              if (ts.isIdentifier(handlerArg)) {
                handlerName = handlerArg.text
              } else if (
                ts.isArrowFunction(handlerArg) ||
                ts.isFunctionExpression(handlerArg)
              ) {
                handlerName = 'inline'
              }

              routes.push({
                method: httpMethod,
                path: pathArg.text,
                handlerName,
                controllerName: '',
                filePath: relPath,
                line,
                fullPath: pathArg.text
              })
            }
          }
        }

        // Record call edge
        if (contextStack.length > 0) {
          const callerId = contextStack[contextStack.length - 1]
          let calleeName = ''

          if (ts.isIdentifier(node.expression)) {
            calleeName = node.expression.text
          } else if (ts.isPropertyAccessExpression(node.expression)) {
            calleeName = node.expression.name.text
          }

          if (calleeName) {
            let calleeId = ''
            try {
              const sym = checker.getSymbolAtLocation(
                ts.isPropertyAccessExpression(node.expression)
                  ? node.expression.name
                  : node.expression
              )
              if (sym) {
                const decls = sym.getDeclarations()
                if (decls && decls.length > 0) {
                  const decl = decls[0]
                  const declFile = decl.getSourceFile()
                  const declRelPath = declFile.fileName.startsWith(rootDir)
                    ? declFile.fileName.slice(rootDir.length + 1)
                    : declFile.fileName
                  const declLine =
                    declFile.getLineAndCharacterOfPosition(decl.getStart()).line + 1
                  calleeId = buildEntityId(declRelPath, calleeName, declLine)
                }
              }
            } catch {
              // Symbol resolution can fail — use inferred ID
            }

            if (!calleeId) {
              calleeId = `unresolved:${calleeName}`
            }

            callEdgeCounter++
            calls.push({
              id: `call:${callEdgeCounter}`,
              callerId,
              calleeId,
              filePath: relPath,
              line,
              type: 'call'
            })
          }
        }
      }

      ts.forEachChild(node, visit)
    }

    visit(sourceFile)
  }

  // Resolve constructor injection edges: classEntityId -> target class entity
  const classNameToId = new Map<string, string>()
  for (const e of entities) {
    if (e.parentId === null && (e.kind === 'class' || e.kind === 'controller' || e.kind === 'service' || e.kind === 'repository' || e.kind === 'middleware')) {
      classNameToId.set(e.name, e.id)
    }
  }

  for (const [classId, injectedTypes] of constructorInjections) {
    for (const typeName of injectedTypes) {
      const targetId = classNameToId.get(typeName)
      if (targetId && targetId !== classId) {
        callEdgeCounter++
        calls.push({
          id: `inject:${callEdgeCounter}`,
          callerId: classId,
          calleeId: targetId,
          filePath: '',
          line: 0,
          type: 'inject'
        })
      }
    }
  }

  return { entities, calls, routes }
}
