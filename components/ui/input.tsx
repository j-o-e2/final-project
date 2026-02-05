import * as React from 'react'

import { cn } from '@/lib/utils'

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  // Determine whether the caller intends a controlled input by checking
  // if the `value` prop was provided. If it was, normalize `undefined` to
  // an empty string so React doesn't warn about switching between
  // uncontrolled and controlled inputs. If `value` was not provided, leave
  // the input uncontrolled (allow `defaultValue`).
  const hasValueProp = Object.prototype.hasOwnProperty.call(props, 'value')
  const inputProps = { ...props } as React.ComponentProps<'input'>

  if (hasValueProp) {
    // Normalize undefined to '' for controlled inputs.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(inputProps as any).value = props.value ?? ''
  }

  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
        'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
        'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
        className,
      )}
      {...inputProps}
    />
  )
}

export { Input }
