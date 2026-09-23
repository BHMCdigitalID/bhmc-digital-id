const express = require('express');
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', [
  path.join(__dirname, 'views'),
  path.join(process.cwd(), 'views')
]);
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Public verification endpoint
app.get('/verify/:id', (req, res) => {
  const usersPath = path.join(__dirname, 'data', 'users.json');
  const users = JSON.parse(fs.readFileSync(usersPath, 'utf-8'));
  const user = users.find(u => u.id.toLowerCase() === req.params.id.toLowerCase());

  if (!user) {
    return res.status(404).render('not-found', { id: req.params.id });
  }

  const scanTime = new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' });
  res.render('profile', { user, scanTime });
});

// Admin form UI - Served directly as inline HTML
app.get('/admin', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>BHMC ID - HR/IT Portal</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-100 min-h-screen p-4 sm:p-8 font-sans">
  <div class="max-w-3xl mx-auto space-y-6">
    <header class="bg-emerald-700 text-white p-6 rounded-2xl shadow flex justify-between items-center">
      <div>
        <h1 class="text-2xl font-bold">BHMC Digital ID Portal</h1>
        <p class="text-emerald-100 text-sm">Employee Enrollment & Instant QR</p>
      </div>
      <span class="bg-emerald-800 text-xs px-3 py-1 rounded-full uppercase tracking-wider font-semibold">Staff Only</span>
    </header>

    <form action="/admin/add" method="POST" class="bg-white p-6 rounded-2xl shadow space-y-4">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label class="block text-xs font-semibold text-slate-600 mb-1">Employee ID *</label>
          <input type="text" name="id" placeholder="ADM-768" required class="w-full border rounded-lg p-2.5 text-sm uppercase outline-none focus:ring-2 focus:ring-emerald-500">
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-600 mb-1">Full Name *</label>
          <input type="text" name="fullName" placeholder="MARIA CLARA SANTOS" required class="w-full border rounded-lg p-2.5 text-sm uppercase outline-none focus:ring-2 focus:ring-emerald-500">
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-600 mb-1">Department *</label>
          <input type="text" name="department" placeholder="NURSING" required class="w-full border rounded-lg p-2.5 text-sm uppercase outline-none focus:ring-2 focus:ring-emerald-500">
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-600 mb-1">Role / Position *</label>
          <input type="text" name="role" placeholder="HEAD NURSE" required class="w-full border rounded-lg p-2.5 text-sm uppercase outline-none focus:ring-2 focus:ring-emerald-500">
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-600 mb-1">Issued Date *</label>
          <input type="date" name="issuedDate" required class="w-full border rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500">
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-600 mb-1">Expiry Date (Optional)</label>
          <input type="date" name="expiryDate" class="w-full border rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500">
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-600 mb-1">Email</label>
          <input type="email" name="email" placeholder="nurse@bhmc.com" class="w-full border rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500">
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-600 mb-1">Phone</label>
          <input type="text" name="phone" placeholder="+63 912 345 6789" class="w-full border rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500">
        </div>
        <div class="sm:col-span-2">
          <label class="block text-xs font-semibold text-slate-600 mb-1">Photo URL (Optional)</label>
          <input type="text" name="photoUrl" placeholder="/images/ADM-768.png or direct web image URL" class="w-full border rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500">
        </div>
        <div class="sm:col-span-2">
          <label class="block text-xs font-semibold text-slate-600 mb-1">Admin Security PIN / Password *</label>
          <input type="password" name="pin" placeholder="Enter portal password" required class="w-full border rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500">
        </div>
      </div>
      <button type="submit" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-lg shadow transition">
        Save and Submit
      </button>
    </form>
  </div>
</body>
</html>`);
});

// Admin submit route: updates users.json directly on GitHub
app.post('/admin/add', async (req, res) => {
  const { id, fullName, role, department, issuedDate, expiryDate, email, phone, photoUrl, pin } = req.body;

  const validPin = process.env.ADMIN_PASSWORD || 'bhmcdigitalid2026';
  if (pin !== validPin) {
    return res.status(401).send(`
      <div style="font-family:sans-serif; text-align:center; padding: 50px;">
        <h2 style="color:#dc2626;">Incorrect Admin Security Password</h2>
        <p>Please go back and verify your credentials.</p>
        <a href="/admin" style="color:#059669; font-weight:bold;">← Go Back</a>
      </div>
    `);
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return res.status(500).send(`
      <div style="font-family:sans-serif; text-align:center; padding: 50px;">
        <h2 style="color:#dc2626;">GITHUB_TOKEN missing in Vercel settings</h2>
        <a href="/admin" style="color:#059669; font-weight:bold;">← Go Back</a>
      </div>
    `);
  }

  const cleanId = id.trim().toUpperCase();
  const repoOwner = 'BHMCdigitalID';
  const repoName = 'bhmc-digital-id';
  const filePath = 'data/users.json';
  const apiUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}`;

  try {
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

    const targetUrl = `https://bhmc-digital-id.vercel.app/verify/${cleanId}`;
    const qrImage = await QRCode.toDataURL(targetUrl, { width: 400, margin: 2 });

    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Employee Added - BHMC Digital ID</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-100 min-h-screen p-8 flex items-center justify-center font-sans">
  <div class="bg-white p-8 rounded-2xl shadow-md max-w-md w-full text-center space-y-4 border border-emerald-200">
    <div class="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-xl font-bold">✓</div>
    <h2 class="text-xl font-bold text-slate-800">Employee Saved Successfully!</h2>
    <p class="text-xs text-slate-500">Record committed to GitHub. Verification goes live in ~20 seconds.</p>
    <img src="${qrImage}" alt="QR Code" class="w-48 h-48 mx-auto border p-2 rounded-xl shadow-inner">
    <p class="font-mono text-base font-bold text-slate-700">${cleanId}</p>
    <div class="space-y-2 pt-2">
      <a href="${qrImage}" download="${cleanId}-QR.png" class="block w-full bg-emerald-700 hover:bg-emerald-800 text-white py-2.5 rounded-lg text-sm font-semibold shadow">Download QR PNG</a>
      <a href="/admin" class="block w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-lg text-sm font-medium">← Enroll Another Employee</a>
    </div>
  </div>
</body>
</html>`);
  } catch (err) {
    res.status(500).send(`
      <div style="font-family:sans-serif; text-align:center; padding: 50px;">
        <h2 style="color:#dc2626;">Error: ${err.message}</h2>
        <a href="/admin" style="color:#059669; font-weight:bold;">← Go Back</a>
      </div>
    `);
  }
});

app.listen(PORT, () => {
  console.log(`Verification server running at http://localhost:${PORT}`);
});

module.exports = app;
