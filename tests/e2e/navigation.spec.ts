import { expect, test, type Page } from '@playwright/test';

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
  { link: 'Subir captura del reloj', heading: 'Registro del reloj' },
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
  await page.getByRole('button', { name: 'Táctica' }).click();
  await expect(page).toHaveURL(/categoria=tactics/);
  await expect(page.getByRole('heading', { name: 'Inteligencia táctica' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Técnica individual' })).toHaveCount(0);
});

test('vista previa del modo entrenamiento: cronómetro y navegación', async ({ page }) => {
  await page.goto('/entrenar/sesion/vista-previa');
  await expect(page.getByText('Vista previa · no se guarda ningún dato')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Activación y movilidad' })).toBeVisible();
  await page.getByRole('button', { name: 'Ejercicio siguiente' }).click();
  await expect(page.getByRole('heading', { name: 'Escalera de coordinación' })).toBeVisible();
  await page.getByRole('button', { name: 'Iniciar', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pausar' })).toBeVisible();
  await page.getByRole('button', { name: 'Finalizar sesión' }).click();
  await page.getByRole('button', { name: 'Finalizar', exact: true }).click();
  await expect(page).toHaveURL(/\/entrenar$/);
});

test('ruta inexistente muestra 404', async ({ page }) => {
  await page.goto('/no-existe');
  await expect(page.getByRole('heading', { name: 'Esta jugada no existe' })).toBeVisible();
});

test('PWA: manifest válido y funciona sin conexión', async ({ page, context }) => {
  await page.goto('/');
  const manifest = await page.evaluate(async () => {
    const href = document.querySelector('link[rel="manifest"]')?.getAttribute('href');
    return href
      ? ((await (await fetch(href)).json()) as { display?: string; icons?: unknown[] })
      : null;
  });
  expect(manifest?.display).toBe('standalone');
  expect(manifest?.icons?.length).toBeGreaterThanOrEqual(3);

  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload(); // la página queda controlada por el service worker
  await context.setOffline(true);
  await page.goto('/objetivos');
  await expect(page.getByRole('heading', { level: 1, name: 'Objetivos' })).toBeVisible();
  await expect(page.getByText(/Sin conexión/)).toBeVisible();
  await context.setOffline(false);
});
