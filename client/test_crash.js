import { createRequire } from 'module';

const requireFromScratch = createRequire(new URL('../scratch/package.json', import.meta.url));
const puppeteer = requireFromScratch('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setBypassServiceWorker(true);
  const fakeUser = {
    id: 'profile-smoke-test',
    name: 'Profile Smoke Test',
    email: 'profile-smoke@example.com',
    isAdmin: false,
    age: 30,
    weight: 70,
    height: 170,
    gender: 'other',
    goal: 'maintain',
    activityLevel: 'sedentary',
    dailyCalorieGoal: 2000,
    dailyWaterGoalMl: 2500,
    photoUrl: null,
    macroTargets: { proteinG: 110, carbsG: 250, fatG: 67 },
  };
  
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.toString()));
  
  try {
    await page.setRequestInterception(true);
    page.on('request', request => {
      const url = request.url();
      if (url.includes('/api/auth/me')) {
        request.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ user: fakeUser }),
        });
        return;
      }

      if (url.includes('/api/meal-sections')) {
        request.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            sections: [
              { _id: 'breakfast-section', name: 'Breakfast', icon: '', sortOrder: 0 },
              { _id: 'lunch-section', name: 'Lunch', icon: '', sortOrder: 1 },
            ],
          }),
        });
        return;
      }

      request.continue();
    });

    await page.goto('http://localhost:5173/login');
    await page.evaluate((user) => {
      localStorage.setItem('pureintake_token', 'profile-smoke-token');
      localStorage.setItem('pureintake_user', JSON.stringify(user));
    }, fakeUser);
    
    // Go to profile
    await page.goto('http://localhost:5173/profile', { waitUntil: 'networkidle0' });
    await page.waitForSelector('button');
    
    // Click edit
    const buttons = await page.$$('button');
    let editBtn;
    for (let btn of buttons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text.includes('Edit')) editBtn = btn;
    }
    
    if (editBtn) {
      console.log('Clicking edit...');
      await editBtn.click();
      await new Promise((resolve) => setTimeout(resolve, 1000));
      console.log('Clicked edit successfully without crash if no error above.');
    } else {
      throw new Error('Edit button not found');
    }
  } catch (e) {
    console.error('SCRIPT ERROR:', e);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
