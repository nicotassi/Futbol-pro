import { expect, test } from '@playwright/test';
import { mockSupabase } from './support/mockSupabase';

test('una familia nueva crea su cuenta sola y después la del jugador', async ({ page }) => {
  await mockSupabase(page, { configured: false });
  await page.goto('/');
  await expect(page).toHaveURL(/\/ingresar$/);

  await page.getByRole('link', { name: '¿Primera vez? Crear cuenta' }).click();
  await expect(page.getByRole('heading', { name: 'Crear cuenta' })).toBeVisible();

  // Contraseña corta: el servidor la rechaza con un mensaje claro.
  await page.getByLabel('Tu nombre').fill('Nico');
  await page.getByLabel('Tu email').fill('nico@example.com');
  await page.getByLabel('Contraseña', { exact: true }).fill('corta');
  await page.getByLabel('Nombre del jugador').fill('Benja');
  await page.getByRole('button', { name: 'Crear cuenta' }).click();
  await expect(page.getByRole('alert')).toContainText('al menos 8');

  await page.getByLabel('Contraseña', { exact: true }).fill('clave-segura-1');
  await page.getByRole('button', { name: 'Crear cuenta' }).click();

  // Queda adentro, en Inicio, con el aviso para crear la cuenta del jugador.
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Nico');
  await page.getByRole('link', { name: /Creá la cuenta de Benja/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Administración' })).toBeVisible();

  await page.getByLabel('Usuario', { exact: true }).fill('benja');
  await page.getByLabel('Contraseña', { exact: true }).fill('messi2026');
  await page.getByLabel('Repetí la contraseña').fill('messi2026');
  await page.getByRole('button', { name: 'Crear cuenta' }).click();
  await expect(page.getByText('Cambiar contraseña de Benja')).toBeVisible();

  // El aviso de Inicio desaparece una vez creada la cuenta.
  await page
    .getByRole('navigation', { name: 'Navegación principal' })
    .locator('visible=true')
    .getByRole('link', { name: 'Inicio' })
    .click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Nico');
  await expect(page.getByRole('link', { name: /Creá la cuenta de Benja/ })).toHaveCount(0);

  // Benja ya puede ingresar con su usuario.
  await page.goto('/perfil');
  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await page.getByLabel('Usuario o email').fill('benja');
  await page.getByLabel('Contraseña', { exact: true }).fill('messi2026');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Benja');
});

test('un email ya registrado avisa que hay que ingresar', async ({ page }) => {
  await mockSupabase(page);
  await page.goto('/crear-cuenta');
  await page.getByLabel('Tu nombre').fill('Otro');
  await page.getByLabel('Tu email').fill('papa@example.com');
  await page.getByLabel('Contraseña', { exact: true }).fill('clave-segura-1');
  await page.getByLabel('Nombre del jugador').fill('Juan');
  await page.getByRole('button', { name: 'Crear cuenta' }).click();
  await expect(page.getByRole('alert')).toContainText('Ya existe una cuenta con ese email');
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
