import { chromium } from '@playwright/test'
const out = process.argv[2]
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 420, height: 1100 } })
await p.goto('http://localhost:3013/sms-terms', { waitUntil: 'networkidle' })
for (const lang of ['en', 'es']) {
  if (lang === 'es') { await p.locator('header button').first().click(); await p.waitForTimeout(500) }
  const txt = await p.locator('main').innerText()
  console.log(`--- ${lang} ---\n` + txt)
  await p.screenshot({ path: `${out}/sms-terms-${lang}.png`, fullPage: true })
}
await b.close()
