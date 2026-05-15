# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: register.spec.js >> Registration Form Accessibility >> should submit form with Enter key
- Location: tests/e2e/register.spec.js:232:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.fill: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('input[name="name"]')

```

# Test source

```ts
  133 |     await expect(footerText).toContainText(/sign in|login|already.*account/i);
  134 |   });
  135 | 
  136 |   test('should show loading state during registration submission', async ({ page }) => {
  137 |     await page.fill('input[name="name"]', 'New User');
  138 |     await page.fill('input[name="email"]', 'newuser@example.com');
  139 |     await page.fill('input[name="password"]', 'ValidPassword123');
  140 |     await page.fill('input[name="confirmPassword"]', 'ValidPassword123');
  141 |     
  142 |     const submitButton = page.locator('button[type="submit"]');
  143 |     await submitButton.click();
  144 |     
  145 |     await expect(submitButton).toBeDisabled();
  146 |   });
  147 | 
  148 |   test('should handle network error gracefully', async ({ page }) => {
  149 |     await page.fill('input[name="name"]', 'New User');
  150 |     await page.fill('input[name="email"]', 'newuser@example.com');
  151 |     await page.fill('input[name="password"]', 'ValidPassword123');
  152 |     await page.fill('input[name="confirmPassword"]', 'ValidPassword123');
  153 |     
  154 |     await page.route('**/api/**', route => route.abort());
  155 |     await page.click('button[type="submit"]');
  156 |     
  157 |     await expect(page.locator('.error, .alert, [role="alert"]').first()).toBeVisible({ timeout: 10000 });
  158 |   });
  159 | 
  160 |   test('should clear error message when navigating away', async ({ page }) => {
  161 |     await page.fill('input[name="email"]', 'invalid-email');
  162 |     await page.fill('input[name="password"]', 'ValidPassword123');
  163 |     await page.fill('input[name="confirmPassword"]', 'DifferentPassword123');
  164 |     await page.click('button[type="submit"]');
  165 |     
  166 |     await page.locator('.error, .alert').first().waitFor({ state: 'visible' });
  167 |     
  168 |     await page.goto('/login');
  169 |     await page.goto('/register');
  170 |     
  171 |     await expect(page.locator('.error, .alert')).toHaveCount(0);
  172 |   });
  173 | 
  174 |   test('should maintain form data on validation error', async ({ page }) => {
  175 |     const testName = 'Valid User';
  176 |     const testEmail = 'valid@example.com';
  177 |     
  178 |     await page.fill('input[name="name"]', testName);
  179 |     await page.fill('input[name="email"]', testEmail);
  180 |     await page.fill('input[name="password"]', 'short');
  181 |     await page.fill('input[name="confirmPassword"]', 'short');
  182 |     await page.click('button[type="submit"]');
  183 |     
  184 |     await expect(page.locator('input[name="name"]')).toHaveValue(testName);
  185 |     await expect(page.locator('input[name="email"]')).toHaveValue(testEmail);
  186 |   });
  187 | 
  188 |   test('should register with valid data', async ({ page }) => {
  189 |     const timestamp = Date.now();
  190 |     const uniqueEmail = `newuser${timestamp}@example.com`;
  191 |     
  192 |     await page.fill('input[name="name"]', `Test User ${timestamp}`);
  193 |     await page.fill('input[name="email"]', uniqueEmail);
  194 |     await page.fill('input[name="password"]', 'ValidPassword123');
  195 |     await page.fill('input[name="confirmPassword"]', 'ValidPassword123');
  196 |     await page.click('button[type="submit"]');
  197 |     
  198 |     await page.waitForURL(/\/(login|dashboard|verify)/i, { timeout: 15000 }).catch(() => {
  199 |       console.log('Registration may have succeeded or redirected elsewhere');
  200 |     });
  201 |   });
  202 | });
  203 | 
  204 | test.describe('Registration Form Accessibility', () => {
  205 |   test('should have proper input types', async ({ page }) => {
  206 |     await page.goto('/register');
  207 |     
  208 |     await expect(page.locator('input[name="email"]')).toHaveAttribute('type', 'email');
  209 |     await expect(page.locator('input[name="password"]')).toHaveAttribute('type', 'password');
  210 |     await expect(page.locator('input[name="confirmPassword"]')).toHaveAttribute('type', 'password');
  211 |   });
  212 | 
  213 |   test('should support keyboard navigation', async ({ page }) => {
  214 |     await page.goto('/register');
  215 |     
  216 |     await page.locator('input[name="name"]').focus();
  217 |     await expect(page.locator('input[name="name"]')).toBeFocused();
  218 |     
  219 |     await page.keyboard.press('Tab');
  220 |     await expect(page.locator('input[name="email"]')).toBeFocused();
  221 |     
  222 |     await page.keyboard.press('Tab');
  223 |     await expect(page.locator('input[name="password"]')).toBeFocused();
  224 |     
  225 |     await page.keyboard.press('Tab');
  226 |     await expect(page.locator('input[name="confirmPassword"]')).toBeFocused();
  227 |     
  228 |     await page.keyboard.press('Tab');
  229 |     await expect(page.locator('button[type="submit"]')).toBeFocused();
  230 |   });
  231 | 
  232 |   test('should submit form with Enter key', async ({ page }) => {
> 233 |     await page.fill('input[name="name"]', 'New User');
      |                ^ Error: page.fill: Test timeout of 30000ms exceeded.
  234 |     await page.fill('input[name="email"]', 'newuser@example.com');
  235 |     await page.fill('input[name="password"]', 'ValidPassword123');
  236 |     await page.fill('input[name="confirmPassword"]', 'ValidPassword123');
  237 |     
  238 |     await page.keyboard.press('Enter');
  239 |     
  240 |     await expect(page.locator('button[type="submit"]')).toBeDisabled();
  241 |   });
  242 | });
  243 | 
  244 | test.describe('Registration Password Requirements', () => {
  245 |   test('should validate password meets all requirements', async ({ page }) => {
  246 |     await page.fill('input[name="name"]', 'New User');
  247 |     await page.fill('input[name="email"]', 'newuser@example.com');
  248 |     
  249 |     await page.fill('input[name="password"]', 'Ab1');
  250 |     await page.fill('input[name="confirmPassword"]', 'Ab1');
  251 |     await page.click('button[type="submit"]');
  252 |     
  253 |     await expect(page.locator('.error-message, [class*="error"]').first()).toContainText(/password|8.*character/i);
  254 |   });
  255 | 
  256 |   test('should accept valid password with all requirements', async ({ page }) => {
  257 |     await page.fill('input[name="name"]', 'New User');
  258 |     await page.fill('input[name="email"]', 'newuser@example.com');
  259 |     await page.fill('input[name="password"]', 'MySecure123');
  260 |     await page.fill('input[name="confirmPassword"]', 'MySecure123');
  261 |     
  262 |     await page.click('button[type="submit"]');
  263 |     
  264 |     await page.waitForURL(/\//i, { timeout: 10000 }).catch(() => {
  265 |       expect(page.url()).not.toBe('/register');
  266 |     });
  267 |   });
  268 | });
  269 | 
```