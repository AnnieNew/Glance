import { ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost'
}

export default function Button({ variant = 'primary', className = '', ...props }: ButtonProps) {
  const base = 'rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50'
  const variants = {
    primary: 'bg-foreground text-background hover:opacity-80',
    ghost: 'border border-border text-muted hover:border-border-strong hover:text-foreground',
  }
  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />
}
