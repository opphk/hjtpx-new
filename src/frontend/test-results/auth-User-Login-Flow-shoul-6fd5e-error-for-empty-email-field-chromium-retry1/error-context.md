# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.spec.js >> User Login Flow >> should show validation error for empty email field
- Location: tests/e2e/auth.spec.js:15:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('.error-message, [class*="error"]').first()
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('.error-message, [class*="error"]').first()

```

```yaml
- heading "Welcome Back" [level=1]
- paragraph: Please login to your account
- text: 邮箱*
- textbox "邮箱*":
  - /placeholder: 请输入邮箱
- text: 密码*
- textbox "密码*":
  - /placeholder: 请输入密码
  - text: TestPassword123
- button "登录"
- paragraph:
  - text: Don't have an account?
  - link "Sign Up Now":
    - /url: /register
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | test.describe.serial('User Login Flow', () => {
  4   |   test.beforeEach(async ({ page }) => {
  5   |     await page.goto('/login');
  6   |   });
  7   | 
  8   |   test('should display login page with all required elements', async ({ page }) => {
  9   |     await expect(page.locator('h1')).toContainText(/welcome|sign in|login/i);
  10  |     await expect(page.locator('input[name="email"]')).toBeVisible();
  11  |     await expect(page.locator('input[name="password"]')).toBeVisible();
  12  |     await expect(page.locator('button[type="submit"]')).toBeVisible();
  13  |   });
  14  | 
  15  |   test('should show validation error for empty email field', async ({ page }) => {
  16  |     await page.fill('input[name="password"]', 'TestPassword123');
  17  |     await page.click('button[type="submit"]');
  18  |     
> 19  |     await expect(page.locator('.error-message, [class*="error"]').first()).toBeVisible();
      |                                                                            ^ Error: expect(locator).toBeVisible() failed
  20  |   });
  21  | 
  22  |   test('should show validation error for empty password field', async ({ page }) => {
  23  |     await page.fill('input[name="email"]', 'test@example.com');
  24  |     await page.click('button[type="submit"]');
  25  |     
  26  |     await expect(page.locator('.error-message, [class*="error"]').first()).toBeVisible();
  27  |   });
  28  | 
  29  |   test('should show validation error for invalid email format', async ({ page }) => {
  30  |     await page.fill('input[name="email"]', 'invalid-email');
  31  |     await page.fill('input[name="password"]', 'TestPassword123');
  32  |     await page.click('button[type="submit"]');
  33  |     
  34  |     await expect(page.locator('.error-message, [class*="error"]').first()).toContainText(/email|valid/i);
  35  |   });
  36  | 
  37  |   test('should show validation error for short password', async ({ page }) => {
  38  |     await page.fill('input[name="email"]', 'test@example.com');
  39  |     await page.fill('input[name="password"]', 'short');
  40  |     await page.click('button[type="submit"]');
  41  |     
  42  |     await expect(page.locator('.error-message, [class*="error"]').first()).toContainText(/password|8.*character/i);
  43  |   });
  44  | 
  45  |   test('should navigate to registration page when clicking sign up link', async ({ page }) => {
  46  |     const signUpLink = page.locator('a:has-text("sign up"), a:has-text("register"), a[href="/register"]').first();
  47  |     await signUpLink.click();
  48  |     
  49  |     await expect(page).toHaveURL(/\/register/i);
  50  |   });
  51  | 
  52  |   test('should display registration link in footer', async ({ page }) => {
  53  |     const footerText = page.locator('.auth-footer, [class*="footer"]');
  54  |     await expect(footerText).toContainText(/register|sign up|create.*account/i);
  55  |   });
  56  | 
  57  |   test('should show loading state during login submission', async ({ page }) => {
  58  |     await page.fill('input[name="email"]', 'test@example.com');
  59  |     await page.fill('input[name="password"]', 'TestPassword123');
  60  |     
  61  |     const submitButton = page.locator('button[type="submit"]');
  62  |     await submitButton.click();
  63  |     
  64  |     await expect(submitButton).toBeDisabled();
  65  |   });
  66  | 
  67  |   test('should handle network error gracefully', async ({ page }) => {
  68  |     await page.fill('input[name="email"]', 'test@example.com');
  69  |     await page.fill('input[name="password"]', 'TestPassword123');
  70  |     
  71  |     await page.route('**/api/**', route => route.abort());
  72  |     await page.click('button[type="submit"]');
  73  |     
  74  |     await expect(page.locator('.error, .alert, [role="alert"]').first()).toBeVisible({ timeout: 10000 });
  75  |   });
  76  | 
  77  |   test('should clear error message when navigating away', async ({ page }) => {
  78  |     await page.fill('input[name="email"]', 'invalid-email');
  79  |     await page.fill('input[name="password"]', 'TestPassword123');
  80  |     await page.click('button[type="submit"]');
  81  |     
  82  |     await page.locator('.error, .alert').first().waitFor({ state: 'visible' });
  83  |     
  84  |     await page.goto('/register');
  85  |     await page.goto('/login');
  86  |     
  87  |     await expect(page.locator('.error, .alert')).toHaveCount(0);
  88  |   });
  89  | 
  90  |   test('should maintain form data on validation error', async ({ page }) => {
  91  |     const testEmail = 'test@example.com';
  92  |     await page.fill('input[name="email"]', testEmail);
  93  |     await page.fill('input[name="password"]', 'short');
  94  |     await page.click('button[type="submit"]');
  95  |     
  96  |     await expect(page.locator('input[name="email"]')).toHaveValue(testEmail);
  97  |   });
  98  | });
  99  | 
  100 | test.describe('Authenticated User Session', () => {
  101 |   test('should redirect to dashboard after successful login', async ({ page }) => {
  102 |     await page.goto('/login');
  103 |     
  104 |     await page.fill('input[name="email"]', 'admin@example.com');
  105 |     await page.fill('input[name="password"]', 'Admin123!');
  106 |     await page.click('button[type="submit"]');
  107 |     
  108 |     await page.waitForURL(/\/dashboard/i, { timeout: 15000 }).catch(() => {
  109 |       console.log('Login may have failed or redirected elsewhere');
  110 |     });
  111 |   });
  112 | 
  113 |   test('should persist session after page reload', async ({ page }) => {
  114 |     await page.context().storageState({ path: './tests/.auth/user.json' });
  115 |     
  116 |     await page.goto('/dashboard');
  117 |     
  118 |     await expect(page).toHaveURL(/\/dashboard/i);
  119 |   });
```