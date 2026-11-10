import { useEffect } from 'react';
import { useLocation } from 'react-router';

/** Vuelve al inicio de la página al cambiar de ruta (salvo al volver atrás). */
export function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);
  return null;
}
