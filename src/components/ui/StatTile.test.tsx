import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatTile } from './StatTile';

describe('StatTile', () => {
  it('sin datos muestra "—" y no un cero', () => {
    render(<StatTile label="Minutos" value={null} />);
    expect(screen.getByLabelText('Sin registros')).toHaveTextContent('—');
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('muestra valor y unidad', () => {
    render(<StatTile label="Minutos" value={45} unit="min" />);
    expect(screen.getByText('45')).toBeInTheDocument();
    expect(screen.getByText('min')).toBeInTheDocument();
  });
});
