import clsx from 'clsx';

export function Input({ icon: Icon, error, className, ...props }) {
  return (
    <div className="relative">
      {Icon && (
        <Icon
          size={14}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600"
        />
      )}
      <input
        className={clsx(
          'w-full rounded-md border bg-[#0a0a0b] py-2.5 text-[13px] text-zinc-200',
          'placeholder:text-zinc-600 transition-colors duration-150',
          'focus:outline-none focus:ring-1',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          Icon ? 'pl-9 pr-3.5' : 'px-3.5',
          error
            ? 'border-rose-500/40 focus:border-rose-500/60 focus:ring-rose-500/20'
            : 'border-[#26262b] focus:border-[#3a3a40] focus:ring-[#3a3a40]',
          className,
        )}
        {...props}
      />
    </div>
  );
}
