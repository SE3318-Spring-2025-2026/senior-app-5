import clsx from 'clsx';

const variants = {
  primary:
    'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/30 active:scale-[0.98]',
  ghost:
    'border border-[#1e293b] bg-[#111827] text-slate-300 hover:border-slate-600 hover:bg-[#1a2438] hover:text-slate-100',
  danger:
    'border border-red-500/30 bg-red-600/10 text-red-400 hover:bg-red-600/20 hover:border-red-500/60',
};

const sizes = {
  sm: 'rounded-lg px-3 py-1.5 text-xs',
  md: 'rounded-xl px-4 py-2.5 text-sm',
  lg: 'rounded-xl px-5 py-3 text-sm',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  children,
  className,
  ...props
}) {
  return (
    <button
      disabled={disabled || loading}
      className={clsx(
        'inline-flex items-center justify-center gap-2 font-bold tracking-wide transition-all duration-150',
        'disabled:cursor-not-allowed disabled:opacity-60',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {loading ? (
        <>
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
          {children}
        </>
      ) : (
        children
      )}
    </button>
  );
}
