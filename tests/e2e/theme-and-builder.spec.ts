import { expect, test } from '@playwright/test';
import { loginAs, mockSupabase } from './support/mockSupabase';

test.describe('Modo oscuro', () => {
  test('se elige en Perfil, se aplica y se recuerda al recargar', async ({ page }) => {
    await mockSupabase(page);
    await loginAs(page, 'player');
    await page.goto('/perfil');
    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-theme', 'light');

    await page.getByRole('tab', { name: 'Oscuro' }).click();
    await expect(html).toHaveAttribute('data-theme', 'dark');
    await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(15, 16, 19)');

    await page.reload();
    await expect(html).toHaveAttribute('data-theme', 'dark');
    await expect(page.getByRole('tab', { name: 'Oscuro' })).toHaveAttribute(
      'aria-selected',
      'true',
    );

    await page.getByRole('tab', { name: 'Claro' }).click();
    await expect(html).toHaveAttribute('data-theme', 'light');
  });

  test('"Automático" sigue la configuración del celular', async ({ browser }) => {
    const context = await browser.newContext({ colorScheme: 'dark' });
    const page = await context.newPage();
    await mockSupabase(page);
    await loginAs(page, 'player');
    await page.goto('/perfil');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.emulateMedia({ colorScheme: 'light' });
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await context.close();
  });
});

test('papá crea un ejercicio nuevo desde el armado de la rutina y lo usa al instante', async ({
  page,
}) => {
  const mock = await mockSupabase(page);
  await loginAs(page, 'admin');
  await page.goto('/entrenar/nuevo');
  await page.getByLabel('Nombre', { exact: true }).fill('Rutina a mi gusto');
  await page.getByRole('button', { name: 'Agregar', exact: true }).click();

  await page.getByRole('button', { name: 'Crear ejercicio nuevo' }).click();
  const sheet = page.getByRole('dialog', { name: 'Ejercicio nuevo' });
  await sheet.getByRole('button', { name: 'Crear y agregar' }).click();
  await expect(sheet.getByText('Ingresá un nombre (mínimo 2 letras).')).toBeVisible();
  await sheet.getByLabel('Nombre del ejercicio').fill('Pase con la pared de casa');
  await sheet.getByLabel('Categoría').selectOption('technique');
  await sheet.getByLabel('Minutos (opcional)').fill('7');
  await sheet.getByRole('button', { name: 'Crear y agregar' }).click();

  await expect(page.getByRole('listitem').getByText('Pase con la pared de casa')).toBeVisible();
  expect(
    mock.tables.exercises!.some(
      (e) => e.name === 'Pase con la pared de casa' && e.is_custom === true,
    ),
  ).toBe(true);

  await page.getByRole('button', { name: 'Guardar entrenamiento' }).click();
  await expect(page).toHaveURL(/\/entrenar/);
  expect(mock.tables.workout_items).toHaveLength(1);
});
