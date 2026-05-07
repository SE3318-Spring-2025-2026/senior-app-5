import clsx from 'clsx';

export function Input({ icon: Icon, error, className, ...props }) {
  return (
    <div className="relative">
      {Icon && (
        <Icon
          size={15}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600"
        />
      )}
      <input
        className={clsx(
          'w-full rounded-xl border bg-[#111827] py-3 text-sm text-slate-200',
          'placeholder:text-slate-700 transition-colors duration-150',
          'focus:outline-none focus:ring-2 focus:ring-blue-600/60',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          Icon ? 'pl-10 pr-4' : 'px-4',
          error
            ? 'border-red-500/50 focus:ring-red-500/30'
            : 'border-[#1e293b] focus:border-blue-700',
          className,
        )}
        {...props}
      />
    </div>
  );
}
