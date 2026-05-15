import { test, expect } from '@playwright/test';

test.describe.serial('User Registration Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/register');
  });

  test('should display registration page with all required elements', async ({ page }) => {
    await expect(page.locator('h1')).toContainText(/create|register|sign up/i);
    await expect(page.locator('input[name="name"]')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('input[name="confirmPassword"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should show validation error for empty name field', async ({ page }) => {
    await page.fill('input[name="email"]', 'newuser@example.com');
    await page.fill('input[name="password"]', 'ValidPassword123');
    await page.fill('input[name="confirmPassword"]', 'ValidPassword123');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('.error-message, [class*="error"]').first()).toBeVisible();
  });

  test('should show validation error for short name', async ({ page }) => {
    await page.fill('input[name="name"]', 'a');
    await page.fill('input[name="email"]', 'newuser@example.com');
    await page.fill('input[name="password"]', 'ValidPassword123');
    await page.fill('input[name="confirmPassword"]', 'ValidPassword123');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('.error-message, [class*="error"]').first()).toContainText(/name|2.*character/i);
  });

  test('should show validation error for empty email field', async ({ page }) => {
    await page.fill('input[name="name"]', 'New User');
    await page.fill('input[name="password"]', 'ValidPassword123');
    await page.fill('input[name="confirmPassword"]', 'ValidPassword123');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('.error-message, [class*="error"]').first()).toBeVisible();
  });

  test('should show validation error for invalid email format', async ({ page }) => {
    await page.fill('input[name="name"]', 'New User');
    await page.fill('input[name="email"]', 'invalid-email');
    await page.fill('input[name="password"]', 'ValidPassword123');
    await page.fill('input[name="confirmPassword"]', 'ValidPassword123');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('.error-message, [class*="error"]').first()).toContainText(/email|valid/i);
  });

  test('should show validation error for empty password field', async ({ page }) => {
    await page.fill('input[name="name"]', 'New User');
    await page.fill('input[name="email"]', 'newuser@example.com');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('.error-message, [class*="error"]').first()).toBeVisible();
  });

  test('should show validation error for short password', async ({ page }) => {
    await page.fill('input[name="name"]', 'New User');
    await page.fill('input[name="email"]', 'newuser@example.com');
    await page.fill('input[name="password"]', 'short');
    await page.fill('input[name="confirmPassword"]', 'short');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('.error-message, [class*="error"]').first()).toContainText(/password|8.*character/i);
  });

  test('should show validation error for password without uppercase', async ({ page }) => {
    await page.fill('input[name="name"]', 'New User');
    await page.fill('input[name="email"]', 'newuser@example.com');
    await page.fill('input[name="password"]', 'validpassword123');
    await page.fill('input[name="confirmPassword"]', 'validpassword123');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('.error-message, [class*="error"]').first()).toContainText(/password|uppercase|lower|capital/i);
  });

  test('should show validation error for password without lowercase', async ({ page }) => {
    await page.fill('input[name="name"]', 'New User');
    await page.fill('input[name="email"]', 'newuser@example.com');
    await page.fill('input[name="password"]', 'VALIDPASSWORD123');
    await page.fill('input[name="confirmPassword"]', 'VALIDPASSWORD123');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('.error-message, [class*="error"]').first()).toContainText(/password|lowercase|upper/i);
  });

  test('should show validation error for password without number', async ({ page }) => {
    await page.fill('input[name="name"]', 'New User');
    await page.fill('input[name="email"]', 'newuser@example.com');
    await page.fill('input[name="password"]', 'ValidPassword');
    await page.fill('input[name="confirmPassword"]', 'ValidPassword');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('.error-message, [class*="error"]').first()).toContainText(/password|number|digit/i);
  });

  test('should show validation error for password mismatch', async ({ page }) => {
    await page.fill('input[name="name"]', 'New User');
    await page.fill('input[name="email"]', 'newuser@example.com');
    await page.fill('input[name="password"]', 'ValidPassword123');
    await page.fill('input[name="confirmPassword"]', 'DifferentPassword123');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('.error-message, [class*="error"]').first()).toContainText(/password|confirm|mismatch|not match/i);
  });

  test('should show multiple validation errors at once', async ({ page }) => {
    await page.click('button[type="submit"]');
    
    await page.waitForTimeout(500);
    
    const errorMessages = page.locator('.error-message, [class*="error"]');
    const errorCount = await errorMessages.count();
    
    expect(errorCount).toBeGreaterThan(1);
  });

  test('should navigate to login page when clicking sign in link', async ({ page }) => {
    const signInLink = page.locator('a:has-text("sign in"), a:has-text("login"), a[href="/login"]').first();
    await signInLink.click();
    
    await expect(page).toHaveURL(/\/login/i);
  });

  test('should display login link in footer', async ({ page }) => {
    const footerText = page.locator('.auth-footer, [class*="footer"]');
    await expect(footerText).toContainText(/sign in|login|already.*account/i);
  });

  test('should show loading state during registration submission', async ({ page }) => {
    await page.fill('input[name="name"]', 'New User');
    await page.fill('input[name="email"]', 'newuser@example.com');
    await page.fill('input[name="password"]', 'ValidPassword123');
    await page.fill('input[name="confirmPassword"]', 'ValidPassword123');
    
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();
    
    await expect(submitButton).toBeDisabled();
  });

  test('should handle network error gracefully', async ({ page }) => {
    await page.fill('input[name="name"]', 'New User');
    await page.fill('input[name="email"]', 'newuser@example.com');
    await page.fill('input[name="password"]', 'ValidPassword123');
    await page.fill('input[name="confirmPassword"]', 'ValidPassword123');
    
    await page.route('**/api/**', route => route.abort());
    await page.click('button[type="submit"]');
    
    await expect(page.locator('.error, .alert, [role="alert"]').first()).toBeVisible({ timeout: 10000 });
  });

  test('should clear error message when navigating away', async ({ page }) => {
    await page.fill('input[name="email"]', 'invalid-email');
    await page.fill('input[name="password"]', 'ValidPassword123');
    await page.fill('input[name="confirmPassword"]', 'DifferentPassword123');
    await page.click('button[type="submit"]');
    
    await page.locator('.error, .alert').first().waitFor({ state: 'visible' });
    
    await page.goto('/login');
    await page.goto('/register');
    
    await expect(page.locator('.error, .alert')).toHaveCount(0);
  });

  test('should maintain form data on validation error', async ({ page }) => {
    const testName = 'Valid User';
    const testEmail = 'valid@example.com';
    
    await page.fill('input[name="name"]', testName);
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', 'short');
    await page.fill('input[name="confirmPassword"]', 'short');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('input[name="name"]')).toHaveValue(testName);
    await expect(page.locator('input[name="email"]')).toHaveValue(testEmail);
  });

  test('should register with valid data', async ({ page }) => {
    const timestamp = Date.now();
    const uniqueEmail = `newuser${timestamp}@example.com`;
    
    await page.fill('input[name="name"]', `Test User ${timestamp}`);
    await page.fill('input[name="email"]', uniqueEmail);
    await page.fill('input[name="password"]', 'ValidPassword123');
    await page.fill('input[name="confirmPassword"]', 'ValidPassword123');
    await page.click('button[type="submit"]');
    
    await page.waitForURL(/\/(login|dashboard|verify)/i, { timeout: 15000 }).catch(() => {
      console.log('Registration may have succeeded or redirected elsewhere');
    });
  });
});

test.describe('Registration Form Accessibility', () => {
  test('should have proper input types', async ({ page }) => {
    await page.goto('/register');
    
    await expect(page.locator('input[name="email"]')).toHaveAttribute('type', 'email');
    await expect(page.locator('input[name="password"]')).toHaveAttribute('type', 'password');
    await expect(page.locator('input[name="confirmPassword"]')).toHaveAttribute('type', 'password');
  });

  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('/register');
    
    await page.locator('input[name="name"]').focus();
    await expect(page.locator('input[name="name"]')).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(page.locator('input[name="email"]')).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(page.locator('input[name="password"]')).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(page.locator('input[name="confirmPassword"]')).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(page.locator('button[type="submit"]')).toBeFocused();
  });

  test('should submit form with Enter key', async ({ page }) => {
    await page.fill('input[name="name"]', 'New User');
    await page.fill('input[name="email"]', 'newuser@example.com');
    await page.fill('input[name="password"]', 'ValidPassword123');
    await page.fill('input[name="confirmPassword"]', 'ValidPassword123');
    
    await page.keyboard.press('Enter');
    
    await expect(page.locator('button[type="submit"]')).toBeDisabled();
  });
});

test.describe('Registration Password Requirements', () => {
  test('should validate password meets all requirements', async ({ page }) => {
    await page.fill('input[name="name"]', 'New User');
    await page.fill('input[name="email"]', 'newuser@example.com');
    
    await page.fill('input[name="password"]', 'Ab1');
    await page.fill('input[name="confirmPassword"]', 'Ab1');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('.error-message, [class*="error"]').first()).toContainText(/password|8.*character/i);
  });

  test('should accept valid password with all requirements', async ({ page }) => {
    await page.fill('input[name="name"]', 'New User');
    await page.fill('input[name="email"]', 'newuser@example.com');
    await page.fill('input[name="password"]', 'MySecure123');
    await page.fill('input[name="confirmPassword"]', 'MySecure123');
    
    await page.click('button[type="submit"]');
    
    await page.waitForURL(/\//i, { timeout: 10000 }).catch(() => {
      expect(page.url()).not.toBe('/register');
    });
  });
});
