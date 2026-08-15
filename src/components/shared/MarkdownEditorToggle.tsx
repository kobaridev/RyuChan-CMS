import { useState } from 'react'
import { MarkdownEditor } from '@/components/shared/MarkdownEditor'
import { MarkdownPreview } from '@/components/shared/MarkdownPreview'
import { Edit3, Eye, Columns } from 'lucide-react'

type Mode = 'edit' | 'preview' | 'split'

interface MarkdownEditorToggleProps {
  value: string
  onChange: (v: string) => void
  minHeight?: string
  /** Shiki 高亮主题，对应站点配置的 site.theme.code */
  codeTheme?: string
}

export function MarkdownEditorToggle({ value, onChange, minHeight = '400px', codeTheme }: MarkdownEditorToggleProps) {
  const [mode, setMode] = useState<Mode>('split')
  return (
    <div className="space-y-2">
      {/* 工具栏 */}
      <div className="flex items-center gap-2">
        <div className="join bg-base-200 p-1.5 rounded-xl shadow-sm">
          <button
            className={`join-item btn btn-sm gap-1 px-4 ${mode === 'edit' ? 'btn-active' : 'btn-ghost'}`}
            onClick={() => setMode('edit')}
            title="仅编辑"
          >
            <Edit3 className="w-4 h-4" />
            <span className="text-xs">编辑</span>
          </button>
          <button
            className={`join-item btn btn-sm gap-1 px-4 ${mode === 'preview' ? 'btn-active' : 'btn-ghost'}`}
            onClick={() => setMode('preview')}
            title="仅预览"
          >
            <Eye className="w-4 h-4" />
            <span className="text-xs">预览</span>
          </button>
          <button
            className={`join-item btn btn-sm gap-1 px-4 ${mode === 'split' ? 'btn-active' : 'btn-ghost'}`}
            onClick={() => setMode('split')}
            title="分屏"
          >
            <Columns className="w-4 h-4" />
            <span className="text-xs">分屏</span>
          </button>
        </div>
      </div>

      {/* 内容区 */}
      {mode === 'edit' && (
        <div className="rounded-xl border border-base-300 overflow-hidden bg-base-100" style={{ minHeight }}>
          <MarkdownEditor value={value} onChange={onChange} />
        </div>
      )}
      {mode === 'preview' && (
        <div className="rounded-xl border border-base-300 overflow-hidden bg-base-100 p-6" style={{ minHeight }}>
          <MarkdownPreview content={value} codeTheme={codeTheme} />
        </div>
      )}
      {mode === 'split' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" style={{ minHeight }}>
          <div className="rounded-xl border border-base-300 overflow-hidden bg-base-100">
            <MarkdownEditor value={value} onChange={onChange} />
          </div>
          <div className="rounded-xl border border-base-300 overflow-hidden bg-base-100 p-6">
            <MarkdownPreview content={value} codeTheme={codeTheme} />
          </div>
        </div>
      )}
    </div>
  )
}
