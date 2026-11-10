import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Segmented } from './Segmented';

function Demo() {
  const [v, setV] = useState<'d' | 's' | 'm'>('d');
  return (
    <Segmented
      label="Vista"
      value={v}
      onChange={setV}
      options={[
        { value: 'd', label: 'Día' },
        { value: 's', label: 'Semana' },
        { value: 'm', label: 'Mes' },
      ]}
    />
  );
}

describe('Segmented', () => {
  it('cambia de opción con click y con flechas', async () => {
    render(<Demo />);
    await userEvent.click(screen.getByRole('tab', { name: 'Semana' }));
    expect(screen.getByRole('tab', { name: 'Semana' })).toHaveAttribute('aria-selected', 'true');
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Mes' })).toHaveAttribute('aria-selected', 'true');
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Día' })).toHaveAttribute('aria-selected', 'true');
  });
});
