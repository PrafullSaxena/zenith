// Duplicated types from renderer to avoid cross-process imports
interface PipelineInfo {
  id: string
  name: string
  type: 'airflow-dag' | 'dbt-model' | 'spark-job' | 'trigger-script'
  filePath: string
  schedule: string | null
  tasks: PipelineTask[]
  dependencies: { upstream: string; downstream: string }[]
}

interface PipelineTask {
  id: string
  name: string
  operator: string
  filePath: string
  line: number
}

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

export interface DEParseResult {
  pipelines: PipelineInfo[]
  entities: CodeEntity[]
}

function buildEntityId(filePath: string, name: string, line: number): string {
  return `${filePath}:${name}:${line}`
}

function parseAirflowDag(content: string, filePath: string): { pipelines: PipelineInfo[]; entities: CodeEntity[] } {
  const pipelines: PipelineInfo[] = []
  const entities: CodeEntity[] = []
  const lines = content.split('\n')

  // Detect DAG definitions
  // Pattern: DAG('dag_id', ...) or with DAG('dag_id', ...) as dag:
  const dagRegex = /(?:with\s+)?DAG\(\s*['"]([^'"]+)['"]/g
  // Pattern: @dag decorator
  const dagDecoratorRegex = /@dag\b/

  let dagId = ''
  let schedule: string | null = null
  const tasks: PipelineTask[] = []
  const deps: { upstream: string; downstream: string }[] = []

  // Find DAG ID
  let dagMatch: RegExpExecArray | null
  while ((dagMatch = dagRegex.exec(content)) !== null) {
    dagId = dagMatch[1]
  }

  // Check @dag decorator
  if (!dagId) {
    for (let i = 0; i < lines.length; i++) {
      if (dagDecoratorRegex.test(lines[i])) {
        // Next function def is the DAG
        for (let j = i + 1; j < lines.length; j++) {
          const funcMatch = lines[j].match(/def\s+(\w+)\s*\(/)
          if (funcMatch) {
            dagId = funcMatch[1]
            break
          }
        }
        break
      }
    }
  }

  if (!dagId) return { pipelines, entities }

  // Extract schedule
  const scheduleMatch = content.match(/schedule(?:_interval)?\s*=\s*['"]([^'"]+)['"]/)
  if (scheduleMatch) {
    schedule = scheduleMatch[1]
  }

  // Extract tasks: task_var = SomeOperator(task_id='name', ...)
  const taskRegex = /(\w+)\s*=\s*(\w+Operator|PythonOperator|BashOperator|DummyOperator|EmptyOperator|BranchPythonOperator|ShortCircuitOperator|ExternalTaskSensor|SqlSensor|HttpSensor|FileSensor)\s*\(\s*task_id\s*=\s*['"]([^'"]+)['"]/g
  let taskMatch: RegExpExecArray | null
  while ((taskMatch = taskRegex.exec(content)) !== null) {
    const varName = taskMatch[1]
    const operator = taskMatch[2]
    const taskId = taskMatch[3]

    // Find line number
    const charIdx = taskMatch.index
    const lineNum = content.slice(0, charIdx).split('\n').length

    const taskEntityId = buildEntityId(filePath, taskId, lineNum)
    tasks.push({
      id: taskEntityId,
      name: taskId,
      operator,
      filePath,
      line: lineNum
    })

    entities.push({
      id: taskEntityId,
      name: taskId,
      kind: 'task',
      filePath,
      line: lineNum,
      endLine: lineNum,
      decorators: [],
      parameters: [],
      returnType: '',
      summary: `${operator} task in DAG ${dagId}`,
      parentId: null
    })

    // Track variable name -> task ID mapping for dependency parsing
    ;(taskMatch as unknown as { _varName: string })._varName = varName
  }

  // Extract dependencies: task1 >> task2 or task1 << task2
  const depLines = content.match(/\w+\s*>>\s*[\w\[\],\s]+/g) || []
  for (const depLine of depLines) {
    // Split by >> to get chain
    const parts = depLine.split('>>').map((p) => p.trim())
    for (let i = 0; i < parts.length - 1; i++) {
      const upstream = parts[i].replace(/[\[\]]/g, '').trim()
      const downstream = parts[i + 1].replace(/[\[\]]/g, '').trim()

      // Handle comma-separated lists
      const upstreams = upstream.split(',').map((u) => u.trim()).filter(Boolean)
      const downstreams = downstream.split(',').map((d) => d.trim()).filter(Boolean)

      for (const up of upstreams) {
        for (const down of downstreams) {
          deps.push({ upstream: up, downstream: down })
        }
      }
    }
  }

  // Add DAG entity
  const dagLineMatch = content.match(/DAG\(/)
  const dagLine = dagLineMatch ? content.slice(0, dagLineMatch.index).split('\n').length : 1

  const dagEntityId = buildEntityId(filePath, dagId, dagLine)
  entities.push({
    id: dagEntityId,
    name: dagId,
    kind: 'dag',
    filePath,
    line: dagLine,
    endLine: lines.length,
    decorators: [],
    parameters: [],
    returnType: '',
    summary: schedule ? `Airflow DAG, schedule: ${schedule}` : 'Airflow DAG',
    parentId: null
  })

  pipelines.push({
    id: dagEntityId,
    name: dagId,
    type: 'airflow-dag',
    filePath,
    schedule,
    tasks,
    dependencies: deps
  })

  // Extract function definitions
  const funcRegex = /^(\s*)def\s+(\w+)\s*\(([^)]*)\)/gm
  let funcMatch: RegExpExecArray | null
  while ((funcMatch = funcRegex.exec(content)) !== null) {
    const funcName = funcMatch[2]
    const lineNum = content.slice(0, funcMatch.index).split('\n').length
    const entityId = buildEntityId(filePath, funcName, lineNum)

    // Skip if already added as a task
    if (entities.some((e) => e.name === funcName && e.kind === 'task')) continue

    entities.push({
      id: entityId,
      name: funcName,
      kind: 'function',
      filePath,
      line: lineNum,
      endLine: lineNum,
      decorators: [],
      parameters: [],
      returnType: '',
      summary: '',
      parentId: null
    })
  }

  return { pipelines, entities }
}

function parseDbtModel(content: string, filePath: string): { pipelines: PipelineInfo[]; entities: CodeEntity[] } {
  const pipelines: PipelineInfo[] = []
  const entities: CodeEntity[] = []

  // Model name from filename
  const fileName = filePath.split('/').pop() || ''
  const modelName = fileName.replace(/\.sql$/, '')
  const entityId = buildEntityId(filePath, modelName, 1)

  // Find dependencies via ref() calls
  const deps: { upstream: string; downstream: string }[] = []
  const refRegex = /\{\{\s*ref\(\s*['"]([^'"]+)['"]\s*\)\s*\}\}/g
  let refMatch: RegExpExecArray | null
  while ((refMatch = refRegex.exec(content)) !== null) {
    deps.push({ upstream: refMatch[1], downstream: modelName })
  }

  // Check for sources
  const sourceRegex = /\{\{\s*source\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]\s*\)\s*\}\}/g
  let sourceMatch: RegExpExecArray | null
  while ((sourceMatch = sourceRegex.exec(content)) !== null) {
    deps.push({
      upstream: `${sourceMatch[1]}.${sourceMatch[2]}`,
      downstream: modelName
    })
  }

  entities.push({
    id: entityId,
    name: modelName,
    kind: 'dag',
    filePath,
    line: 1,
    endLine: content.split('\n').length,
    decorators: [],
    parameters: [],
    returnType: '',
    summary: `dbt model with ${deps.length} upstream dependencies`,
    parentId: null
  })

  pipelines.push({
    id: entityId,
    name: modelName,
    type: 'dbt-model',
    filePath,
    schedule: null,
    tasks: [],
    dependencies: deps
  })

  return { pipelines, entities }
}

function parseTriggerScript(content: string, filePath: string): { pipelines: PipelineInfo[]; entities: CodeEntity[] } {
  const pipelines: PipelineInfo[] = []
  const entities: CodeEntity[] = []

  const fileName = filePath.split('/').pop() || ''
  const scriptName = fileName.replace(/\.(py|sh)$/, '')
  const entityId = buildEntityId(filePath, scriptName, 1)

  // Detect schedule from comments or APScheduler/schedule imports
  let schedule: string | null = null
  const cronMatch = content.match(/cron[:\s]+([^\n]+)/i)
  if (cronMatch) schedule = cronMatch[1].trim()

  const scheduleImport = content.match(/from\s+(?:apscheduler|schedule)\s+import/)
  if (scheduleImport && !schedule) schedule = 'programmatic'

  entities.push({
    id: entityId,
    name: scriptName,
    kind: 'task',
    filePath,
    line: 1,
    endLine: content.split('\n').length,
    decorators: [],
    parameters: [],
    returnType: '',
    summary: schedule ? `Trigger script, schedule: ${schedule}` : 'Trigger script',
    parentId: null
  })

  pipelines.push({
    id: entityId,
    name: scriptName,
    type: 'trigger-script',
    filePath,
    schedule,
    tasks: [],
    dependencies: []
  })

  // Extract function definitions
  const funcRegex = /^(\s*)def\s+(\w+)\s*\(/gm
  let funcMatch: RegExpExecArray | null
  while ((funcMatch = funcRegex.exec(content)) !== null) {
    const funcName = funcMatch[2]
    const lineNum = content.slice(0, funcMatch.index).split('\n').length
    const fEntityId = buildEntityId(filePath, funcName, lineNum)

    entities.push({
      id: fEntityId,
      name: funcName,
      kind: 'function',
      filePath,
      line: lineNum,
      endLine: lineNum,
      decorators: [],
      parameters: [],
      returnType: '',
      summary: '',
      parentId: null
    })
  }

  return { pipelines, entities }
}

export function parseDEProject(
  files: { path: string; content: string }[]
): DEParseResult {
  const pipelines: PipelineInfo[] = []
  const entities: CodeEntity[] = []

  for (const file of files) {
    const filePath = file.path
    const content = file.content

    // Airflow DAGs: files in dags/ or containing "from airflow"
    if (filePath.includes('dags/') || content.includes('from airflow')) {
      const result = parseAirflowDag(content, filePath)
      pipelines.push(...result.pipelines)
      entities.push(...result.entities)
      continue
    }

    // dbt models: .sql files in models/ directory
    if (filePath.includes('models/') && filePath.endsWith('.sql')) {
      const result = parseDbtModel(content, filePath)
      pipelines.push(...result.pipelines)
      entities.push(...result.entities)
      continue
    }

    // Trigger scripts
    const isTriggerPattern =
      /_trigger\.py$/.test(filePath) ||
      /_script\.py$/.test(filePath) ||
      /trigger_\w+\.py$/.test(filePath) ||
      /run_\w+\.sh$/.test(filePath)

    const hasScheduleImport =
      content.includes('from schedule import') ||
      content.includes('from apscheduler') ||
      content.includes('import schedule')

    if (isTriggerPattern || hasScheduleImport) {
      const result = parseTriggerScript(content, filePath)
      pipelines.push(...result.pipelines)
      entities.push(...result.entities)
    }
  }

  return { pipelines, entities }
}
