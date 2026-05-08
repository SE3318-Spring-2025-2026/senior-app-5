import { XCircle, CheckCircle2 } from 'lucide-react';

export function StatusBlock({ title, message, type = 'success' }) {
  if (!message) return null;

  if (type === 'error') {
    return (
      <div
        aria-label={title}
        role="status"
        className="mt-3 flex items-center gap-2 rounded-md border border-rose-500/25 bg-rose-500/10 px-3.5 py-2.5 text-[13px] font-medium text-rose-300"
      >
        <XCircle className="h-3.5 w-3.5 shrink-0" />
        <span>{message}</span>
      </div>
    );
  }

  return (
    <div
      aria-label={title}
      role="status"
      className="mt-3 flex items-center gap-2 rounded-md border border-emerald-500/25 bg-emerald-500/10 px-3.5 py-2.5 text-[13px] font-medium text-emerald-300"
    >
      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
      <span>{message}</span>
    </div>
  );
}
