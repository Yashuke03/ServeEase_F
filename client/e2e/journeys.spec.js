import { test, expect } from '@playwright/test';

test.describe('ServeEase End-to-End Workflow & Security Journeys', () => {

  test('Journey A & F: Unauthenticated barrier & Customer registration & dashboard workflow', async ({ page }) => {
    // 1. RBAC Guard Barrier: Unauthenticated user accessing protected route is deflected
    await page.goto('/customer/bookings');
    await expect(page).toHaveURL(/.*login.*/);

    // 2. Navigate to Registration page
    await page.goto('/register');
    await expect(page.getByRole('heading', { name: /Create Your Account/i })).toBeVisible();

    // Verify Customer tab is selected by default
    const customerTab = page.getByRole('tab', { name: /I Need Services \(Customer\)/i });
    await expect(customerTab).toBeVisible();

    // Fill customer registration form
    const uniqueEmail = `test.user.${Date.now()}@example.com`;
    await page.getByLabel(/Full Name/i).fill('Aarav Mehta');
    await page.getByLabel(/Email Address/i).fill(uniqueEmail);
    await page.getByLabel(/Phone Number/i).fill('9811223344');
    await page.getByPlaceholder(/At least 6 characters/i).fill('Password@123');
    await page.getByLabel(/Your City/i).selectOption('sangli');

    // Submit registration
    const submitBtn = page.getByRole('button', { name: /Create Customer Account/i });
    await submitBtn.click();

    // Verify redirect to email verification screen
    await expect(page).toHaveURL(/.*verify-email.*/);
    await expect(page.getByRole('heading', { name: /Verify Your Email/i })).toBeVisible();
    await expect(page.getByLabel(/6-Digit Verification Code/i)).toBeVisible();
  });

  test('Journey A (cont): Customer login, service discovery, and bookings interface', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /Welcome Back/i })).toBeVisible();

    await page.locator('#login-email').fill('amit.customer@example.com');
    await page.locator('#login-password').fill('Customer@123');

    await page.getByRole('button', { name: /Sign In as Customer/i }).click();

    // Customer lands on dashboard
    await expect(page).toHaveURL(/.*customer\/dashboard.*/);
    await expect(page.getByRole('heading', { name: /Amit Joshi/i })).toBeVisible();

    // Service Discovery
    await page.goto('/services');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // Customer Bookings page
    await page.goto('/customer/bookings');
    await expect(page.getByRole('heading', { name: /Service Bookings/i })).toBeVisible();
  });

  test('Journey B: Service Provider login, schedule view, and arrival verification interface', async ({ page }) => {
    await page.goto('/login');

    const providerTab = page.getByRole('tab', { name: /Provider/i });
    await providerTab.click();

    await page.locator('#login-email').fill('rajesh.provider@example.com');
    await page.locator('#login-password').fill('Provider@123');

    await page.getByRole('button', { name: /Sign In as Provider/i }).click();

    // Provider lands on dashboard
    await expect(page).toHaveURL(/.*provider\/dashboard.*/);
    await expect(page.getByRole('heading', { name: /Rajesh Sharma/i })).toBeVisible();

    // Check Provider Bookings management
    await page.goto('/provider/bookings');
    await expect(page.getByText(/Upcoming Jobs/i)).toBeVisible();
  });

  test('Journey C: Administrator authentication, platform diagnostics, tabs, and user oversight', async ({ page }) => {
    await page.goto('/login');

    const adminTab = page.getByRole('tab', { name: 'Admin' });
    await adminTab.click();

    await page.locator('#login-email').fill('admin@serveease.com');
    await page.locator('#login-password').fill('Admin@123');

    await page.getByRole('button', { name: /Sign In as Administrator/i }).click();

    // Admin lands on Admin Dashboard
    await expect(page).toHaveURL(/.*admin\/dashboard.*/);
    await expect(page.getByRole('heading', { level: 1, name: /Platform Administrator/i })).toBeVisible();

    // Diagnostic stats cards
    await expect(page.getByText(/Total Customers/i)).toBeVisible();
    await expect(page.getByText(/Overview & Diagnostics/i)).toBeVisible();

    // Switch to User Accounts tab
    const usersTab = page.getByRole('button', { name: /User Accounts/i });
    await usersTab.click();
    await expect(page.getByPlaceholder(/Search name, email\.\.\./i)).toBeVisible();

    // Switch to Verification Queue tab
    const queueTab = page.getByRole('button', { name: /Verification Queue/i });
    await queueTab.click();
    await expect(page.getByText(/Provider Verification & Credentials/i)).toBeVisible();
  });

  test('Journey D: Password recovery workflow and form validation', async ({ page }) => {
    await page.goto('/forgot-password');
    await expect(page.getByRole('heading', { name: /Forgot Password/i })).toBeVisible();

    await page.locator('#recovery-email').fill('amit.customer@example.com');
    const sendBtn = page.getByRole('button', { name: /Get OTP/i });
    await expect(sendBtn).toBeVisible();
  });

  test('Journey E: Multi-context role isolation & Cross-role route deflection', async ({ browser }) => {
    // Context 1: Customer session
    const customerContext = await browser.newContext();
    const customerPage = await customerContext.newPage();

    await customerPage.goto('/login');
    await customerPage.locator('#login-email').fill('amit.customer@example.com');
    await customerPage.locator('#login-password').fill('Customer@123');
    await customerPage.getByRole('button', { name: /Sign In as Customer/i }).click();
    await expect(customerPage).toHaveURL(/.*customer\/dashboard.*/);

    // Customer tries to access Admin portal directly
    await customerPage.goto('/admin/dashboard');
    // Access Restricted shield is displayed
    await expect(customerPage.getByText(/Access Restricted/i)).toBeVisible();

    // Context 2: Admin session in parallel
    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();

    await adminPage.goto('/login');
    await adminPage.getByRole('tab', { name: 'Admin' }).click();
    await adminPage.locator('#login-email').fill('admin@serveease.com');
    await adminPage.locator('#login-password').fill('Admin@123');
    await adminPage.getByRole('button', { name: /Sign In as Administrator/i }).click();

    // Admin has full authorized access
    await expect(adminPage).toHaveURL(/.*admin\/dashboard.*/);
    await expect(adminPage.getByRole('heading', { level: 1, name: /Platform Administrator/i })).toBeVisible();

    await customerContext.close();
    await adminContext.close();
  });

});
