import { XCircle, CheckCircle2 } from 'lucide-react'

export function StatusBlock({ title, message, type = 'success' }) {
  if (!message) return null

  if (type === 'error') {
    return (
      <div
        aria-label={title}
        role="status"
        className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-400 mt-3"
      >
        <XCircle className="h-4 w-4 shrink-0" />
        <span>{message}</span>
      </div>
    )
  }

  return (
    <div
      aria-label={title}
      role="status"
      className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm font-medium text-green-400 mt-3"
    >
      <CheckCircle2 className="h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  )
}
