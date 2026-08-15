import { useState } from 'react'
import { MarkdownEditor } from '@/components/shared/MarkdownEditor'
import { MarkdownPreview } from '@/components/shared/MarkdownPreview'
import { Edit3, Eye, Columns } from 'lucide-react'

type Mode = 'edit' | 'preview' | 'split'

interface MarkdownEditorToggleProps {
  value: string
  onChange: (v: string) => void
  minHeight?: string
}

/**
 * Markdown 编辑器 - 按钮切换编辑/预览/分屏，支持实时渲染开关
 */
export function MarkdownEditorToggle({ value, onChange, minHeight = '400px' }: MarkdownEditorToggleProps) {
  const [mode, setMode] = useState<Mode>('split')
  const [realtime, setRealtime] = useState(true)

  return (
    <div className="space-y-2">
      {/* 工具栏 */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="join bg-base-200 p-1 rounded-lg">
          <button
            className={`join-item btn btn-xs ${mode === 'edit' ? 'btn-active' : 'btn-ghost'}`}
            onClick={() => setMode('edit')}
            title="仅编辑"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button
            className={`join-item btn btn-xs ${mode === 'preview' ? 'btn-active' : 'btn-ghost'}`}
            onClick={() => setMode('preview')}
            title="仅预览"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button
            className={`join-item btn btn-xs ${mode === 'split' ? 'btn-active' : 'btn-ghost'}`}
            onClick={() => setMode('split')}
            title="分屏"
          >
            <Columns className="w-3.5 h-3.5" />
          </button>
        </div>

        {mode === 'split' && (
          <label className="flex items-center gap-1.5 cursor-pointer">
            <span className="text-xs text-base-content/60">实时渲染</span>
            <input
              type="checkbox"
              className="toggle toggle-xs toggle-primary"
              checked={realtime}
              onChange={(e) => setRealtime(e.target.checked)}
            />
          </label>
        )}
      </div>

      {/* 内容区 */}
      {mode === 'edit' && (
        <div className="rounded-xl border border-base-300 overflow-hidden bg-base-100" style={{ minHeight }}>
          <MarkdownEditor value={value} onChange={onChange} />
        </div>
      )}
      {mode === 'preview' && (
        <div className="rounded-xl border border-base-300 overflow-hidden bg-base-100 p-6" style={{ minHeight }}>
          <MarkdownPreview content={value} />
        </div>
      )}
      {mode === 'split' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" style={{ minHeight }}>
          <div className="rounded-xl border border-base-300 overflow-hidden bg-base-100">
            <MarkdownEditor value={value} onChange={onChange} />
          </div>
          <div className="rounded-xl border border-base-300 overflow-hidden bg-base-100 p-6">
            <MarkdownPreview content={realtime ? value : value} />
          </div>
        </div>
      )}
    </div>
  )
}