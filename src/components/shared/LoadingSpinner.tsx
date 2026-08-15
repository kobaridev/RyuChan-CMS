export function LoadingSpinner({ text = '加载中...' }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <span className="loading loading-spinner loading-lg text-primary" />
      <p className="text-base-content/50 text-sm">{text}</p>
    </div>
  )
}