import * as ts from 'typescript'

// Duplicated types from renderer to avoid cross-process imports
interface ComponentInfo {
  name: string
  filePath: string
  children: string[]
  props: string[]
  hooks: string[]
  isRoute: boolean
  routePath: string | null
  imports: string[]
}

export interface FEParseResult {
  components: ComponentInfo[]
  routes: { path: string; component: string }[]
}

const REACT_HOOKS = [
  'useState',
  'useEffect',
  'useCallback',
  'useMemo',
  'useRef',
  'useContext',
  'useReducer',
  'useLayoutEffect',
  'useImperativeHandle',
  'useDebugValue',
  'useDeferredValue',
  'useTransition',
  'useId',
  'useSyncExternalStore',
  'useInsertionEffect'
]

function isComponentFile(filePath: string): boolean {
  return /\.(tsx|jsx|ts|js)$/.test(filePath)
}

export function parseFrontendProject(rootDir: string, filePaths: string[]): FEParseResult {
  const components: ComponentInfo[] = []
  const routes: { path: string; component: string }[] = []

  const componentFiles = filePaths.filter(
    (f) =>
      isComponentFile(f) &&
      !f.endsWith('.d.ts') &&
      !f.includes('node_modules') &&
      !f.includes('.test.') &&
      !f.includes('.spec.')
  )

  const compilerOptions: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    jsx: ts.JsxEmit.ReactJSX,
    allowJs: true,
    noEmit: true,
    skipLibCheck: true,
    baseUrl: rootDir,
    moduleResolution: ts.ModuleResolutionKind.Bundler
  }

  let program: ts.Program
  try {
    program = ts.createProgram(componentFiles, compilerOptions)
  } catch {
    return { components, routes }
  }

  for (const sourceFile of program.getSourceFiles()) {
    if (sourceFile.isDeclarationFile) continue
    if (sourceFile.fileName.includes('node_modules')) continue

    const relPath = sourceFile.fileName.startsWith(rootDir)
      ? sourceFile.fileName.slice(rootDir.length + 1)
      : sourceFile.fileName

    // Only process component-like files (tsx/jsx or files exporting components)
    if (!isComponentFile(relPath)) continue

    const importsList: string[] = []
    const children: string[] = []
    const hooks: string[] = []
    const props: string[] = []
    let componentName = ''
    let isRoute = false
    let routePath: string | null = null

    function visit(node: ts.Node): void {
      // Import declarations
      if (ts.isImportDeclaration(node) && node.moduleSpecifier) {
        const modSpec = (node.moduleSpecifier as ts.StringLiteral).text
        importsList.push(modSpec)
      }

      // Default export function component
      if (
        ts.isFunctionDeclaration(node) &&
        node.name &&
        node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
      ) {
        if (
          node.modifiers.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword) ||
          /^[A-Z]/.test(node.name.text)
        ) {
          componentName = node.name.text

          // Extract props from first parameter
          if (node.parameters.length > 0) {
            const param = node.parameters[0]
            if (param.type && ts.isTypeLiteralNode(param.type)) {
              for (const member of param.type.members) {
                if (ts.isPropertySignature(member) && member.name) {
                  props.push(member.name.getText())
                }
              }
            } else if (
              param.name &&
              ts.isObjectBindingPattern(param.name)
            ) {
              for (const element of param.name.elements) {
                if (ts.isBindingElement(element) && element.name) {
                  props.push(element.name.getText())
                }
              }
            }
          }
        }
      }

      // Variable declaration with arrow function component (export const MyComponent = ...)
      if (ts.isVariableStatement(node)) {
        const isExported = node.modifiers?.some(
          (m) => m.kind === ts.SyntaxKind.ExportKeyword
        )
        if (isExported) {
          for (const decl of node.declarationList.declarations) {
            if (
              ts.isIdentifier(decl.name) &&
              /^[A-Z]/.test(decl.name.text) &&
              decl.initializer &&
              (ts.isArrowFunction(decl.initializer) ||
                ts.isFunctionExpression(decl.initializer))
            ) {
              if (!componentName) {
                componentName = decl.name.text
              }

              // Extract props
              const fn = decl.initializer
              if (fn.parameters.length > 0) {
                const param = fn.parameters[0]
                if (param.name && ts.isObjectBindingPattern(param.name)) {
                  for (const element of param.name.elements) {
                    if (ts.isBindingElement(element) && element.name) {
                      props.push(element.name.getText())
                    }
                  }
                }
              }
            }
          }
        }
      }

      // JSX elements — detect children components and Route elements
      if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
        const tagName = node.tagName.getText()

        // Capital-letter tags are component references
        if (/^[A-Z]/.test(tagName) && !children.includes(tagName)) {
          children.push(tagName)
        }

        // Detect React Router Route elements
        if (tagName === 'Route') {
          let path = ''
          let element = ''

          for (const attr of node.attributes.properties) {
            if (!ts.isJsxAttribute(attr) || !attr.name) continue
            const attrName = attr.name.getText()

            if (attrName === 'path' && attr.initializer) {
              if (ts.isStringLiteral(attr.initializer)) {
                path = attr.initializer.text
              } else if (
                ts.isJsxExpression(attr.initializer) &&
                attr.initializer.expression &&
                ts.isStringLiteral(attr.initializer.expression)
              ) {
                path = attr.initializer.expression.text
              }
            }

            if (
              (attrName === 'element' || attrName === 'component') &&
              attr.initializer
            ) {
              if (ts.isJsxExpression(attr.initializer) && attr.initializer.expression) {
                // element={<Component/>} or component={Component}
                const expr = attr.initializer.expression
                if (ts.isJsxSelfClosingElement(expr)) {
                  element = expr.tagName.getText()
                } else if (ts.isIdentifier(expr)) {
                  element = expr.text
                }
              }
            }
          }

          if (path && element) {
            routes.push({ path, component: element })
          }
        }
      }

      // Detect hook usage
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
        const callName = node.expression.text
        if (
          (REACT_HOOKS.includes(callName) || callName.startsWith('use')) &&
          !hooks.includes(callName)
        ) {
          hooks.push(callName)
        }
      }

      ts.forEachChild(node, visit)
    }

    visit(sourceFile)

    // If no explicit component name found, try deriving from filename
    if (!componentName) {
      const basename = relPath.split('/').pop() || ''
      const name = basename.replace(/\.(tsx|jsx|ts|js)$/, '')
      if (/^[A-Z]/.test(name)) {
        componentName = name
      }
    }

    // Only add if we found a component
    if (componentName) {
      // Check if this component is used as a route target
      const matchingRoute = routes.find((r) => r.component === componentName)
      if (matchingRoute) {
        isRoute = true
        routePath = matchingRoute.path
      }

      components.push({
        name: componentName,
        filePath: relPath,
        children: children.filter((c) => c !== componentName), // Remove self-reference
        props,
        hooks,
        isRoute,
        routePath,
        imports: importsList
      })
    }
  }

  // Second pass: mark components as routes if they appear in route definitions
  for (const route of routes) {
    const comp = components.find((c) => c.name === route.component)
    if (comp && !comp.isRoute) {
      comp.isRoute = true
      comp.routePath = route.path
    }
  }

  // Detect file-based routing (Next.js pages/ or app/ directory)
  const pagesFiles = filePaths.filter(
    (f) =>
      (f.startsWith('pages/') || f.startsWith('src/pages/') || f.startsWith('app/') || f.startsWith('src/app/')) &&
      isComponentFile(f) &&
      !f.includes('_app.') &&
      !f.includes('_document.') &&
      !f.includes('layout.')
  )

  for (const pageFile of pagesFiles) {
    let routePath = pageFile
      .replace(/^(src\/)?(pages|app)/, '')
      .replace(/\.(tsx|jsx|ts|js)$/, '')
      .replace(/\/index$/, '/')
      .replace(/\[([^\]]+)\]/g, ':$1')

    if (!routePath.startsWith('/')) routePath = '/' + routePath

    const comp = components.find((c) => c.filePath === pageFile)
    if (comp) {
      comp.isRoute = true
      comp.routePath = routePath
      routes.push({ path: routePath, component: comp.name })
    }
  }

  return { components, routes }
}
