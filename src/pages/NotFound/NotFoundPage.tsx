import { LogoMark } from '@/components/brand/Logo';
import { LinkButton } from '@/components/ui/Button';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export default function NotFoundPage() {
  useDocumentTitle('Página no encontrada');
  return (
    <div className="flex flex-col items-center gap-4 pt-20 text-center">
      <LogoMark size={56} />
      <p className="eyebrow text-gold-strong">Error 404</p>
      <h1 className="text-2xl font-semibold">Esta jugada no existe</h1>
      <p className="max-w-xs text-sm text-muted">La página que buscás no está disponible.</p>
      <LinkButton to="/" replace>
        Volver al inicio
      </LinkButton>
    </div>
  );
}
