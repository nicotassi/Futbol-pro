/** Traduce errores técnicos a mensajes claros en español. */
export function friendlyError(error: unknown): string {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return 'Sin conexión. Revisá internet e intentá de nuevo.';
  }
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  const code = (error as { code?: string; status?: number } | null)?.code;
  const status = (error as { status?: number } | null)?.status;

  if (code === 'invalid_credentials' || /invalid login credentials/i.test(message)) {
    return 'Usuario o contraseña incorrectos.';
  }
  if (status === 429 || code === 'over_request_rate_limit' || /rate limit/i.test(message)) {
    return 'Demasiados intentos. Esperá unos minutos y probá de nuevo.';
  }
  if (code === '42501' || status === 401 || status === 403) {
    return 'No tenés permiso para hacer esto.';
  }
  if (code === '23514' || code === '22P02' || code === '22007') {
    return 'Algún dato no es válido. Revisá el formulario.';
  }
  if (/failed to fetch|network|load failed/i.test(message)) {
    return 'No se pudo conectar con el servidor. Intentá de nuevo.';
  }
  return 'Ocurrió un error inesperado. Intentá de nuevo.';
}
