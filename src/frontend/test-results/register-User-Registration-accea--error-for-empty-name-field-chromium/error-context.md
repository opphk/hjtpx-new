# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: register.spec.js >> User Registration Flow >> should show validation error for empty name field
- Location: tests/e2e/register.spec.js:17:3

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
- heading "Create Account" [level=1]
- paragraph: Join us and start exploring
- text: 用户名*
- textbox "用户名*":
  - /placeholder: 请输入用户名
- text: 邮箱*
- textbox "邮箱*":
  - /placeholder: 请输入邮箱
  - text: newuser@example.com
- text: 密码*
- textbox "密码*":
  - /placeholder: 请输入密码
  - text: ValidPassword123
- text: 确认密码*
- textbox "确认密码*":
  - /placeholder: 请再次输入密码
  - text: ValidPassword123
- button "注册"
- paragraph:
  - text: Already have an account?
  - link "Sign In Now":
    - /url: /login
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | test.describe.serial('User Registration Flow', () => {
  4   |   test.beforeEach(async ({ page }) => {
  5   |     await page.goto('/register');
  6   |   });
  7   | 
  8   |   test('should display registration page with all required elements', async ({ page }) => {
  9   |     await expect(page.locator('h1')).toContainText(/create|register|sign up/i);
  10  |     await expect(page.locator('input[name="name"]')).toBeVisible();
  11  |     await expect(page.locator('input[name="email"]')).toBeVisible();
  12  |     await expect(page.locator('input[name="password"]')).toBeVisible();
  13  |     await expect(page.locator('input[name="confirmPassword"]')).toBeVisible();
  14  |     await expect(page.locator('button[type="submit"]')).toBeVisible();
  15  |   });
  16  | 
  17  |   test('should show validation error for empty name field', async ({ page }) => {
  18  |     await page.fill('input[name="email"]', 'newuser@example.com');
  19  |     await page.fill('input[name="password"]', 'ValidPassword123');
  20  |     await page.fill('input[name="confirmPassword"]', 'ValidPassword123');
  21  |     await page.click('button[type="submit"]');
  22  |     
> 23  |     await expect(page.locator('.error-message, [class*="error"]').first()).toBeVisible();
      |                                                                            ^ Error: expect(locator).toBeVisible() failed
  24  |   });
  25  | 
  26  |   test('should show validation error for short name', async ({ page }) => {
  27  |     await page.fill('input[name="name"]', 'a');
  28  |     await page.fill('input[name="email"]', 'newuser@example.com');
  29  |     await page.fill('input[name="password"]', 'ValidPassword123');
  30  |     await page.fill('input[name="confirmPassword"]', 'ValidPassword123');
  31  |     await page.click('button[type="submit"]');
  32  |     
  33  |     await expect(page.locator('.error-message, [class*="error"]').first()).toContainText(/name|2.*character/i);
  34  |   });
  35  | 
  36  |   test('should show validation error for empty email field', async ({ page }) => {
  37  |     await page.fill('input[name="name"]', 'New User');
  38  |     await page.fill('input[name="password"]', 'ValidPassword123');
  39  |     await page.fill('input[name="confirmPassword"]', 'ValidPassword123');
  40  |     await page.click('button[type="submit"]');
  41  |     
  42  |     await expect(page.locator('.error-message, [class*="error"]').first()).toBeVisible();
  43  |   });
  44  | 
  45  |   test('should show validation error for invalid email format', async ({ page }) => {
  46  |     await page.fill('input[name="name"]', 'New User');
  47  |     await page.fill('input[name="email"]', 'invalid-email');
  48  |     await page.fill('input[name="password"]', 'ValidPassword123');
  49  |     await page.fill('input[name="confirmPassword"]', 'ValidPassword123');
  50  |     await page.click('button[type="submit"]');
  51  |     
  52  |     await expect(page.locator('.error-message, [class*="error"]').first()).toContainText(/email|valid/i);
  53  |   });
  54  | 
  55  |   test('should show validation error for empty password field', async ({ page }) => {
  56  |     await page.fill('input[name="name"]', 'New User');
  57  |     await page.fill('input[name="email"]', 'newuser@example.com');
  58  |     await page.click('button[type="submit"]');
  59  |     
  60  |     await expect(page.locator('.error-message, [class*="error"]').first()).toBeVisible();
  61  |   });
  62  | 
  63  |   test('should show validation error for short password', async ({ page }) => {
  64  |     await page.fill('input[name="name"]', 'New User');
  65  |     await page.fill('input[name="email"]', 'newuser@example.com');
  66  |     await page.fill('input[name="password"]', 'short');
  67  |     await page.fill('input[name="confirmPassword"]', 'short');
  68  |     await page.click('button[type="submit"]');
  69  |     
  70  |     await expect(page.locator('.error-message, [class*="error"]').first()).toContainText(/password|8.*character/i);
  71  |   });
  72  | 
  73  |   test('should show validation error for password without uppercase', async ({ page }) => {
  74  |     await page.fill('input[name="name"]', 'New User');
  75  |     await page.fill('input[name="email"]', 'newuser@example.com');
  76  |     await page.fill('input[name="password"]', 'validpassword123');
  77  |     await page.fill('input[name="confirmPassword"]', 'validpassword123');
  78  |     await page.click('button[type="submit"]');
  79  |     
  80  |     await expect(page.locator('.error-message, [class*="error"]').first()).toContainText(/password|uppercase|lower|capital/i);
  81  |   });
  82  | 
  83  |   test('should show validation error for password without lowercase', async ({ page }) => {
  84  |     await page.fill('input[name="name"]', 'New User');
  85  |     await page.fill('input[name="email"]', 'newuser@example.com');
  86  |     await page.fill('input[name="password"]', 'VALIDPASSWORD123');
  87  |     await page.fill('input[name="confirmPassword"]', 'VALIDPASSWORD123');
  88  |     await page.click('button[type="submit"]');
  89  |     
  90  |     await expect(page.locator('.error-message, [class*="error"]').first()).toContainText(/password|lowercase|upper/i);
  91  |   });
  92  | 
  93  |   test('should show validation error for password without number', async ({ page }) => {
  94  |     await page.fill('input[name="name"]', 'New User');
  95  |     await page.fill('input[name="email"]', 'newuser@example.com');
  96  |     await page.fill('input[name="password"]', 'ValidPassword');
  97  |     await page.fill('input[name="confirmPassword"]', 'ValidPassword');
  98  |     await page.click('button[type="submit"]');
  99  |     
  100 |     await expect(page.locator('.error-message, [class*="error"]').first()).toContainText(/password|number|digit/i);
  101 |   });
  102 | 
  103 |   test('should show validation error for password mismatch', async ({ page }) => {
  104 |     await page.fill('input[name="name"]', 'New User');
  105 |     await page.fill('input[name="email"]', 'newuser@example.com');
  106 |     await page.fill('input[name="password"]', 'ValidPassword123');
  107 |     await page.fill('input[name="confirmPassword"]', 'DifferentPassword123');
  108 |     await page.click('button[type="submit"]');
  109 |     
  110 |     await expect(page.locator('.error-message, [class*="error"]').first()).toContainText(/password|confirm|mismatch|not match/i);
  111 |   });
  112 | 
  113 |   test('should show multiple validation errors at once', async ({ page }) => {
  114 |     await page.click('button[type="submit"]');
  115 |     
  116 |     await page.waitForTimeout(500);
  117 |     
  118 |     const errorMessages = page.locator('.error-message, [class*="error"]');
  119 |     const errorCount = await errorMessages.count();
  120 |     
  121 |     expect(errorCount).toBeGreaterThan(1);
  122 |   });
  123 | 
```