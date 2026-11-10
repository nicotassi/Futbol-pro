import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { BottomNav } from './BottomNav';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <BottomNav />
    </MemoryRouter>,
  );
}

describe('BottomNav', () => {
  it('muestra las cinco pestañas principales en orden', () => {
    renderAt('/');
    const labels = screen.getAllByRole('link').map((l) => l.textContent);
    expect(labels).toEqual(['Inicio', 'Entrenar', 'Objetivos', 'Evolución', 'Perfil']);
  });

  it('marca como activa la pestaña de la ruta actual (incluidas subrutas)', () => {
    renderAt('/entrenar/ejercicios');
    expect(screen.getByRole('link', { name: 'Entrenar' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Inicio' })).not.toHaveAttribute('aria-current');
  });
});
