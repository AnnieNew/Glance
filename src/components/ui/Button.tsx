import { ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost'
}

export default function Button({ variant = 'primary', className = '', ...props }: ButtonProps) {
  const base = 'rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50'
  const variants = {
    primary: 'bg-black text-white hover:bg-zinc-800',
    ghost: 'border border-zinc-200 text-zinc-700 hover:border-zinc-400',
  }
  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />
}
