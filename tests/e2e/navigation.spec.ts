import { expect, test, type Page } from '@playwright/test';
import { loginAs, mockSupabase } from './support/mockSupabase';

// Navegación general como papá (ve todas las secciones).
test.beforeEach(async ({ page }) => {
  await mockSupabase(page);
  await loginAs(page, 'admin');
});

/** Falla el test si aparece cualquier error en consola o una excepción de página. */
function trackErrors(page: Page) {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
}

async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

const tabs = [
  { name: 'Inicio', heading: /Buen día|Buenas tardes|Buenas noches/ },
  { name: 'Entrenar', heading: 'Entrenar' },
  { name: 'Objetivos', heading: 'Objetivos' },
  { name: 'Evolución', heading: 'Evolución' },
  { name: 'Perfil', heading: 'Perfil' },
];

test('recorre las cinco pestañas sin errores ni scroll horizontal', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/');
  const nav = page
    .getByRole('navigation', { name: 'Navegación principal' })
    .locator('visible=true');

  for (const tab of tabs) {
    await nav.getByRole('link', { name: tab.name, exact: true }).click();
    await expect(page.getByRole('heading', { level: 1, name: tab.heading })).toBeVisible();
    await expectNoHorizontalScroll(page);
  }
  expect(errors).toEqual([]);
});

const secondary = [
  { link: 'Registrar partido', heading: 'Partidos' },
  { link: 'Registrar bienestar', heading: 'Recuperación' },
  { link: 'Ver evolución', heading: 'Evolución' },
  { link: 'Registrar entrenamiento', heading: 'Entrenar' },
];

for (const item of secondary) {
  test(`acceso rápido "${item.link}" abre su pantalla y vuelve`, async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto('/');
    await page
      .getByRole('region', { name: 'Accesos rápidos' })
      .getByRole('link', { name: new RegExp(item.link) })
      .click();
    await expect(page.getByRole('heading', { level: 1, name: item.heading })).toBeVisible();
    await expectNoHorizontalScroll(page);
    await page.goBack();
    await expect(
      page.getByRole('heading', { level: 1, name: /Buen día|Buenas tardes|Buenas noches/ }),
    ).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test('el calendario y la biblioteca funcionan', async ({ page }) => {
  await page.goto('/calendario');
  await page.getByRole('tab', { name: 'Semana' }).click();
  await expect(page.getByText('Lunes')).toBeVisible();

  await page.goto('/entrenar/ejercicios');
  await page.getByRole('button', { name: 'Fuerza' }).click();
  await expect(page).toHaveURL(/categoria=strength/);
  await expect(page.getByRole('link', { name: /Plancha/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /Dominio de pelota/ })).toHaveCount(0);
});

test('ruta inexistente muestra 404', async ({ page }) => {
  await page.goto('/no-existe');
  await expect(page.getByRole('heading', { name: 'Esta jugada no existe' })).toBeVisible();
});
