import clsx from 'clsx';

export function Card({ children, className }) {
  return (
    <div
      className={clsx(
        'bg-[#111827] rounded-2xl border border-[#1e293b] p-5',
        className,
      )}
    >
      {children}
    </div>
  );
}
