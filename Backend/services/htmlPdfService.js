const fs = require('fs');
const path = require('path');
const ejs = require('ejs');
const puppeteer = require('puppeteer');

class HtmlPdfService {
  static async generatePdfFromTemplate(data, outPath) {
    const tplPath = path.join(__dirname, '..', 'templates', 'report.html.ejs');
    const html = await ejs.renderFile(tplPath, data, { async: true });

    const browser = await puppeteer.launch({ args: ['--no-sandbox','--disable-setuid-sandbox'] });
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      // Add simple footer with page numbers via CSS printing options
      const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '20mm', bottom: '24mm', left: '16mm', right: '16mm' } });
      if (outPath) fs.writeFileSync(outPath, pdfBuffer);
      return pdfBuffer;
    } finally {
      await browser.close();
    }
  }
}

module.exports = HtmlPdfService;
