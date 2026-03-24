import { useState, useRef, useEffect, type ReactNode } from 'react'
import { Send } from 'lucide-react'
import { GlassBadge } from './GlassBadge'
import { GlassInput } from './GlassInput'
import { GlassButton } from './GlassButton'
import { cn } from './glass-utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GlassChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  citations?: Array<{ label: string; onClick?: () => void }>
}

export interface GlassChatProps {
  messages: GlassChatMessage[]
  onSend: (message: string) => void
  isStreaming?: boolean
  placeholder?: string
  className?: string
  renderContent?: (content: string) => ReactNode
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function GlassChat({
  messages,
  onSend,
  isStreaming = false,
  placeholder = 'Type a message...',
  className,
  renderContent
}: GlassChatProps) {
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages.length])

  const handleSend = () => {
    const trimmed = input.trim()
    if (!trimmed || isStreaming) return
    onSend(trimmed)
    setInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const showTypingIndicator =
    isStreaming && (messages.length === 0 || messages[messages.length - 1].role !== 'assistant')

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Message list */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 p-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}
          >
            <div
              className={cn(
                'max-w-[80%]',
                msg.role === 'user'
                  ? 'bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20 rounded-2xl rounded-br-sm p-3'
                  : 'bg-white/[0.03] border border-white/[0.06] rounded-2xl rounded-bl-sm p-3'
              )}
            >
              <div className="text-sm text-[var(--text-primary)]">
                {msg.role === 'assistant' && renderContent
                  ? renderContent(msg.content)
                  : msg.content}
              </div>
              {msg.citations && msg.citations.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {msg.citations.map((cite, i) => (
                    <GlassBadge
                      key={i}
                      variant="accent"
                      className={cite.onClick ? 'cursor-pointer' : undefined}
                      onClick={cite.onClick}
                    >
                      {cite.label}
                    </GlassBadge>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {showTypingIndicator && (
          <div className="flex justify-start">
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl rounded-bl-sm p-3">
              <div className="flex gap-1.5 items-center">
                <span
                  className="w-2 h-2 rounded-full bg-[var(--text-secondary)]/60 animate-pulse"
                  style={{ animationDelay: '0ms' }}
                />
                <span
                  className="w-2 h-2 rounded-full bg-[var(--text-secondary)]/60 animate-pulse"
                  style={{ animationDelay: '150ms' }}
                />
                <span
                  className="w-2 h-2 rounded-full bg-[var(--text-secondary)]/60 animate-pulse"
                  style={{ animationDelay: '300ms' }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="flex gap-2 p-4 pt-2">
        <GlassInput
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1"
        />
        <GlassButton
          variant="primary"
          size="md"
          disabled={!input.trim() || isStreaming}
          onClick={handleSend}
          aria-label="Send message"
        >
          <Send size={16} />
        </GlassButton>
      </div>
    </div>
  )
}
