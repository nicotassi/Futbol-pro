import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { IconButton } from './IconButton';
import { cn } from '@/utils/cn';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}

/**
 * Hoja inferior modal (en pantallas grandes se muestra centrada).
 * Usa <dialog> nativo: foco atrapado, Escape y fondo inerte sin dependencias.
 */
export function Sheet({ open, onClose, title, children, footer }: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      if (typeof d.showModal === 'function') d.showModal();
      else d.setAttribute('open', '');
    } else if (!open && d.open) {
      if (typeof d.close === 'function') d.close();
      else d.removeAttribute('open');
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={cn(
        'm-0 mt-auto w-full max-w-none bg-transparent p-0 backdrop:bg-ink/50 backdrop:backdrop-blur-[2px]',
        'sm:m-auto sm:max-w-lg',
      )}
    >
      <div className="animate-enter flex max-h-[85dvh] flex-col rounded-t-[22px] bg-surface pb-safe sm:rounded-[22px]">
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-line sm:hidden" aria-hidden />
        <header className="flex items-center justify-between gap-3 px-5 pt-3 pb-2">
          <h2 className="text-lg font-semibold">{title}</h2>
          <IconButton label="Cerrar" icon={<X className="size-5" />} onClick={onClose} />
        </header>
        <div className="overflow-y-auto px-5 pb-5">{children}</div>
        {footer && <footer className="border-t border-line px-5 py-4">{footer}</footer>}
      </div>
    </dialog>
  );
}
