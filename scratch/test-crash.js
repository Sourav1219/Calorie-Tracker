const puppeteer = require('puppeteer');

(async () => {
  console.log('Starting puppeteer...');
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on('pageerror', error => {
    console.log('PAGE ERROR:', error.message);
  });
  
  page.on('console', msg => {
    if (msg.type() === 'error') console.log('CONSOLE ERROR:', msg.text());
  });

  try {
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0' });
    console.log('Navigated to login');

    await page.type('input[type="email"]', 'test2@example.com');
    await page.type('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    await page.waitForSelector('h1', { timeout: 5000 });
    console.log('Logged in successfully');

    await page.goto('http://localhost:5173/log', { waitUntil: 'networkidle0' });
    console.log('On Meal Log page');

    await page.evaluate(() => {
      const editBtn = document.querySelector('button.border-dashed');
      if (editBtn) editBtn.click();
    });
    console.log('Opened MealSectionSheet');

    await page.waitForSelector('input[type="text"]', { timeout: 5000 });
    console.log('Sheet rendered');

    await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input[type="text"]'));
      if (inputs.length > 0) {
        inputs[0].focus();
        inputs[0].value = inputs[0].value + '2';
        inputs[0].blur(); 
      }
    });
    console.log('Updated first section, waiting to see if crash occurs...');
    
    await new Promise(r => setTimeout(r, 4000));
    
    console.log('Done.');
  } catch (err) {
    console.error('Script Error:', err);
  } finally {
    await browser.close();
  }
})();
