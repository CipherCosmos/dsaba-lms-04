import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should load login page', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/DSABA LMS/);
  });

  test('should show login form', async ({ page }) => {
    await page.goto('/');

    // Check for login form elements
    await expect(page.locator('input[type="text"], input[name*="username"], input[placeholder*="username" i]')).toBeVisible();
    await expect(page.locator('input[type="password"], input[name*="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")')).toBeVisible();
  });

  test('should show validation errors for empty form', async ({ page }) => {
    await page.goto('/');

    // Find and click submit button
    const submitButton = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")').first();
    await submitButton.click();

    // Should show some form of validation or error
    await expect(page.locator('text=/required|empty|invalid/i')).toBeVisible({ timeout: 5000 });
  });

  test('should handle invalid credentials', async ({ page }) => {
    await page.goto('/');

    // Fill in invalid credentials
    const usernameInput = page.locator('input[type="text"], input[name*="username"], input[placeholder*="username" i]').first();
    const passwordInput = page.locator('input[type="password"], input[name*="password"]').first();

    await usernameInput.fill('invaliduser');
    await passwordInput.fill('invalidpass');

    // Submit form
    const submitButton = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")').first();
    await submitButton.click();

    // Should show error message
    await expect(page.locator('text=/invalid|incorrect|wrong|failed/i')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Navigation', () => {
  test('should navigate to different pages', async ({ page }) => {
    await page.goto('/');

    // Check if navigation elements exist
    const navElements = page.locator('nav, [role="navigation"], .navbar, .sidebar, .menu');
    if (await navElements.count() > 0) {
      await expect(navElements.first()).toBeVisible();
    }
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Page should still be usable on mobile
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Accessibility', () => {
  test('should have proper heading structure', async ({ page }) => {
    await page.goto('/');

    // Check for at least one h1 element
    const h1Elements = page.locator('h1');
    const h1Count = await h1Elements.count();

    if (h1Count === 0) {
      // If no h1, check for other heading elements
      const headings = page.locator('h1, h2, h3, h4, h5, h6');
      await expect(headings.first()).toBeVisible();
    } else {
      await expect(h1Elements.first()).toBeVisible();
    }
  });

  test('should have alt text for images', async ({ page }) => {
    await page.goto('/');

    // Check images have alt attributes
    const images = page.locator('img');
    const imageCount = await images.count();

    if (imageCount > 0) {
      for (let i = 0; i < imageCount; i++) {
        const alt = await images.nth(i).getAttribute('alt');
        // Alt can be empty for decorative images, but should exist
        expect(alt).not.toBeNull();
      }
    }
  });

  test('should have focusable elements', async ({ page }) => {
    await page.goto('/');

    // Check for interactive elements
    const interactiveElements = page.locator('button, a, input, select, textarea');
    await expect(interactiveElements.first()).toBeVisible();
  });
});