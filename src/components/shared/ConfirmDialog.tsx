import { AlertTriangle } from 'lucide-react'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  confirmClass?: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open, title, message, confirmLabel = '确认', confirmClass = 'btn-error',
  onConfirm, onCancel,
}: ConfirmDialogProps) {
  if (!open) return null

  return (
    <div className="modal modal-open">
      <div className="modal-box">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="w-6 h-6 text-warning" />
          <h3 className="text-lg font-bold">{title}</h3>
        </div>
        <p className="text-base-content/70">{message}</p>
        <div className="modal-action">
          <button className="btn btn-ghost" onClick={onCancel}>取消</button>
          <button className={`btn ${confirmClass}`} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
      <div className="modal-backdrop" onClick={onCancel}>
        <button className="cursor-default">close</button>
      </div>
    </div>
  )
}