const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');

const BASE_URL = 'http://localhost:3000';

const outputDir = path.join(__dirname, 'output_qrs');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

const users = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'users.json'), 'utf-8'));

async function generateAll() {
  console.log('Generating QR codes...');
  for (const user of users) {
    const targetUrl = `${BASE_URL}/verify/${encodeURIComponent(user.id)}`;
    const filePath = path.join(outputDir, `${user.id}.png`);

    await QRCode.toFile(filePath, targetUrl, {
      width: 600,
      margin: 2,
      errorCorrectionLevel: 'H',
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    console.log(`[✔] QR created for ${user.fullName}: ${filePath}`);
  }
  console.log('Finished! Check the output_qrs folder.');
}

generateAll().catch(err => console.error('Error generating QRs:', err));