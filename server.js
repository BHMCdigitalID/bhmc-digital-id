const express = require('express');
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Public verification endpoint
app.get('/verify/:id', (req, res) => {
  const users = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'users.json'), 'utf-8'));
  const user = users.find(u => u.id.toLowerCase() === req.params.id.toLowerCase());

  if (!user) {
    return res.status(404).render('not-found', { id: req.params.id });
  }

  const scanTime = new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' });
  res.render('profile', { user, scanTime });
});

// Admin form UI
app.get('/admin', (req, res) => {
  res.render('admin', { success: false, error: null });
});

// Admin submit route: updates users.json directly on GitHub
app.post('/admin/add', async (req, res) => {
  const { id, fullName, role, department, issuedDate, expiryDate, email, phone, photoUrl, pin } = req.body;

  const validPin = process.env.ADMIN_PASSWORD || 'bhmcdigitalid2026';
  if (pin !== validPin) {
    return res.render('admin', { success: false, error: 'Incorrect Admin Security Password.' });
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return res.render('admin', { success: false, error: 'GITHUB_TOKEN is missing in Vercel settings.' });
  }

  const cleanId = id.trim().toUpperCase();
  const repoOwner = 'BHMCdigitalID';
  const repoName = 'bhmc-digital-id';
  const filePath = 'data/users.json';
  const apiUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}`;

  try {
    // 1. Fetch current users.json from GitHub
    const getRes = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'BHMC-App',
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!getRes.ok) throw new Error('Could not fetch users.json from GitHub');
    const fileData = await getRes.json();
    const sha = fileData.sha;
    const content = Buffer.from(fileData.content, 'base64').toString('utf-8');
    const users = JSON.parse(content);

    // 2. Prepare new user payload
    const newUser = {
      id: cleanId,
      fullName: fullName.trim().toUpperCase(),
      role: role.trim().toUpperCase(),
      department: department.trim().toUpperCase(),
      status: 'ACTIVE',
      issuedDate: issuedDate || '',
      expiryDate: expiryDate || '',
      photoUrl: photoUrl ? photoUrl.trim() : `/images/${cleanId}.png`,
      email: email ? email.trim() : '',
      phone: phone ? phone.trim() : ''
    };

    const index = users.findIndex(u => u.id.toUpperCase() === cleanId);
    if (index >= 0) {
      users[index] = newUser;
    } else {
      users.push(newUser);
    }

    // 3. Commit updated users.json back to GitHub
    const updatedContent = Buffer.from(JSON.stringify(users, null, 2)).toString('base64');
    const putRes = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'BHMC-App',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `Auto-add employee ${cleanId} via Admin Portal`,
        content: updatedContent,
        sha: sha,
        branch: 'main'
      })
    });

    if (!putRes.ok) throw new Error('Failed to commit update to GitHub repository');

    // 4. Generate QR code for immediate download
    const targetUrl = `https://bhmc-digital-id.vercel.app/verify/${cleanId}`;
    const qrImage = await QRCode.toDataURL(targetUrl, { width: 400, margin: 2 });

    res.render('admin', { success: true, error: null, qrImage, newId: cleanId });
  } catch (err) {
    res.render('admin', { success: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Verification server running at http://localhost:${PORT}`);
});

module.exports = app;
