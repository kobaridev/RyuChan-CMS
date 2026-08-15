import { FileQuestion } from 'lucide-react'

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-base-content/20 mb-4">
        {icon || <FileQuestion className="w-16 h-16" />}
      </div>
      <h3 className="text-lg font-semibold text-base-content/50">{title}</h3>
      {description && (
        <p className="text-sm text-base-content/40 mt-1 max-w-sm">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}