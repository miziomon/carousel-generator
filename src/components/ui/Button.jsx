import { cn } from '../../lib/cn.js'

const VARIANTS = {
  primary: 'bg-emerald-500 hover:bg-emerald-400 text-black font-semibold',
  secondary: 'bg-slate-700 hover:bg-slate-600 text-slate-100',
  ghost: 'hover:bg-slate-700 text-slate-300 hover:text-slate-100',
  danger: 'bg-red-600 hover:bg-red-500 text-white',
}

const SIZES = {
  xs: 'px-2 py-1 text-xs',
  sm: 'px-2.5 py-1 text-xs',
  md: 'px-3.5 py-1.5 text-sm',
  lg: 'px-5 py-2 text-base',
  icon: 'p-1.5',
}

export function Button({
  variant = 'secondary',
  size = 'md',
  disabled = false,
  title,
  onClick,
  className,
  children,
  ...props
}) {
  return (
    <button
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/50',
        VARIANTS[variant],
        SIZES[size],
        disabled && 'opacity-40 cursor-not-allowed pointer-events-none',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
