import { useRef, useState } from 'react'
import { SafeImage } from '@/components/shared/SafeImage'
import { IconPicker } from '@/components/shared/IconPicker'
import { Upload, X, ImageIcon, Smile } from 'lucide-react'
import { Icon } from '@iconify/react'

export type ImageFieldSize = 'sm' | 'md' | 'lg' | 'xl'

const SIZE_CLASSES: Record<ImageFieldSize, string> = {
  sm: 'w-16 h-16',
  md: 'w-24 h-24',
  lg: 'w-32 h-32',
  xl: 'w-40 h-40',
}

interface ImageFieldProps {
  label: string
  value: string
  onChange: (v: string) => void
  size?: ImageFieldSize
  /** 支持 icon（当 value 是 iconify 图标名时显示图标，也可切换图片/icon 模式） */
  iconMode?: boolean
  /** 上传回调：返回上传后的 URL */
  onUpload?: (file: File) => Promise<string>
  placeholder?: string
}

/**
 * 统一图片/图标字段组件
 * - 一致的图片预览尺寸
 * - 支持 URL 输入和本地文件上传
 * - iconMode 下支持图片 / icon 模式切换，icon 模式带 IconPicker 搜索
 * - 图片加载失败时自动使用 API 回退
 */
export function ImageField({
  label,
  value,
  onChange,
  size = 'md',
  iconMode = false,
  onUpload,
  placeholder = '输入图片 URL',
}: ImageFieldProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  // 判断当前值是 icon 还是图片
  const isIconValue = value && value.includes(':') && !value.startsWith('http')
  // iconMode 时，默认根据 value 判断模式；没有 value 时默认图片模式
  const [mode, setMode] = useState<'image' | 'icon'>(isIconValue ? 'icon' : 'image')

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (onUpload) {
      setUploading(true)
      try {
        const url = await onUpload(file)
        setMode('image')
        onChange(url)
      } catch {
        const preview = URL.createObjectURL(file)
        setMode('image')
        onChange(preview)
      } finally {
        setUploading(false)
      }
    } else {
      const reader = new FileReader()
      reader.onload = () => {
        setMode('image')
        onChange(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
    if (fileRef.current) fileRef.current.value = ''
  }

  const sizeClass = SIZE_CLASSES[size]

  return (
    <div className="form-control w-full">
      <label className="label py-1.5">
        <span className="label-text text-xs font-semibold tracking-wide uppercase text-primary/60">{label}</span>
      </label>
      <div className="flex flex-col items-center gap-2">
        {/* 预览区 */}
        <div className={`${sizeClass} rounded-xl overflow-hidden bg-base-200 ring-2 ring-base-100 shadow-md flex items-center justify-center relative`}>
          {mode === 'icon' && value ? (
            <Icon icon={value} className="w-1/2 h-1/2" />
          ) : value ? (
            <SafeImage
              src={value}
              alt={label}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center gap-1 text-base-content/20">
              <Upload className="w-6 h-6" />
              <span className="text-[10px]">暂无</span>
            </div>
          )}
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-base-100/60 rounded-xl">
              <span className="loading loading-spinner loading-sm text-primary" />
            </div>
          )}
        </div>

        {/* iconMode 模式切换按钮 */}
        {iconMode && (
          <div className="join bg-base-200 p-0.5 rounded-lg">
            <button
              type="button"
              className={`join-item btn btn-xs ${mode === 'image' ? 'btn-active' : 'btn-ghost'} gap-1`}
              onClick={() => setMode('image')}
              title="图片模式"
            >
              <ImageIcon className="w-3 h-3" /> 图片
            </button>
            <button
              type="button"
              className={`join-item btn btn-xs ${mode === 'icon' ? 'btn-active' : 'btn-ghost'} gap-1`}
              onClick={() => setMode('icon')}
              title="图标模式"
            >
              <Smile className="w-3 h-3" /> 图标
            </button>
          </div>
        )}

        {/* 输入区 */}
        <div className="flex gap-1 w-full">
          {(!iconMode || mode === 'image') ? (
            <>
              <input
                type="text"
                className="input input-bordered input-sm flex-1 text-xs"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
              />
              {value && (
                <button
                  type="button"
                  className="btn btn-ghost btn-xs btn-square"
                  onClick={() => onChange('')}
                  title="清除"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
              <button
                type="button"
                className="btn btn-ghost btn-xs btn-square"
                onClick={() => fileRef.current?.click()}
                title="上传图片"
                disabled={uploading}
              >
                <Upload className="w-3 h-3" />
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </>
          ) : (
            <div className="flex-1">
              <IconPicker
                value={value}
                onChange={(icon) => onChange(icon)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}