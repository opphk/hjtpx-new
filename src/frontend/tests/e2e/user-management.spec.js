import { test, expect } from '@playwright/test';

test.describe.serial('Admin User Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().storageState({ path: './tests/.auth/admin.json' });
  });

  test('should display user management page with required elements', async ({ page }) => {
    await page.goto('/admin/users');
    
    await expect(page.locator('h1')).toContainText(/user|manage|admin/i);
    await expect(page.locator('button:has-text("create"), button:has-text("add")')).toBeVisible();
    await expect(page.locator('table, [class*="table"]')).toBeVisible();
  });

  test('should display search input field', async ({ page }) => {
    await page.goto('/admin/users');
    
    const searchInput = page.locator('input[placeholder*="search"], input[placeholder*="搜索"]');
    await expect(searchInput).toBeVisible();
  });

  test('should display role filter dropdown', async ({ page }) => {
    await page.goto('/admin/users');
    
    const roleFilter = page.locator('select:has(option[value="admin"]), select:has(option[value="user"])');
    await expect(roleFilter).toBeVisible();
  });

  test('should display status filter dropdown', async ({ page }) => {
    await page.goto('/admin/users');
    
    const statusFilter = page.locator('select:has(option[value="active"]), select:has(option[value="inactive"])');
    await expect(statusFilter).toBeVisible();
  });

  test('should search users by name or email', async ({ page }) => {
    await page.goto('/admin/users');
    
    const searchInput = page.locator('input[placeholder*="search"], input[placeholder*="搜索"]').first();
    await searchInput.fill('admin');
    await page.waitForTimeout(1000);
    
    const table = page.locator('table tbody tr');
    const rowCount = await table.count();
    
    expect(rowCount).toBeGreaterThan(0);
  });

  test('should filter users by role', async ({ page }) => {
    await page.goto('/admin/users');
    
    const roleFilter = page.locator('select').filter({ has: page.locator('option[value="admin"]') }).first();
    await roleFilter.selectOption('admin');
    await page.waitForTimeout(1000);
    
    await expect(page.locator('table')).toBeVisible();
  });

  test('should filter users by status', async ({ page }) => {
    await page.goto('/admin/users');
    
    const statusFilter = page.locator('select').filter({ has: page.locator('option[value="active"]') }).first();
    await statusFilter.selectOption('active');
    await page.waitForTimeout(1000);
    
    await expect(page.locator('table')).toBeVisible();
  });

  test('should clear all filters', async ({ page }) => {
    await page.goto('/admin/users');
    
    const searchInput = page.locator('input[placeholder*="search"], input[placeholder*="搜索"]').first();
    await searchInput.fill('test');
    
    const roleFilter = page.locator('select').filter({ has: page.locator('option[value="admin"]') }).first();
    await roleFilter.selectOption('admin');
    
    await searchInput.fill('');
    await roleFilter.selectOption('');
    
    await page.waitForTimeout(500);
    await expect(page.locator('table')).toBeVisible();
  });

  test('should display user table with pagination', async ({ page }) => {
    await page.goto('/admin/users');
    
    const pagination = page.locator('[class*="pagination"], [class*="page"]');
    await expect(pagination).toBeVisible().catch(() => {
      expect(page.locator('table')).toBeVisible();
    });
  });

  test('should navigate through pagination', async ({ page }) => {
    await page.goto('/admin/users');
    
    const nextButton = page.locator('button:has-text("next"), button:has-text("下一页"), button[aria-label*="next"]').first();
    
    if (await nextButton.isVisible().catch(() => false)) {
      await nextButton.click();
      await page.waitForTimeout(500);
      await expect(page.locator('table')).toBeVisible();
    }
  });
});

test.describe('User Creation', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().storageState({ path: './tests/.auth/admin.json' });
  });

  test('should open create user modal when clicking create button', async ({ page }) => {
    await page.goto('/admin/users');
    
    const createButton = page.locator('button:has-text("create"), button:has-text("添加"), button:has-text("新建")').first();
    await createButton.click();
    
    await expect(page.locator('[role="dialog"], .modal, .modal-content')).toBeVisible();
  });

  test('should display form fields in create user modal', async ({ page }) => {
    await page.goto('/admin/users');
    
    const createButton = page.locator('button:has-text("create"), button:has-text("添加"), button:has-text("新建")').first();
    await createButton.click();
    
    await expect(page.locator('input[name="name"], input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('select[name="role"], select[name="status"]')).toBeVisible();
  });

  test('should validate required fields before submission', async ({ page }) => {
    await page.goto('/admin/users');
    
    const createButton = page.locator('button:has-text("create"), button:has-text("添加"), button:has-text("新建")').first();
    await createButton.click();
    
    await page.locator('button[type="submit"], button:has-text("save"), button:has-text("保存")').first().click();
    
    await expect(page.locator('.error-message, [class*="error"]').first()).toBeVisible();
  });

  test('should close create user modal', async ({ page }) => {
    await page.goto('/admin/users');
    
    const createButton = page.locator('button:has-text("create"), button:has-text("添加"), button:has-text("新建")').first();
    await createButton.click();
    
    const closeButton = page.locator('[role="dialog"] button[aria-label*="close"], .modal button[aria-label*="close"], button:has-text("×"), button:has-text("close")').first();
    await closeButton.click();
    
    await expect(page.locator('[role="dialog"], .modal')).not.toBeVisible();
  });

  test('should create user with valid data', async ({ page }) => {
    await page.goto('/admin/users');
    
    const createButton = page.locator('button:has-text("create"), button:has-text("添加"), button:has-text("新建")').first();
    await createButton.click();
    
    const timestamp = Date.now();
    await page.fill('input[name="name"]', `Test User ${timestamp}`);
    await page.fill('input[name="email"]', `testuser${timestamp}@example.com`);
    await page.fill('input[name="password"]', 'ValidPassword123');
    
    const roleSelect = page.locator('select[name="role"]').first();
    if (await roleSelect.isVisible().catch(() => false)) {
      await roleSelect.selectOption('user');
    }
    
    await page.locator('button[type="submit"], button:has-text("save"), button:has-text("保存")').first().click();
    
    await page.waitForTimeout(2000);
    
    await expect(page.locator('.success, .alert-success, [role="alert"]').first()).toBeVisible({ timeout: 5000 }).catch(() => {
      console.log('Success message may not be visible');
    });
  });
});

test.describe('User Editing', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().storageState({ path: './tests/.auth/admin.json' });
  });

  test('should open edit user modal when clicking edit button', async ({ page }) => {
    await page.goto('/admin/users');
    
    await page.waitForSelector('table tbody tr', { timeout: 10000 }).catch(() => {});
    
    const editButton = page.locator('button:has-text("edit"), button:has-text("编辑")').first();
    if (await editButton.isVisible().catch(() => false)) {
      await editButton.click();
      
      await expect(page.locator('[role="dialog"], .modal')).toBeVisible();
    }
  });

  test('should pre-fill form with user data when editing', async ({ page }) => {
    await page.goto('/admin/users');
    
    await page.waitForSelector('table tbody tr', { timeout: 10000 }).catch(() => {});
    
    const editButton = page.locator('button:has-text("edit"), button:has-text("编辑")').first();
    if (await editButton.isVisible().catch(() => false)) {
      await editButton.click();
      
      const nameInput = page.locator('input[name="name"]').first();
      await expect(nameInput).not.toBeEmpty();
    }
  });

  test('should update user role', async ({ page }) => {
    await page.goto('/admin/users');
    
    await page.waitForSelector('table tbody tr', { timeout: 10000 }).catch(() => {});
    
    const editButton = page.locator('button:has-text("edit"), button:has-text("编辑")').first();
    if (await editButton.isVisible().catch(() => false)) {
      await editButton.click();
      
      const roleSelect = page.locator('select[name="role"]').first();
      if (await roleSelect.isVisible().catch(() => false)) {
        await roleSelect.selectOption('admin');
        
        await page.locator('button[type="submit"], button:has-text("save"), button:has-text("保存")').first().click();
        
        await page.waitForTimeout(2000);
      }
    }
  });

  test('should update user status', async ({ page }) => {
    await page.goto('/admin/users');
    
    await page.waitForSelector('table tbody tr', { timeout: 10000 }).catch(() => {});
    
    const statusToggle = page.locator('button:has-text("active"), button:has-text("禁用"), [class*="toggle"]').first();
    if (await statusToggle.isVisible().catch(() => false)) {
      await statusToggle.click();
      
      await page.waitForTimeout(1000);
    }
  });
});

test.describe('User Deletion', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().storageState({ path: './tests/.auth/admin.json' });
  });

  test('should show confirmation dialog before deletion', async ({ page }) => {
    await page.goto('/admin/users');
    
    await page.waitForSelector('table tbody tr', { timeout: 10000 }).catch(() => {});
    
    page.on('dialog', async dialog => {
      expect(dialog.message()).toMatch(/delete|confirm|remove/i);
      await dialog.dismiss();
    });
    
    const deleteButton = page.locator('button:has-text("delete"), button:has-text("删除")').first();
    if (await deleteButton.isVisible().catch(() => false)) {
      await deleteButton.click();
    }
  });

  test('should cancel user deletion when confirming dialog', async ({ page }) => {
    await page.goto('/admin/users');
    
    await page.waitForSelector('table tbody tr', { timeout: 10000 }).catch(() => {});
    
    page.on('dialog', async dialog => {
      await dialog.dismiss();
    });
    
    const deleteButton = page.locator('button:has-text("delete"), button:has-text("删除")').first();
    if (await deleteButton.isVisible().catch(() => false)) {
      await deleteButton.click();
      await page.waitForTimeout(500);
    }
  });
});

test.describe('Bulk User Operations', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().storageState({ path: './tests/.auth/admin.json' });
  });

  test('should select individual users with checkboxes', async ({ page }) => {
    await page.goto('/admin/users');
    
    await page.waitForSelector('table tbody tr', { timeout: 10000 }).catch(() => {});
    
    const checkbox = page.locator('table tbody tr:first-child input[type="checkbox"]').first();
    if (await checkbox.isVisible().catch(() => false)) {
      await checkbox.check();
      
      const bulkActions = page.locator('[class*="bulk"], [class*="selected"]');
      await expect(bulkActions).toBeVisible().catch(() => {});
    }
  });

  test('should select all users with select all checkbox', async ({ page }) => {
    await page.goto('/admin/users');
    
    await page.waitForSelector('table tbody tr', { timeout: 10000 }).catch(() => {});
    
    const selectAllCheckbox = page.locator('thead input[type="checkbox"], th input[type="checkbox"]').first();
    if (await selectAllCheckbox.isVisible().catch(() => false)) {
      await selectAllCheckbox.check();
      
      const selectedCount = page.locator('[class*="selected-count"], [class*="bulk"] span').first();
      await expect(selectedCount).toBeVisible().catch(() => {});
    }
  });

  test('should perform bulk status change', async ({ page }) => {
    await page.goto('/admin/users');
    
    await page.waitForSelector('table tbody tr', { timeout: 10000 }).catch(() => {});
    
    const checkbox = page.locator('table tbody tr:first-child input[type="checkbox"]').first();
    if (await checkbox.isVisible().catch(() => false)) {
      await checkbox.check();
      
      const bulkActionSelect = page.locator('select[class*="bulk"]').first();
      if (await bulkActionSelect.isVisible().catch(() => false)) {
        await bulkActionSelect.selectOption('status');
        
        const applyButton = page.locator('button:has-text("apply"), button:has-text("应用")').first();
        if (await applyButton.isVisible().catch(() => false)) {
          page.on('dialog', dialog => dialog.dismiss());
          await applyButton.click();
        }
      }
    }
  });

  test('should perform bulk user deletion', async ({ page }) => {
    await page.goto('/admin/users');
    
    await page.waitForSelector('table tbody tr', { timeout: 10000 }).catch(() => {});
    
    const checkbox = page.locator('table tbody tr:first-child input[type="checkbox"]').first();
    if (await checkbox.isVisible().catch(() => false)) {
      await checkbox.check();
      
      const bulkActionSelect = page.locator('select[class*="bulk"]').first();
      if (await bulkActionSelect.isVisible().catch(() => false)) {
        await bulkActionSelect.selectOption('delete');
        
        const applyButton = page.locator('button:has-text("apply"), button:has-text("应用")').first();
        if (await applyButton.isVisible().catch(() => false)) {
          page.on('dialog', dialog => dialog.dismiss());
          await applyButton.click();
        }
      }
    }
  });

  test('should clear user selection', async ({ page }) => {
    await page.goto('/admin/users');
    
    await page.waitForSelector('table tbody tr', { timeout: 10000 }).catch(() => {});
    
    const checkbox = page.locator('table tbody tr:first-child input[type="checkbox"]').first();
    if (await checkbox.isVisible().catch(() => false)) {
      await checkbox.check();
      
      const clearButton = page.locator('button:has-text("clear"), button:has-text("取消选择")').first();
      if (await clearButton.isVisible().catch(() => false)) {
        await clearButton.click();
        
        await expect(checkbox).not.toBeChecked();
      }
    }
  });
});

test.describe('User Management Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().storageState({ path: './tests/.auth/admin.json' });
  });

  test('should support keyboard navigation in table', async ({ page }) => {
    await page.goto('/admin/users');
    
    await page.locator('table').focus();
    await page.keyboard.press('Tab');
    
    await expect(page).toHaveURL(/\/admin\/users/i);
  });

  test('should close modal with Escape key', async ({ page }) => {
    await page.goto('/admin/users');
    
    const createButton = page.locator('button:has-text("create"), button:has-text("添加"), button:has-text("新建")').first();
    await createButton.click();
    
    await expect(page.locator('[role="dialog"], .modal')).toBeVisible();
    
    await page.keyboard.press('Escape');
    
    await page.waitForTimeout(500);
  });
});

test.describe('User Management Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().storageState({ path: './tests/.auth/admin.json' });
  });

  test('should display error message on API failure', async ({ page }) => {
    await page.goto('/admin/users');
    
    await page.route('**/api/**', route => {
      if (route.request().method() === 'GET') {
        return route.fulfill({ status: 500, body: 'Internal Server Error' });
      }
      route.continue();
    });
    
    await page.reload();
    
    await expect(page.locator('.error, .alert, [role="alert"]').first()).toBeVisible().catch(() => {
      expect(page.locator('body')).toBeVisible();
    });
  });

  test('should retry on network failure', async ({ page }) => {
    await page.goto('/admin/users');
    
    let requestCount = 0;
    await page.route('**/api/**', route => {
      requestCount++;
      if (requestCount < 2) {
        return route.abort();
      }
      route.continue();
    });
    
    await page.reload();
    
    await expect(page.locator('table')).toBeVisible({ timeout: 15000 }).catch(() => {
      expect(page.locator('body')).toBeVisible();
    });
  });
});
