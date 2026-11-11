// Builds public/privacy-policy-{en,es}.pdf from the Markdown sources next to
// this script. Layout copies the original 2026-04 PDFs: US Letter, centered
// title + date/website lines, numbered section headings, bullet lists, and a
// "CLC Photography … Page N" footer. Sections never split across pages.
//
// Usage: node scripts/privacy-policy/make-privacy-pdfs.mjs 2026-11-12 [outDir]
//   The date is the Effective Date printed at the top — use the day the new
//   PDFs go live. Pass "draft" instead to print a visible placeholder.
//   outDir defaults to public/.
//
// Source format (deliberately tiny): "# " title, "> " centered line,
// "## " section heading, "### " sub-heading, "- " bullet, anything else is a
// paragraph. Blank lines separate blocks.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const here = dirname(fileURLToPath(import.meta.url))
const [date, outDir = join(here, '../../public')] = process.argv.slice(2)
if (date !== 'draft' && !/^\d{4}-\d{2}-\d{2}$/.test(date || '')) {
  console.error('Usage: node make-privacy-pdfs.mjs YYYY-MM-DD|draft [outDir]')
  process.exit(1)
}

const LANGS = {
  en: { page: 'Page', draftDate: '[PUBLICATION DATE — set when published]' },
  es: { page: 'Página', draftDate: '[FECHA DE PUBLICACIÓN — se fija al publicar]' },
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// Each "## " section and "### " sub-section is wrapped so the PDF never
// splits a short section, a sub-section, a paragraph or a list across pages.
function toHtml(md, effectiveDate) {
  const out = []
  let list = false, section = false, sub = false
  const closeList = () => { if (list) { out.push('</ul>'); list = false } }
  const closeSub = () => { closeList(); if (sub) { out.push('</div>'); sub = false } }
  const closeSection = () => { closeSub(); if (section) { out.push('</section>'); section = false } }
  for (const raw of md.replaceAll('{{EFFECTIVE_DATE}}', effectiveDate).split('\n')) {
    const line = raw.trim()
    if (!line.startsWith('- ')) closeList()
    if (!line) continue
    if (line.startsWith('### ')) {
      closeSub(); out.push(`<div class="sub"><h3>${esc(line.slice(4))}</h3>`); sub = true
    } else if (line.startsWith('## ')) {
      closeSection(); out.push(`<section><h2>${esc(line.slice(3))}</h2>`); section = true
    } else if (line.startsWith('# ')) out.push(`<h1>${esc(line.slice(2))}</h1>`)
    else if (line.startsWith('> ')) out.push(`<p class="meta">${esc(line.slice(2))}</p>`)
    else if (line.startsWith('- ')) {
      if (!list) { out.push('<ul>'); list = true }
      out.push(`<li>${esc(line.slice(2))}</li>`)
    } else out.push(`<p>${esc(line)}</p>`)
  }
  closeSection()
  return out.join('\n')
}

// DejaVu Sans is the original font; Verdana (on every Mac) is the near match.
const CSS = `
  body { font-family: "DejaVu Sans", Verdana, sans-serif; font-size: 9.25pt; line-height: 1.28; color: #000; margin: 0; }
  h1 { font-size: 18pt; text-align: center; margin: 0 0 14pt; color: #111; }
  .meta { text-align: center; margin: 0; color: #222; }
  section:first-of-type { margin-top: 18pt; }
  section, .sub, ul, p, li { break-inside: avoid; }
  /* Long sections with sub-headings may break, but only between whole blocks. */
  section:has(.sub) { break-inside: auto; }
  h2 { font-size: 13pt; margin: 12pt 0 5pt; color: #111; break-after: avoid; }
  h3 { font-size: 12pt; margin: 14pt 0 6pt; color: #111; break-after: avoid; }
  p { margin: 0 0 8pt; }
  ul { list-style: none; margin: 0 0 6pt; padding: 0 0 0 4pt; }
  li { margin: 0 0 3.5pt; padding-left: 10pt; text-indent: -10pt; }
  li::before { content: "• "; }
`

const footer = (label) => `<div style="font-family: Verdana, sans-serif; font-size: 7.5pt; color: #444; width: 100%; padding: 0 0.7in; display: flex; justify-content: space-between;">
  <span>CLC Photography</span><span>${label} <span class="pageNumber"></span></span></div>`

const browser = await chromium.launch()
try {
  const page = await browser.newPage()
  for (const [lang, L] of Object.entries(LANGS)) {
    const md = readFileSync(join(here, `privacy-policy-${lang}.md`), 'utf8')
    const body = toHtml(md, date === 'draft' ? L.draftDate : date)
    await page.setContent(`<!doctype html><html lang="${lang}"><meta charset="utf-8"><style>${CSS}</style><body>${body}</body></html>`)
    const path = join(outDir, `privacy-policy-${lang}.pdf`)
    await page.pdf({
      path, format: 'Letter', printBackground: true,
      margin: { top: '0.6in', bottom: '0.75in', left: '0.75in', right: '0.75in' },
      displayHeaderFooter: true, headerTemplate: '<span></span>', footerTemplate: footer(L.page),
    })
    console.log('wrote', path)
  }
} finally {
  await browser.close()
}
