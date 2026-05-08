import clsx from 'clsx';

const variants = {
  primary:
    'bg-zinc-100 text-zinc-950 hover:bg-white active:scale-[0.99]',
  ghost:
    'border border-[#26262b] bg-[#18181c] text-zinc-300 hover:border-[#3a3a40] hover:bg-[#1f1f23] hover:text-zinc-100',
  danger:
    'border border-rose-500/25 bg-rose-500/10 text-rose-300 hover:bg-rose-500/15 hover:border-rose-500/40 hover:text-rose-200',
};

const sizes = {
  sm: 'rounded-md px-3 py-1.5 text-[12px]',
  md: 'rounded-md px-3.5 py-2 text-[13px]',
  lg: 'rounded-md px-4 py-2.5 text-[13px]',
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
        'inline-flex items-center justify-center gap-1.5 font-semibold tracking-tight transition-colors duration-150',
        'disabled:cursor-not-allowed disabled:opacity-60',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {loading ? (
        <>
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
          {children}
        </>
      ) : (
        children
      )}
    </button>
  );
}
