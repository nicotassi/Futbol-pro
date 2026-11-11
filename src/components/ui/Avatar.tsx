import { cn } from '@/utils/cn';

interface AvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizes = { sm: 'size-9 text-sm', md: 'size-12 text-base', lg: 'size-16 text-xl' };

/** Avatar con iniciales y anillo dorado. */
export function Avatar({ name, size = 'md', className }: AvatarProps) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
  return (
    <span
      aria-hidden
      className={cn(
        'inline-grid shrink-0 place-items-center rounded-full bg-coal font-display font-semibold text-gold ring-2 ring-gold/70 ring-offset-2 ring-offset-transparent',
        sizes[size],
        className,
      )}
    >
      {initials}
    </span>
  );
}
