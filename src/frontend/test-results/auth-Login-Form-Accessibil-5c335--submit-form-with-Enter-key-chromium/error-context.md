# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.spec.js >> Login Form Accessibility >> should submit form with Enter key
- Location: tests/e2e/auth.spec.js:155:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.fill: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('input[name="email"]')

```

# Test source

```ts
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
  120 | 
  121 |   test('should logout and redirect to login', async ({ page }) => {
  122 |     await page.context().storageState({ path: './tests/.auth/user.json' });
  123 |     
  124 |     await page.goto('/dashboard');
  125 |     
  126 |     const logoutButton = page.locator('button:has-text("logout"), button:has-text("sign out"), a[href="/logout"]').first();
  127 |     if (await logoutButton.isVisible().catch(() => false)) {
  128 |       await logoutButton.click();
  129 |       await expect(page).toHaveURL(/\/login/i);
  130 |     }
  131 |   });
  132 | });
  133 | 
  134 | test.describe('Login Form Accessibility', () => {
  135 |   test('should have proper ARIA labels', async ({ page }) => {
  136 |     await page.goto('/login');
  137 |     
  138 |     await expect(page.locator('input[name="email"]')).toHaveAttribute('type', 'email');
  139 |     await expect(page.locator('input[name="password"]')).toHaveAttribute('type', 'password');
  140 |   });
  141 | 
  142 |   test('should support keyboard navigation', async ({ page }) => {
  143 |     await page.goto('/login');
  144 |     
  145 |     await page.locator('input[name="email"]').focus();
  146 |     await expect(page.locator('input[name="email"]')).toBeFocused();
  147 |     
  148 |     await page.keyboard.press('Tab');
  149 |     await expect(page.locator('input[name="password"]')).toBeFocused();
  150 |     
  151 |     await page.keyboard.press('Tab');
  152 |     await expect(page.locator('button[type="submit"]')).toBeFocused();
  153 |   });
  154 | 
  155 |   test('should submit form with Enter key', async ({ page }) => {
> 156 |     await page.fill('input[name="email"]', 'test@example.com');
      |                ^ Error: page.fill: Test timeout of 30000ms exceeded.
  157 |     await page.fill('input[name="password"]', 'TestPassword123');
  158 |     
  159 |     await page.keyboard.press('Enter');
  160 |     
  161 |     await expect(page.locator('button[type="submit"]')).toBeDisabled();
  162 |   });
  163 | });
  164 | 
```