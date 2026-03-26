import { useState, useRef, useEffect, useCallback } from 'react'
import { Send } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@renderer/lib/utils'
import { Button } from '@renderer/components/ui/button'
import { Card } from '@renderer/components/ui/card'
import { Textarea } from '@renderer/components/ui/textarea'
import { ScrollArea } from '@renderer/components/ui/scroll-area'
import { ContentRenderer } from '@renderer/components/shared/content-renderer'
import type { LucideIcon } from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  citations?: { label: string; onClick: () => void }[]
  actions?: { label: string; icon?: LucideIcon; onClick: () => void }[]
  timestamp?: Date
}

export interface ChatInterfaceProps {
  messages: ChatMessage[]
  onSend: (message: string) => void
  isStreaming?: boolean
  placeholder?: string
  suggestedQuestions?: string[]
  renderActions?: (message: ChatMessage) => React.ReactNode
  className?: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ChatInterface({
  messages,
  onSend,
  isStreaming = false,
  placeholder = 'Type a message...',
  suggestedQuestions,
  renderActions,
  className
}: ChatInterfaceProps): React.JSX.Element {
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll on new messages or streaming changes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, isStreaming])

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = 'auto'
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`
  }, [input])

  const handleSend = useCallback(() => {
    const trimmed = input.trim()
    if (!trimmed || isStreaming) return
    onSend(trimmed)
    setInput('')
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [input, isStreaming, onSend])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const showTypingIndicator =
    isStreaming && (messages.length === 0 || messages[messages.length - 1].role !== 'assistant')

  const isEmpty = messages.length === 0

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Messages area */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Empty state with suggested questions */}
          {isEmpty && suggestedQuestions && suggestedQuestions.length > 0 && (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-sm text-muted-foreground mb-4">Suggested questions</p>
              <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                {suggestedQuestions.map((question, i) => (
                  <Button
                    key={i}
                    variant="outline"
                    className="rounded-full text-sm"
                    onClick={() => onSend(question)}
                  >
                    {question}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Empty state without suggestions */}
          {isEmpty && (!suggestedQuestions || suggestedQuestions.length === 0) && (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm text-muted-foreground">Start a conversation</p>
            </div>
          )}

          {/* Messages */}
          {messages.map((msg, i) => (
            <div
              key={msg.id}
              className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}
            >
              {msg.role === 'user' ? (
                <div className="bg-primary/15 text-foreground rounded-2xl rounded-br-md px-4 py-2.5 max-w-[80%]">
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
              ) : (
                <Card className="rounded-2xl rounded-bl-md p-4 max-w-[85%] border border-border">
                  <ContentRenderer
                    content={msg.content}
                    isStreaming={isStreaming && i === messages.length - 1}
                    citationLinks={msg.citations}
                  />
                  {/* Custom actions from renderActions */}
                  {renderActions && (
                    <div className="mt-2">{renderActions(msg)}</div>
                  )}
                  {/* Message-level actions */}
                  {msg.actions && msg.actions.length > 0 && (
                    <div className="flex gap-2 mt-2">
                      {msg.actions.map((action, ai) => {
                        const Icon = action.icon
                        return (
                          <Button key={ai} variant="ghost" size="sm" onClick={action.onClick}>
                            {Icon && <Icon size={14} className="mr-1" />}
                            {action.label}
                          </Button>
                        )
                      })}
                    </div>
                  )}
                </Card>
              )}
            </div>
          ))}

          {/* Typing indicator */}
          {showTypingIndicator && (
            <div className="flex justify-start">
              <div className="flex gap-1.5 px-4 py-3">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="size-2 rounded-full bg-muted-foreground"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                  />
                ))}
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Input area */}
      <div className="flex items-end gap-2 p-4 border-t border-border flex-shrink-0">
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 min-h-[40px] max-h-[120px] resize-none rounded-2xl bg-card border border-border px-4 py-3"
          rows={1}
        />
        <Button
          size="icon"
          disabled={!input.trim() || isStreaming}
          onClick={handleSend}
          className="shrink-0 rounded-xl"
        >
          <Send size={18} />
        </Button>
      </div>
    </div>
  )
}
