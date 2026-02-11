"use client"

import * as React from "react"
import { cn } from "@/shared/utils/cn"

interface SwitchProps extends React.InputHTMLAttributes<HTMLInputElement> {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, checked, onCheckedChange, ...props }, ref) => {
    return (
      <label className="inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          ref={ref}
          className="sr-only peer"
          checked={checked}
          onChange={(e) => onCheckedChange?.(e.target.checked)}
          {...props}
        />
        <div
          className={cn(
            "relative w-9 h-5 bg-input rounded-full peer peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-ring peer-focus:ring-offset-2 peer-focus:ring-offsetset-background peer-disabled:cursor-not-allowed peer-disabled:opacity-50 transition-colors",
            checked && "bg-primary",
            className
          )}
        >
          <div
            className={cn(
              "absolute top-0.5 left-0.5 bg-background w-4 h-4 rounded-full shadow-lg transition-transform",
              checked && "translate-x-4"
            )}
          />
        </div>
      </label>
    )
  }
)
Switch.displayName = "Switch"

export { Switch }

