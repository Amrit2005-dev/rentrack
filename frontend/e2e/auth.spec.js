import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('Super Admin can login successfully', async ({ page }) => {
    // Navigate to the app (should redirect to login if unauthenticated)
    await page.goto('/');

    // Wait for the login page to load by looking for the email input
    await expect(page.getByPlaceholder('you@company.com')).toBeVisible();

    // The default tab is Email
    // Fill in credentials seeded by the python script
    await page.getByPlaceholder('you@company.com').fill('admin@test.com');
    await page.getByPlaceholder('Enter your password').fill('password123');

    // Submit
    await page.getByRole('button', { name: 'Login' }).click();

    // Verify successful login redirects to the OTP verification screen
    await expect(page).toHaveURL(/.*verify.*/, { timeout: 10000 });
    await expect(page.getByText('Verify Your Email')).toBeVisible();
  });

  test('Fails on invalid credentials', async ({ page }) => {
    await page.goto('/(auth)/login');

    await page.getByPlaceholder('you@company.com').fill('admin@test.com');
    await page.getByPlaceholder('Enter your password').fill('wrongpassword');

    await page.getByRole('button', { name: 'Login' }).click();

    // Should see an inline error or something similar
    // The exact error message depends on the backend, usually "Invalid credentials"
    await expect(page.getByText('Invalid email or password')).toBeVisible({ timeout: 10000 });
  });
});
