import { useEffect, useState, useCallback } from 'react'
import { useReviewStore } from '../../stores/review-store'
import { useSettingsStore } from '../../stores/settings-store'
import { useAgentStore } from '../../stores/agent-store'
import { useActivityStore } from '../../stores/activity-store'
import { PRList } from './PRList'
import { PRDiffView } from './PRDiffView'
import { ReviewPanel } from './ReviewPanel'
import { ReviewHistory } from './ReviewHistory'
import { SettingsPanel } from './SettingsPanel'
import { GitFork, ChevronDown } from 'lucide-react'
import type { PullRequest } from '../../types/bitbucket'
import type { ReviewComment, ReviewHistoryEntry } from '../../types/review'
import type { RepoEntry } from '../../components/settings/RepoListEditor'

type Tab = 'diff' | 'review' | 'history'

/**
 * Main CodeReviewBot plugin view.
 * Orchestrates PR list, diff viewer, review panel, and history
 * with tab navigation. Default-exported for React.lazy() in registry.
 */
export default function CodeReviewBotView(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<Tab>('diff')

  // Review store state and actions
  const isConnected = useReviewStore((s) => s.isConnected)
  const isConnecting = useReviewStore((s) => s.isConnecting)
  const connectionError = useReviewStore((s) => s.connectionError)
  const pullRequests = useReviewStore((s) => s.pullRequests)
  const isLoadingPRs = useReviewStore((s) => s.isLoadingPRs)
  const prError = useReviewStore((s) => s.prError)
  const selectedPR = useReviewStore((s) => s.selectedPR)
  const diffFiles = useReviewStore((s) => s.diffFiles)
  const currentSession = useReviewStore((s) => s.currentSession)
  const history = useReviewStore((s) => s.history)
  const isLoadingHistory = useReviewStore((s) => s.isLoadingHistory)
  const prPage = useReviewStore((s) => s.prPage)
  const prTotalPages = useReviewStore((s) => s.prTotalPages)
  const prTotalCount = useReviewStore((s) => s.prTotalCount)
  const prFileCounts = useReviewStore((s) => s.prFileCounts)

  const connect = useReviewStore((s) => s.connect)
  const disconnect = useReviewStore((s) => s.disconnect)
  const checkConnection = useReviewStore((s) => s.checkConnection)
  const loadPRs = useReviewStore((s) => s.loadPRs)
  const loadFileCounts = useReviewStore((s) => s.loadFileCounts)
  const selectPR = useReviewStore((s) => s.selectPR)
  const loadDiff = useReviewStore((s) => s.loadDiff)
  const startReview = useReviewStore((s) => s.startReview)
  const cancelReview = useReviewStore((s) => s.cancelReview)
  const postComment = useReviewStore((s) => s.postComment)
  const postAllComments = useReviewStore((s) => s.postAllComments)
  const loadHistory = useReviewStore((s) => s.loadHistory)
  const addHistoryEntry = useReviewStore((s) => s.addHistoryEntry)
  const updateComment = useReviewStore((s) => s.updateComment)
  const loadPersistedSessions = useReviewStore((s) => s.loadPersistedSessions)
  const restoreSessionFromHistory = useReviewStore((s) => s.restoreSessionFromHistory)

  // Settings store for workspace/repo config
  // Subscribe to settings object so component re-renders when settings load asynchronously
  const settingsObj = useSettingsStore((s) => s.settings)
  const loadSettings = useSettingsStore((s) => s.loadSettings)
  const getSetting = useSettingsStore((s) => s.getSetting)
  // settingsObj triggers re-render; getSetting reads current values
  void settingsObj
  const repos = (getSetting('plugins.code-review-bot.repos') as RepoEntry[] | undefined) ?? []
  // Backward compat: if old single-repo settings exist and repos list is empty, use them
  const legacyWorkspace = (getSetting('plugins.code-review-bot.bitbucketWorkspace') as string) || ''
  const legacyRepoSlug = (getSetting('plugins.code-review-bot.repositorySlug') as string) || ''
  const effectiveRepos: RepoEntry[] =
    repos.length > 0
      ? repos
      : legacyWorkspace && legacyRepoSlug
        ? [{ workspace: legacyWorkspace, repoSlug: legacyRepoSlug }]
        : []

  // Track which repo is selected (index into effectiveRepos)
  const [selectedRepoIndex, setSelectedRepoIndex] = useState(0)
  const activeRepo = effectiveRepos[selectedRepoIndex] ?? effectiveRepos[0]
  const workspace = activeRepo?.workspace ?? ''
  const repoSlug = activeRepo?.repoSlug ?? ''

  const defaultAgentId = (getSetting('plugins.code-review-bot.defaultAgent') as string) || ''
  const reviewGuidelines = (getSetting('plugins.code-review-bot.reviewGuidelines') as string) || ''

  // Agent store for configured AI provider
  const providers = useAgentStore((s) => s.providers)
  const agent = defaultAgentId
    ? providers.find((p) => p.id === defaultAgentId)
    : providers.find((p) => p.status === 'connected' || p.hasApiKey)
  const hasAgent = !!agent

  // Activity store
  const addActivity = useActivityStore((s) => s.addEntry)

  // On mount: ensure settings are loaded, check connection, and load history
  useEffect(() => {
    loadSettings()
    checkConnection()
    loadHistory()
  }, [loadSettings, checkConnection, loadHistory])

  // Load PRs when connected + repo is configured. Triggers on:
  // - component mount (if already connected with settings loaded)
  // - isConnected change (after connect/checkConnection resolves)
  // - workspace/repoSlug change (settings load or repo switch)
  useEffect(() => {
    console.log(`[CodeReviewBot] loadPRs effect: isConnected=${isConnected}, workspace="${workspace}", repoSlug="${repoSlug}"`)
    if (isConnected && workspace && repoSlug) {
      loadPRs(workspace, repoSlug, 1)
    }
  }, [workspace, repoSlug, isConnected, loadPRs])

  // Load file counts once PRs are loaded
  useEffect(() => {
    if (isConnected && workspace && repoSlug && pullRequests.length > 0) {
      loadFileCounts(workspace, repoSlug)
    }
  }, [isConnected, workspace, repoSlug, pullRequests, loadFileCounts])

  // Load persisted sessions when repo changes
  useEffect(() => {
    if (workspace && repoSlug) {
      loadPersistedSessions(workspace, repoSlug)
    }
  }, [workspace, repoSlug, loadPersistedSessions])

  // Activity integration: log review completion or error
  useEffect(() => {
    if (!selectedPR) return
    const status = currentSession?.status

    if (status === 'complete') {
      const sessionComments = currentSession.comments ?? []
      const commentCount = sessionComments.length
      const durationMs = Date.now() - new Date(currentSession.startedAt).getTime()

      addActivity({
        pluginId: 'code-review-bot',
        operation: 'PR Review',
        status: commentCount > 0 ? 'success' : 'failure',
        durationMs,
        detail: commentCount > 0
          ? `Reviewed PR #${selectedPR.id} — ${commentCount} comments`
          : `Reviewed PR #${selectedPR.id} — no comments parsed (check console for AI output)`
      })

      addHistoryEntry({
        prId: selectedPR.id,
        prTitle: selectedPR.title,
        prUrl: selectedPR.links.html.href,
        workspace,
        repoSlug,
        commentCount,
        postedCount: sessionComments.filter((c) => c.posted).length,
        status: commentCount > 0 ? 'success' : 'partial'
      })
    } else if (status === 'error') {
      addActivity({
        pluginId: 'code-review-bot',
        operation: 'PR Review',
        status: 'failure',
        detail: `PR #${selectedPR.id} — ${currentSession?.error ?? 'unknown error'}`
      })

      addHistoryEntry({
        prId: selectedPR.id,
        prTitle: selectedPR.title,
        prUrl: selectedPR.links.html.href,
        workspace,
        repoSlug,
        commentCount: 0,
        postedCount: 0,
        status: 'error'
      })
    }
    // Only run when session status changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSession?.status])

  // NOTE: Stream listeners are managed by the review store (set up in startReview,
  // removed when stream completes/errors). We intentionally do NOT remove them on
  // unmount so that reviews continue streaming in the background when the user
  // navigates away from the CodeReviewBot screen.

  const clearSession = useReviewStore((s) => s.clearSession)

  const handlePRSelect = useCallback(
    (pr: PullRequest) => {
      selectPR(pr)
      setActiveTab('diff')
      if (workspace && repoSlug) {
        loadDiff(workspace, repoSlug, pr.id)
      }
    },
    [selectPR, loadDiff, workspace, repoSlug]
  )

  const handleStartReview = useCallback(() => {
    if (!agent) return
    // Pass CLI command + guidelines to the review
    startReview(agent.id, agent.model, agent.command || undefined, reviewGuidelines || undefined)
    setActiveTab('review')
  }, [agent, startReview, reviewGuidelines])

  const handleRefreshPRs = useCallback(() => {
    if (workspace && repoSlug) {
      loadPRs(workspace, repoSlug, prPage)
    }
  }, [loadPRs, workspace, repoSlug, prPage])

  const handlePageChange = useCallback(
    (page: number) => {
      if (workspace && repoSlug) {
        loadPRs(workspace, repoSlug, page)
      }
    },
    [loadPRs, workspace, repoSlug]
  )

  const handleNewReview = useCallback(() => {
    if (!selectedPR) return
    clearSession(selectedPR.id)
  }, [clearSession, selectedPR])

  const handlePostAll = useCallback(() => {
    if (!selectedPR || !workspace || !repoSlug) return
    postAllComments(workspace, repoSlug, selectedPR.id)
  }, [postAllComments, selectedPR, workspace, repoSlug])

  const handleHistoryOpen = useCallback(
    async (entry: ReviewHistoryEntry) => {
      await restoreSessionFromHistory(entry)
      setActiveTab('review')
    },
    [restoreSessionFromHistory]
  )

  const handleCommentClick = useCallback(
    (comment: ReviewComment) => {
      if (!selectedPR || !workspace || !repoSlug) return
      postComment(workspace, repoSlug, selectedPR.id, comment)
    },
    [postComment, selectedPR, workspace, repoSlug]
  )

  // Show a status indicator on the Review tab when a session exists
  const reviewTabLabel = currentSession
    ? currentSession.status === 'streaming'
      ? 'Review ●'
      : currentSession.status === 'complete'
        ? `Review (${(currentSession.comments ?? []).length})`
        : 'Review'
    : 'Review'

  const tabs: { key: Tab; label: string }[] = [
    { key: 'diff', label: 'Diff' },
    { key: 'review', label: reviewTabLabel },
    { key: 'history', label: 'History' }
  ]

  const handleRepoSwitch = useCallback(
    (index: number) => {
      setSelectedRepoIndex(index)
      // Clear current PR selection and session when switching repos
      selectPR(null as unknown as PullRequest)
    },
    [selectPR]
  )

  return (
    <div className="flex h-full flex-col">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-text-primary">CodeReviewBot</h1>

          {/* Repo toggle — always visible */}
          {effectiveRepos.length > 0 && (
            <div className="relative flex items-center">
              <GitFork size={14} className="absolute left-2.5 text-text-secondary pointer-events-none" />
              {effectiveRepos.length === 1 ? (
                <span className="rounded-md border border-border bg-surface-elevated py-1.5 pl-8 pr-3 text-xs text-text-secondary">
                  {workspace} / {repoSlug}
                </span>
              ) : (
                <div className="relative">
                  <select
                    className="appearance-none rounded-md border border-border bg-surface-elevated py-1.5 pl-8 pr-7 text-xs text-text-primary transition focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent cursor-pointer hover:border-accent/50"
                    value={selectedRepoIndex}
                    onChange={(e) => handleRepoSwitch(Number(e.target.value))}
                  >
                    {effectiveRepos.map((repo, i) => (
                      <option key={`${repo.workspace}/${repo.repoSlug}`} value={i}>
                        {repo.workspace} / {repo.repoSlug}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
                </div>
              )}
            </div>
          )}
          {effectiveRepos.length === 0 && (
            <span className="text-xs text-text-secondary/60">
              No repos configured
            </span>
          )}
        </div>

        <SettingsPanel
          isConnected={isConnected}
          onConnect={connect}
          onDisconnect={disconnect}
          isConnecting={isConnecting}
          connectionError={connectionError}
        />
      </div>

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel: PR list */}
        <div className="w-1/3 overflow-y-auto border-r border-border p-3">
          <PRList
            pullRequests={pullRequests}
            isLoading={isLoadingPRs}
            error={prError}
            onSelect={handlePRSelect}
            onRefresh={handleRefreshPRs}
            selectedPrId={selectedPR?.id}
            page={prPage}
            totalPages={prTotalPages}
            totalCount={prTotalCount}
            onPageChange={handlePageChange}
            fileCounts={prFileCounts}
          />
        </div>

        {/* Right panel: tabbed content */}
        <div className="flex w-2/3 flex-col overflow-hidden">
          {/* Tab switcher */}
          <div className="flex border-b border-border">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'border-b-2 border-accent text-accent'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {tab.key === 'review' && currentSession?.status === 'streaming' && (
                  <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-accent" />
                )}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto p-3">
            {activeTab === 'diff' && (
              <PRDiffView
                diffFiles={diffFiles}
                reviewComments={currentSession?.comments ?? []}
                onCommentClick={handleCommentClick}
              />
            )}
            {activeTab === 'review' && (
              <ReviewPanel
                session={currentSession}
                onStart={handleStartReview}
                onCancel={cancelReview}
                onPostAll={handlePostAll}
                onNewReview={handleNewReview}
                onUpdateComment={updateComment}
                isConnected={isConnected}
                hasAgent={hasAgent}
              />
            )}
            {activeTab === 'history' && (
              <ReviewHistory history={history} isLoading={isLoadingHistory} onOpen={handleHistoryOpen} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
