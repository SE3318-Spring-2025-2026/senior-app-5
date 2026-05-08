import clsx from 'clsx';

export function Card({ children, className }) {
  return (
    <div
      className={clsx(
        'rounded-2xl border border-[#1f1f23] bg-[#131316] p-5',
        className,
      )}
    >
      {children}
    </div>
  );
}
