import { ErrorState } from './ErrorState';

/** Error al cargar una pantalla (por ejemplo, mala señal al descargarla). */
export function RouteError() {
  return (
    <div className="mx-auto max-w-md px-6 pt-24">
      <ErrorState
        title="No se pudo abrir la pantalla"
        description="Puede ser la conexión. Tus datos no se perdieron."
        onRetry={() => window.location.reload()}
      />
    </div>
  );
}
