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
import type { PullRequest } from '../../types/bitbucket'
import type { ReviewComment } from '../../types/review'

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
  const pullRequests = useReviewStore((s) => s.pullRequests)
  const isLoadingPRs = useReviewStore((s) => s.isLoadingPRs)
  const selectedPR = useReviewStore((s) => s.selectedPR)
  const diffFiles = useReviewStore((s) => s.diffFiles)
  const currentSession = useReviewStore((s) => s.currentSession)
  const history = useReviewStore((s) => s.history)
  const isLoadingHistory = useReviewStore((s) => s.isLoadingHistory)

  const connect = useReviewStore((s) => s.connect)
  const disconnect = useReviewStore((s) => s.disconnect)
  const checkConnection = useReviewStore((s) => s.checkConnection)
  const loadPRs = useReviewStore((s) => s.loadPRs)
  const selectPR = useReviewStore((s) => s.selectPR)
  const loadDiff = useReviewStore((s) => s.loadDiff)
  const startReview = useReviewStore((s) => s.startReview)
  const cancelReview = useReviewStore((s) => s.cancelReview)
  const postComment = useReviewStore((s) => s.postComment)
  const postAllComments = useReviewStore((s) => s.postAllComments)
  const loadHistory = useReviewStore((s) => s.loadHistory)
  const addHistoryEntry = useReviewStore((s) => s.addHistoryEntry)

  // Settings store for workspace/repo config
  const getSetting = useSettingsStore((s) => s.getSetting)
  const workspace = (getSetting('plugins.code-review-bot.bitbucketWorkspace') as string) || ''
  const repoSlug = (getSetting('plugins.code-review-bot.repositorySlug') as string) || ''
  const defaultAgentId = (getSetting('plugins.code-review-bot.defaultAgent') as string) || ''

  // Agent store for configured AI provider
  const providers = useAgentStore((s) => s.providers)
  const agent = defaultAgentId
    ? providers.find((p) => p.id === defaultAgentId)
    : providers.find((p) => p.status === 'connected' || p.hasApiKey)
  const hasAgent = !!agent

  // Activity store
  const addActivity = useActivityStore((s) => s.addEntry)

  // On mount: check connection and load history
  useEffect(() => {
    checkConnection()
    loadHistory()
  }, [checkConnection, loadHistory])

  // Load PRs when connected and workspace/repo configured
  useEffect(() => {
    if (isConnected && workspace && repoSlug) {
      loadPRs(workspace, repoSlug)
    }
  }, [isConnected, workspace, repoSlug, loadPRs])

  // Activity integration: log review completion
  useEffect(() => {
    if (currentSession?.status === 'complete' && selectedPR) {
      const commentCount = currentSession.comments.length
      const durationMs = Date.now() - new Date(currentSession.startedAt).getTime()

      addActivity({
        pluginId: 'code-review-bot',
        operation: 'PR Review',
        status: commentCount > 0 ? 'success' : 'failure',
        durationMs,
        detail: `Reviewed PR #${selectedPR.id}`
      })

      addHistoryEntry({
        prId: selectedPR.id,
        prTitle: selectedPR.title,
        prUrl: selectedPR.links.html.href,
        workspace,
        repoSlug,
        commentCount,
        postedCount: currentSession.comments.filter((c) => c.posted).length,
        status: commentCount > 0 ? 'success' : 'error'
      })
    }
    // Only run when session status changes to 'complete'
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSession?.status])

  // Clean up IPC listeners on unmount
  useEffect(() => {
    return () => {
      window.api.ai.removeStreamListeners()
    }
  }, [])

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
    startReview(agent.id, agent.model)
    setActiveTab('review')
  }, [agent, startReview])

  const handlePostAll = useCallback(() => {
    if (!selectedPR || !workspace || !repoSlug) return
    postAllComments(workspace, repoSlug, selectedPR.id)
  }, [postAllComments, selectedPR, workspace, repoSlug])

  const handleCommentClick = useCallback(
    (comment: ReviewComment) => {
      if (!selectedPR || !workspace || !repoSlug) return
      postComment(workspace, repoSlug, selectedPR.id, comment)
    },
    [postComment, selectedPR, workspace, repoSlug]
  )

  const tabs: { key: Tab; label: string }[] = [
    { key: 'diff', label: 'Diff' },
    { key: 'review', label: 'Review' },
    { key: 'history', label: 'History' }
  ]

  return (
    <div className="flex h-full flex-col">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h1 className="text-lg font-semibold text-text-primary">CodeReviewBot</h1>
        <SettingsPanel
          isConnected={isConnected}
          onConnect={connect}
          onDisconnect={disconnect}
          isConnecting={isConnecting}
        />
      </div>

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel: PR list */}
        <div className="w-1/3 overflow-y-auto border-r border-border p-3">
          <PRList
            pullRequests={pullRequests}
            isLoading={isLoadingPRs}
            onSelect={handlePRSelect}
            selectedPrId={selectedPR?.id}
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
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'border-b-2 border-accent text-accent'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
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
                isConnected={isConnected}
                hasAgent={hasAgent}
              />
            )}
            {activeTab === 'history' && (
              <ReviewHistory history={history} isLoading={isLoadingHistory} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
