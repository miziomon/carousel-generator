import { cn } from '../../lib/cn.js'

/**
 * Wrapper riusabile per un campo form: label + input area + testo aiuto + errore.
 */
export function FieldGroup({ label, help, error, required, children, className }) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {label && (
        <label className="text-xs font-mono tracking-wider uppercase text-slate-400">
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
        </label>
      )}
      {children}
      {error && <p className="text-xs text-red-400 font-mono">{error}</p>}
      {help && !error && <p className="text-xs text-slate-500">{help}</p>}
    </div>
  )
}

// Input testuale base con stile coerente con il resto dell'app
export function TextInput({ value, onChange, placeholder, disabled, className, ...props }) {
  return (
    <input
      type="text"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className={cn(
        'w-full bg-slate-900 border border-slate-600 rounded px-3 py-1.5 text-sm text-slate-100',
        'focus:outline-none focus:border-emerald-500/60 transition-colors font-mono',
        disabled && 'opacity-40 cursor-not-allowed',
        className
      )}
      {...props}
    />
  )
}

// Select stilizzata
export function SelectInput({ value, onChange, options, disabled, className }) {
  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={cn(
        'w-full bg-slate-900 border border-slate-600 rounded px-3 py-1.5 text-sm text-slate-100',
        'focus:outline-none focus:border-emerald-500/60 transition-colors font-mono',
        disabled && 'opacity-40 cursor-not-allowed',
        className
      )}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}

// Gruppo di radio button
export function RadioGroup({ value, onChange, options, name }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <label
          key={opt.value}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded border cursor-pointer text-xs font-mono transition-colors',
            value === opt.value
              ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-400'
              : 'border-slate-600 text-slate-400 hover:border-slate-500 hover:text-slate-300'
          )}
        >
          <input
            type="radio"
            name={name}
            value={opt.value}
            checked={value === opt.value}
            onChange={() => onChange(opt.value)}
            className="sr-only"
          />
          {opt.label}
        </label>
      ))}
    </div>
  )
}

// Toggle on/off
export function Toggle({ checked, onChange, label }) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer select-none">
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative w-9 h-5 rounded-full transition-colors',
          checked ? 'bg-emerald-500' : 'bg-slate-600'
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 left-0 w-4 h-4 bg-white rounded-full shadow transition-transform',
            checked ? 'translate-x-[18px]' : 'translate-x-[2px]'
          )}
        />
      </button>
      {label && <span className="text-sm text-slate-300">{label}</span>}
    </label>
  )
}
