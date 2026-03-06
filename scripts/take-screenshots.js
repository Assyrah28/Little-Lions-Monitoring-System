// scripts/take-screenshots.js
// Takes screenshots of all pages for each role using Playwright
//
// Usage:
//   1. Fill in the credentials below
//   2. Start dev server: npm start
//   3. Run: npx playwright test scripts/take-screenshots.js --headed
//      Or simply: node scripts/take-screenshots.js

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

// ============================================
// FILL IN YOUR CREDENTIALS HERE
// ============================================
const BASE_URL = 'http://localhost:3000';

const ACCOUNTS = {
  super_admin: { email: 'SUPER_ADMIN_EMAIL', password: 'SUPER_ADMIN_PASSWORD' },
  admin:       { email: 'ADMIN_EMAIL',       password: 'ADMIN_PASSWORD' },
  teacher:     { email: 'TEACHER_EMAIL',     password: 'TEACHER_PASSWORD' },
  therapist:   { email: 'THERAPIST_EMAIL',   password: 'THERAPIST_PASSWORD' },
  parent:      { email: 'PARENT_EMAIL',      password: 'PARENT_PASSWORD' },
};
// ============================================

const ROUTES_BY_ROLE = {
  public: [
    { name: 'Landing-Login', path: '/login' },
    { name: 'Forgot-Password', path: '/forgot-password' },
    { name: 'Activate', path: '/activate' },
  ],
  super_admin: [
    { name: 'Student-Profiles', path: '/admin/StudentProfile' },
    { name: 'One-On-One', path: '/admin/one-on-one' },
    { name: 'Play-Group', path: '/admin/play-group' },
    { name: 'Manage-Teachers', path: '/admin/manage-teachers' },
    { name: 'Manage-Therapists', path: '/admin/manage-therapists' },
    { name: 'Manage-Admins', path: '/admin/manage-admins' },
    { name: 'Enrollment', path: '/admin/enrollment' },
    { name: 'Concerns', path: '/admin/concerns' },
    { name: 'Pending-Accounts', path: '/admin/pending-accounts' },
    { name: 'User-Access', path: '/admin/user-access' },
    { name: 'Cleanup-Students', path: '/admin/cleanup-students' },
  ],
  admin: [
    { name: 'Student-Profiles', path: '/admin/StudentProfile' },
    { name: 'One-On-One', path: '/admin/one-on-one' },
    { name: 'Play-Group', path: '/admin/play-group' },
    { name: 'Manage-Teachers', path: '/admin/manage-teachers' },
    { name: 'Manage-Therapists', path: '/admin/manage-therapists' },
    { name: 'Enrollment', path: '/admin/enrollment' },
    { name: 'Concerns', path: '/admin/concerns' },
    { name: 'Pending-Accounts', path: '/admin/pending-accounts' },
    { name: 'User-Access', path: '/admin/user-access' },
  ],
  teacher: [
    { name: 'Dashboard', path: '/teacher/dashboard' },
    { name: 'Profile', path: '/teacher/profile' },
    { name: 'Play-Group-Upload', path: '/teacher/play-group-upload' },
    { name: 'Enrollment', path: '/teacher/enrollment' },
  ],
  therapist: [
    { name: 'Dashboard', path: '/therapist/dashboard' },
    { name: 'Session-Form', path: '/therapist/session-form' },
    { name: 'Profile', path: '/therapist/profile' },
    { name: 'Enrollment', path: '/therapist/enrollment' },
  ],
  parent: [
    { name: 'Dashboard', path: '/parent/dashboard' },
    { name: 'Concerns', path: '/parent/concerns' },
    { name: 'Monthly-Summary', path: '/parent/summary' },
    { name: 'Daily-Digest', path: '/parent/digest' },
  ],
};

const WAIT_MS = 3000; // Wait for page to fully load
const OUTPUT_DIR = path.join(__dirname, '..', 'screenshots');

async function login(page, email, password) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Fill login form
  const emailInput = page.locator('input[type="email"]');
  const passwordInput = page.locator('input[type="password"]');

  await emailInput.fill(email);
  await passwordInput.fill(password);

  // Click login button
  const loginBtn = page.locator('button', { hasText: /login/i });
  await loginBtn.click();

  // Wait for navigation away from login
  await page.waitForTimeout(3000);
  await page.waitForLoadState('networkidle');
}

async function takeScreenshot(page, role, routeName, routePath, folderPath) {
  try {
    await page.goto(`${BASE_URL}${routePath}`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(WAIT_MS);

    // Dismiss any modals that might appear (click overlay if present)
    // We take the screenshot with modal if it's there - it's a feature too

    const fileName = `${routeName}.png`;
    const filePath = path.join(folderPath, fileName);

    await page.screenshot({ path: filePath, fullPage: true });
    console.log(`  [OK] ${role}/${routeName}`);
  } catch (err) {
    console.log(`  [FAIL] ${role}/${routeName} - ${err.message}`);
  }
}

async function run() {
  // Create output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });

  // --- 1. Public pages (no login needed) ---
  console.log('\n--- Public Pages ---');
  const publicDir = path.join(OUTPUT_DIR, 'public');
  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

  const publicContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const publicPage = await publicContext.newPage();

  for (const route of ROUTES_BY_ROLE.public) {
    await takeScreenshot(publicPage, 'public', route.name, route.path, publicDir);
  }
  await publicContext.close();

  // --- 2. Role-based pages ---
  const roles = ['super_admin', 'admin', 'teacher', 'therapist', 'parent'];

  for (const role of roles) {
    const creds = ACCOUNTS[role];
    if (!creds || creds.email.includes('_EMAIL')) {
      console.log(`\n--- ${role} --- SKIPPED (no credentials) ---`);
      continue;
    }

    console.log(`\n--- ${role} ---`);
    const roleDir = path.join(OUTPUT_DIR, role);
    if (!fs.existsSync(roleDir)) fs.mkdirSync(roleDir, { recursive: true });

    // Desktop viewport
    const desktopContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const desktopPage = await desktopContext.newPage();

    try {
      await login(desktopPage, creds.email, creds.password);
      console.log(`  Logged in as ${role} (desktop)`);

      const desktopDir = path.join(roleDir, 'desktop');
      if (!fs.existsSync(desktopDir)) fs.mkdirSync(desktopDir, { recursive: true });

      for (const route of ROUTES_BY_ROLE[role]) {
        await takeScreenshot(desktopPage, role, route.name, route.path, desktopDir);
      }
    } catch (err) {
      console.log(`  [LOGIN FAIL] ${role} desktop: ${err.message}`);
    }
    await desktopContext.close();

    // Mobile viewport
    const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
    const mobilePage = await mobileContext.newPage();

    try {
      await login(mobilePage, creds.email, creds.password);
      console.log(`  Logged in as ${role} (mobile)`);

      const mobileDir = path.join(roleDir, 'mobile');
      if (!fs.existsSync(mobileDir)) fs.mkdirSync(mobileDir, { recursive: true });

      for (const route of ROUTES_BY_ROLE[role]) {
        await takeScreenshot(mobilePage, role, route.name, route.path, mobileDir);
      }
    } catch (err) {
      console.log(`  [LOGIN FAIL] ${role} mobile: ${err.message}`);
    }
    await mobileContext.close();
  }

  await browser.close();
  console.log(`\nDone! Screenshots saved to: ${OUTPUT_DIR}`);
}

run().catch(console.error);
