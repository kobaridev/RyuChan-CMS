import { Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react'

interface FieldSchema {
  type: string
  title?: string
  format?: string
  enum?: string[]
  default?: unknown
  description?: string
  items?: FieldSchema
  properties?: Record<string, FieldSchema>
  required?: string[]
}

interface FormFieldProps {
  schema: FieldSchema
  value: unknown
  onChange: (value: unknown) => void
  path?: string
  required?: boolean
}

export function FormField({ schema, value, onChange, path = '', required }: FormFieldProps) {
  const label = schema.title || path.split('.').pop() || ''

  // String
  if (schema.type === 'string') {
    if (schema.enum) {
      return (
        <div className="form-control w-full">
          <label className="label py-1">
            <span className="label-text text-sm font-medium">
              {label}
              {required && <span className="text-error ml-1">*</span>}
            </span>
          </label>
          <select
            className="select select-bordered select-sm w-full"
            value={String(value || '')}
            onChange={(e) => onChange(e.target.value)}
          >
            <option value="">-- 选择 --</option>
            {schema.enum.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      )
    }

    if (schema.format === 'date') {
      return (
        <div className="form-control w-full">
          <label className="label py-1">
            <span className="label-text text-sm font-medium">
              {label}
              {required && <span className="text-error ml-1">*</span>}
            </span>
          </label>
          <input
            type="date"
            className="input input-bordered input-sm w-full"
            value={String(value || '')}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      )
    }

    if (schema.format === 'uri-reference') {
      return (
        <div className="form-control w-full">
          <label className="label py-1">
            <span className="label-text text-sm font-medium">
              {label}
              {required && <span className="text-error ml-1">*</span>}
            </span>
          </label>
          <div className="flex gap-1">
            <input
              type="text"
              className="input input-bordered input-sm flex-1 font-mono text-xs"
              value={String(value || '')}
              onChange={(e) => onChange(e.target.value)}
              placeholder={schema.description || '输入 URL 或路径'}
            />
            {String(value || '').match(/^https?:\/\//) && (
              <a
                href={String(value)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost btn-sm btn-square"
                title="预览"
              >
                🔗
              </a>
            )}
          </div>
        </div>
      )
    }

    // 多行文本
    if (label === '描述' || label === 'description' || label === '描述') {
      return (
        <div className="form-control w-full">
          <label className="label py-1">
            <span className="label-text text-sm font-medium">
              {label}
              {required && <span className="text-error ml-1">*</span>}
            </span>
          </label>
          <textarea
            className="textarea textarea-bordered textarea-sm w-full"
            rows={3}
            value={String(value || '')}
            onChange={(e) => onChange(e.target.value)}
            placeholder={schema.description}
          />
        </div>
      )
    }

    return (
      <div className="form-control w-full">
        <label className="label py-1">
          <span className="label-text text-sm font-medium">
            {label}
            {required && <span className="text-error ml-1">*</span>}
          </span>
          {schema.description && (
            <span className="label-text-alt text-base-content/40">{schema.description}</span>
          )}
        </label>
        <input
          type="text"
          className="input input-bordered input-sm w-full"
          value={String(value || '')}
          onChange={(e) => onChange(e.target.value)}
          placeholder={schema.description}
        />
      </div>
    )
  }

  // Boolean
  if (schema.type === 'boolean') {
    return (
      <div className="form-control">
        <label className="label cursor-pointer gap-3 py-1">
          <span className="label-text text-sm font-medium">{label}</span>
          <input
            type="checkbox"
            className="toggle toggle-primary toggle-sm"
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
          />
        </label>
      </div>
    )
  }

  // Array of strings
  if (schema.type === 'array' && schema.items?.type === 'string') {
    const arr = Array.isArray(value) ? value as string[] : []
    return (
      <div className="form-control w-full">
        <label className="label py-1">
          <span className="label-text text-sm font-medium">
            {label}
            {required && <span className="text-error ml-1">*</span>}
          </span>
        </label>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {arr.map((item, idx) => (
            <span key={idx} className="badge badge-primary gap-1">
              {item}
              <button
                className="ml-0.5 hover:text-error"
                onClick={() => {
                  const newArr = [...arr]
                  newArr.splice(idx, 1)
                  onChange(newArr)
                }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-1">
          <input
            type="text"
            className="input input-bordered input-sm flex-1"
            placeholder="输入后按回车添加"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                const val = (e.target as HTMLInputElement).value.trim()
                if (val && !arr.includes(val)) {
                  onChange([...arr, val])
                  ;(e.target as HTMLInputElement).value = ''
                }
              }
            }}
          />
        </div>
      </div>
    )
  }

  // Array of objects
  if (schema.type === 'array' && schema.items?.type === 'object' && schema.items.properties) {
    const arr = Array.isArray(value) ? value as Record<string, unknown>[] : []
    return (
      <div className="form-control w-full">
        <label className="label py-1">
          <span className="label-text text-sm font-medium">{label}</span>
          <button
            className="btn btn-ghost btn-xs gap-1"
            onClick={() => {
              const newItem: Record<string, unknown> = {}
              Object.entries(schema.items!.properties!).forEach(([key, prop]) => {
                if (prop.default !== undefined) newItem[key] = prop.default
                else if (prop.type === 'boolean') newItem[key] = false
                else if (prop.type === 'array') newItem[key] = []
                else newItem[key] = ''
              })
              onChange([...arr, newItem])
            }}
          >
            <Plus className="w-3 h-3" /> 添加
          </button>
        </label>
        <div className="space-y-3">
          {arr.map((item, idx) => (
            <div key={idx} className="card card-bordered bg-base-200/30 p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-base-content/50">#{idx + 1}</span>
                <div className="flex gap-0.5">
                  <button
                    className="btn btn-ghost btn-xs btn-square"
                    disabled={idx === 0}
                    onClick={() => {
                      const newArr = [...arr]
                      ;[newArr[idx], newArr[idx - 1]] = [newArr[idx - 1], newArr[idx]]
                      onChange(newArr)
                    }}
                  >
                    <ChevronUp className="w-3 h-3" />
                  </button>
                  <button
                    className="btn btn-ghost btn-xs btn-square"
                    disabled={idx === arr.length - 1}
                    onClick={() => {
                      const newArr = [...arr]
                      ;[newArr[idx], newArr[idx + 1]] = [newArr[idx + 1], newArr[idx]]
                      onChange(newArr)
                    }}
                  >
                    <ChevronDown className="w-3 h-3" />
                  </button>
                  <button
                    className="btn btn-ghost btn-xs btn-square text-error"
                    onClick={() => {
                      const newArr = [...arr]
                      newArr.splice(idx, 1)
                      onChange(newArr)
                    }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                {Object.entries(schema.items!.properties!).map(([key, prop]) => (
                  <FormField
                    key={key}
                    schema={prop as FieldSchema}
                    value={item[key]}
                    onChange={(v) => {
                      const newArr = [...arr]
                      newArr[idx] = { ...newArr[idx], [key]: v }
                      onChange(newArr)
                    }}
                    path={`${path}.${idx}.${key}`}
                    required={schema.items!.required?.includes(key)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Object
  if (schema.type === 'object' && schema.properties) {
    return (
      <div className="space-y-3">
        {Object.entries(schema.properties).map(([key, prop]) => (
          <FormField
            key={key}
            schema={prop as FieldSchema}
            value={(value as Record<string, unknown>)?.[key]}
            onChange={(v) => {
              const obj = { ...(value as Record<string, unknown> || {}) }
              obj[key] = v
              onChange(obj)
            }}
            path={`${path}.${key}`}
            required={schema.required?.includes(key)}
          />
        ))}
      </div>
    )
  }

  // Fallback
  return (
    <div className="form-control w-full">
      <label className="label py-1">
        <span className="label-text text-sm font-medium">{label}</span>
      </label>
      <input
        type="text"
        className="input input-bordered input-sm w-full"
        value={String(value || '')}
        onChange={(e) => {
          // Try to parse numbers
          const v = e.target.value
          if (schema.type === 'number') onChange(Number(v) || 0)
          else onChange(v)
        }}
      />
    </div>
  )
}