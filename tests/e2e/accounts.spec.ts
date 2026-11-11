import { expect, test } from '@playwright/test';
import { mockSupabase, SETUP_CODE } from './support/mockSupabase';

test('configuración inicial: papá crea su cuenta con el código y después la de Benja', async ({
  page,
}) => {
  await mockSupabase(page, { configured: false });
  await page.goto('/');
  await expect(page).toHaveURL(/\/ingresar$/);

  await page.getByRole('link', { name: '¿Primera vez? Configurar la app' }).click();
  await expect(page.getByRole('heading', { name: 'Configurar la app' })).toBeVisible();

  // Código incorrecto
  await page.getByLabel('Código de instalación').fill('ZZZZ-ZZZZ');
  await page.getByLabel('Tu nombre').fill('Nico');
  await page.getByLabel('Tu email').fill('nico@example.com');
  await page.getByLabel('Contraseña', { exact: true }).fill('clave-segura-1');
  await page.getByLabel('Repetí la contraseña').fill('clave-segura-1');
  await page.getByRole('button', { name: 'Crear mi cuenta' }).click();
  await expect(page.getByRole('alert')).toContainText('no es válido');

  // Contraseñas distintas
  await page.getByLabel('Código de instalación').fill(SETUP_CODE);
  await page.getByLabel('Repetí la contraseña').fill('otra-cosa');
  await page.getByRole('button', { name: 'Crear mi cuenta' }).click();
  await expect(page.getByRole('alert')).toHaveText('Las contraseñas no coinciden.');

  await page.getByLabel('Repetí la contraseña').fill('clave-segura-1');
  await page.getByRole('button', { name: 'Crear mi cuenta' }).click();

  // Queda logueado como papá, en Administración, con la invitación a crear la cuenta del jugador.
  await expect(page.getByRole('heading', { level: 1, name: 'Administración' })).toBeVisible();
  await expect(page.getByText('Nico (vos)')).toBeVisible();
  await expect(page.getByText('Crear la cuenta de Benja')).toBeVisible();

  await page.getByLabel('Usuario', { exact: true }).fill('benja');
  await page.getByLabel('Contraseña', { exact: true }).fill('messi2026');
  await page.getByLabel('Repetí la contraseña').fill('messi2026');
  await page.getByRole('button', { name: 'Crear cuenta' }).click();

  await expect(page.getByText('Cambiar contraseña de Benja')).toBeVisible();
  await expect(page.getByText('Usuario: benja').first()).toBeVisible();

  // Benja ya puede ingresar con su usuario.
  await page.goto('/perfil');
  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await page.getByLabel('Usuario o email').fill('benja');
  await page.getByLabel('Contraseña', { exact: true }).fill('messi2026');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Benja');
});

test('con la app ya configurada no se ofrece la configuración inicial', async ({ page }) => {
  await mockSupabase(page);
  await page.goto('/ingresar');
  await expect(page.getByText('Las cuentas las crea papá.')).toBeVisible();
  await expect(page.getByRole('link', { name: '¿Primera vez? Configurar la app' })).toHaveCount(0);
});

test('papá cambia la contraseña de Benja', async ({ page }) => {
  await mockSupabase(page);
  await page.goto('/ingresar');
  await page.getByLabel('Usuario o email').fill('papa@example.com');
  await page.getByLabel('Contraseña', { exact: true }).fill('papa-secreta-1');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(
    page.getByRole('heading', { level: 1, name: /Buen día|Buenas tardes|Buenas noches/ }),
  ).toBeVisible();
  await page.goto('/admin');
  await page.getByText('Cambiar contraseña de Benja').click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Nueva contraseña').fill('corta');
  await dialog.getByLabel('Repetí la contraseña').fill('corta');
  await dialog.getByRole('button', { name: 'Guardar contraseña' }).click();
  await expect(dialog.getByRole('alert')).toContainText('Mínimo 8');
  await dialog.getByLabel('Nueva contraseña').fill('nueva-clave-1');
  await dialog.getByLabel('Repetí la contraseña').fill('nueva-clave-1');
  await dialog.getByRole('button', { name: 'Guardar contraseña' }).click();
  await expect(page.getByText('✓ Contraseña actualizada')).toBeVisible();
});
