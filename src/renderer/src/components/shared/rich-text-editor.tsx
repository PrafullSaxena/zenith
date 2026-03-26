import { useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import Image from '@tiptap/extension-image'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableHeader from '@tiptap/extension-table-header'
import TableCell from '@tiptap/extension-table-cell'
import { common, createLowlight } from 'lowlight'
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Link as LinkIcon,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Quote,
  FileCode
} from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import { Button } from '@renderer/components/ui/button'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RichTextEditorProps {
  content: string
  onChange: (content: string) => void
  placeholder?: string
  mode: 'full' | 'minimal'
  className?: string
}

// ---------------------------------------------------------------------------
// Lowlight instance
// ---------------------------------------------------------------------------

const lowlight = createLowlight(common)

// ---------------------------------------------------------------------------
// Toolbar Button
// ---------------------------------------------------------------------------

function ToolbarButton({
  active,
  onClick,
  children,
  title
}: {
  active?: boolean
  onClick: () => void
  children: React.ReactNode
  title?: string
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      title={title}
      className={cn(
        'h-7 w-7 p-0',
        active && 'bg-primary/20 text-primary'
      )}
    >
      {children}
    </Button>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RichTextEditor({
  content,
  onChange,
  placeholder: placeholderText,
  mode,
  className
}: RichTextEditorProps): React.JSX.Element {
  const extensions = [
    StarterKit.configure({
      codeBlock: false // replaced by CodeBlockLowlight in full mode
    }),
    Link.configure({
      openOnClick: false,
      HTMLAttributes: {
        class: 'text-primary underline underline-offset-2 hover:text-primary/80 cursor-pointer'
      }
    }),
    Placeholder.configure({
      placeholder: placeholderText ?? 'Start writing...',
      emptyEditorClass: 'before:content-[attr(data-placeholder)] before:text-muted-foreground before:float-left before:h-0 before:pointer-events-none'
    }),
    ...(mode === 'full'
      ? [
          CodeBlockLowlight.configure({ lowlight }),
          Image,
          Table.configure({ resizable: false }),
          TableRow,
          TableHeader,
          TableCell
        ]
      : [])
  ]

  const editor = useEditor({
    extensions,
    content,
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getHTML())
    },
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-invert prose-sm max-w-none p-4 min-h-[120px] focus:outline-none',
          '[&_table]:border-collapse [&_td]:border [&_td]:border-border [&_td]:p-2',
          '[&_th]:border [&_th]:border-border [&_th]:p-2 [&_th]:bg-secondary'
        )
      }
    }
  })

  // Sync content when it changes externally
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content, false)
    }
  }, [content, editor])

  if (!editor) return <div />

  const wordCount = editor.state.doc.textContent.split(/\s+/).filter(Boolean).length

  return (
    <div className={cn('rounded-2xl border border-border bg-card overflow-hidden', className)}>
      {/* Minimal mode: inline toolbar */}
      {mode === 'minimal' && (
        <div className="flex items-center gap-1 px-3 py-2 border-b border-border bg-secondary/30">
          <ToolbarButton
            active={editor.isActive('bold')}
            onClick={() => editor.chain().focus().toggleBold().run()}
            title="Bold"
          >
            <Bold size={14} />
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive('italic')}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            title="Italic"
          >
            <Italic size={14} />
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive('bulletList')}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            title="Bullet List"
          >
            <List size={14} />
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive('orderedList')}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            title="Ordered List"
          >
            <ListOrdered size={14} />
          </ToolbarButton>
        </div>
      )}

      {/* Full mode: floating toolbar via BubbleMenu */}
      {mode === 'full' && (
        <BubbleMenu
          editor={editor}
          tippyOptions={{ duration: 100 }}
          className="flex items-center gap-1 bg-card border border-border rounded-xl p-1 shadow-lg"
        >
          <ToolbarButton
            active={editor.isActive('bold')}
            onClick={() => editor.chain().focus().toggleBold().run()}
            title="Bold"
          >
            <Bold size={14} />
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive('italic')}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            title="Italic"
          >
            <Italic size={14} />
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive('strike')}
            onClick={() => editor.chain().focus().toggleStrike().run()}
            title="Strikethrough"
          >
            <Strikethrough size={14} />
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive('code')}
            onClick={() => editor.chain().focus().toggleCode().run()}
            title="Inline Code"
          >
            <Code size={14} />
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive('link')}
            onClick={() => {
              const url = window.prompt('URL')
              if (url) editor.chain().focus().setLink({ href: url }).run()
            }}
            title="Link"
          >
            <LinkIcon size={14} />
          </ToolbarButton>
          <div className="w-px h-5 bg-border mx-0.5" />
          <ToolbarButton
            active={editor.isActive('heading', { level: 1 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            title="Heading 1"
          >
            <Heading1 size={14} />
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive('heading', { level: 2 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            title="Heading 2"
          >
            <Heading2 size={14} />
          </ToolbarButton>
          <div className="w-px h-5 bg-border mx-0.5" />
          <ToolbarButton
            active={editor.isActive('bulletList')}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            title="Bullet List"
          >
            <List size={14} />
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive('orderedList')}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            title="Ordered List"
          >
            <ListOrdered size={14} />
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive('blockquote')}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            title="Blockquote"
          >
            <Quote size={14} />
          </ToolbarButton>
          <ToolbarButton
            active={editor.isActive('codeBlock')}
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            title="Code Block"
          >
            <FileCode size={14} />
          </ToolbarButton>
        </BubbleMenu>
      )}

      {/* Editor content */}
      <EditorContent editor={editor} />

      {/* Word count footer (minimal mode only) */}
      {mode === 'minimal' && (
        <div className="text-xs text-muted-foreground text-right py-1 px-3 border-t border-border">
          {wordCount} {wordCount === 1 ? 'word' : 'words'}
        </div>
      )}
    </div>
  )
}
