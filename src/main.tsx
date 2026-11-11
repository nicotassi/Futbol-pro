import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/outfit';
import '@fontsource-variable/inter';
import './styles/globals.css';
import { App } from './app/App';
import { applyTheme, getStoredPreference } from './features/theme/theme';

// Tema claro/oscuro: se aplica antes de dibujar y sigue al dispositivo si está en "automático".
applyTheme(getStoredPreference());
window
  .matchMedia?.('(prefers-color-scheme: dark)')
  .addEventListener?.('change', () => applyTheme(getStoredPreference()));

const root = document.getElementById('root');
if (!root) throw new Error('No se encontró el elemento #root');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
