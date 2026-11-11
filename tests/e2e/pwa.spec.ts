import { expect, test } from '@playwright/test';
import { loginAs, mockSupabase } from './support/mockSupabase';

test('PWA: manifest válido y la app abre sin conexión con los últimos datos', async ({
  page,
  context,
}) => {
  const server = await mockSupabase(page);
  await loginAs(page, 'player');

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
  await expect(page.getByText(/Mediocampista · \d+ años/)).toBeVisible();
  // Dar tiempo a que la caché de consultas se guarde en IndexedDB.
  await page.waitForTimeout(1500);

  await context.setOffline(true);
  server.serverDown = true; // garantiza que nada venga del servidor simulado
  await page.reload();
  await expect(page.getByText('Sin conexión', { exact: false }).first()).toBeVisible();
  // Sesión y datos del jugador salen de la caché local, sin servidor.
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Benja');
  await expect(page.getByText(/Mediocampista · \d+ años/)).toBeVisible();
  await page
    .getByRole('navigation', { name: 'Navegación principal' })
    .locator('visible=true')
    .getByRole('link', { name: 'Objetivos' })
    .click();
  await expect(page.getByRole('heading', { level: 1, name: 'Objetivos' })).toBeVisible();
  await context.setOffline(false);
});
