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
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(express.json({ limit: '10mb' }));

// Helper to safely load users.json
function getLocalUsers() {
  const usersPath = path.join(__dirname, 'data', 'users.json');
  try {
    if (fs.existsSync(usersPath)) {
      return JSON.parse(fs.readFileSync(usersPath, 'utf-8'));
    }
  } catch (err) {
    console.error('Error reading local users.json:', err);
  }
  return [];
}

// Public verification endpoint
app.get('/verify/:id', (req, res) => {
  const users = getLocalUsers();
  const user = users.find(u => u.id.toLowerCase() === req.params.id.toLowerCase());

  if (!user) {
    return res.status(404).render('not-found', { id: req.params.id });
  }

  const scanTime = new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' });
  res.render('profile', { user, scanTime });
});

// Admin form UI + Live Directory Table + Password-Protected CSV Export
app.get('/admin', (req, res) => {
  const users = getLocalUsers();

  const userRows = users.map(u => `
    <tr class="employee-row border-b text-xs hover:bg-slate-50 transition" data-id="${u.id.toUpperCase()}">
      <td class="p-3 font-mono font-bold text-slate-700">${u.id}</td>
      <td class="p-3 font-medium text-slate-800">${u.fullName}</td>
      <td class="p-3 text-slate-600">${u.department}</td>
      <td class="p-3 text-slate-600">${u.role}</td>
      <td class="p-3">
        <button type="button" 
          onclick="editUser('${u.id}', '${encodeURIComponent(u.fullName)}', '${encodeURIComponent(u.department)}', '${encodeURIComponent(u.role)}', '${u.issuedDate || ''}', '${u.email || ''}', '${u.phone || ''}', '${encodeURIComponent(u.photoUrl || '')}')" 
          class="bg-slate-100 hover:bg-emerald-50 text-emerald-700 border border-emerald-300 px-3 py-1 rounded-md font-semibold transition">
          Edit
        </button>
      </td>
    </tr>
  `).join('');

  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>BHMC Digital ID Portal</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-900 min-h-screen p-4 sm:p-8 font-sans relative overflow-x-hidden">
  <!-- Fixed Fullscreen Background with 55% Opacity -->
  <div class="fixed inset-0 z-0 pointer-events-none">
    <img 
      src="/images/BACKGROUND.jpg" 
      alt="Background" 
      class="w-full h-full object-cover opacity-55"
      onerror="this.src='/images/BACKGROUND.jpg'"
    >
    <div class="absolute inset-0 bg-slate-900/30"></div>
  </div>

  <!-- Main Content Layer -->
  <div class="relative z-10 max-w-4xl mx-auto space-y-8">
    <header class="bg-emerald-700 text-white p-5 rounded-2xl shadow flex justify-between items-center gap-4">
  <div class="flex items-center gap-3 sm:gap-4">
    <!-- Clean, properly proportioned transparent logo -->
    <img 
      src="/images/BHMC LOGO FINAL.png" 
      alt="BHMC Logo" 
      class="w-14 h-14 sm:w-16 sm:h-16 object-contain drop-shadow shrink-0"
      onerror="if (this.src.includes('/images/logo.png')) { this.src = '/logo.png'; }"
    >
    <div>
      <h1 class="text-xl sm:text-2xl font-bold leading-tight">BHMC Digital ID Portal</h1>
      <p class="text-emerald-100 text-xs sm:text-sm">Employee Enrollment & Instant QR</p>
    </div>
  </div>
  <span class="bg-emerald-800 text-xs px-3 py-1 rounded-full uppercase tracking-wider font-semibold shrink-0">Staff Only</span>
</header>

    <!-- FORM -->
    <form id="adminForm" action="/admin/add" method="POST" class="bg-white p-6 rounded-2xl shadow space-y-4 border border-slate-200">
      <div class="flex justify-between items-center border-b pb-2">
        <h2 id="formTitle" class="text-base font-bold text-slate-800">Enroll New Employee</h2>
        <button type="button" id="resetBtn" onclick="resetForm()" class="text-xs text-slate-500 hover:text-slate-800 hidden font-semibold">
          ✕ Cancel Edit / New Entry
        </button>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label class="block text-xs font-semibold text-slate-600 mb-1">Employee ID *</label>
          <input type="text" id="field_id" name="id" placeholder="ADM-768" required class="w-full border rounded-lg p-2.5 text-sm uppercase outline-none focus:ring-2 focus:ring-emerald-500">
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-600 mb-1">Full Name *</label>
          <input type="text" id="field_name" name="fullName" placeholder="MARIA CLARA SANTOS" required class="w-full border rounded-lg p-2.5 text-sm uppercase outline-none focus:ring-2 focus:ring-emerald-500">
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-600 mb-1">Department *</label>
          <input type="text" id="field_dept" name="department" placeholder="NURSING" required class="w-full border rounded-lg p-2.5 text-sm uppercase outline-none focus:ring-2 focus:ring-emerald-500">
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-600 mb-1">Role / Position *</label>
          <input type="text" id="field_role" name="role" placeholder="HEAD NURSE" required class="w-full border rounded-lg p-2.5 text-sm uppercase outline-none focus:ring-2 focus:ring-emerald-500">
        </div>
        <div class="sm:col-span-2">
          <label class="block text-xs font-semibold text-slate-600 mb-1">Date of Employment *</label>
          <input type="date" id="field_issued" name="issuedDate" required class="w-full border rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500">
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-600 mb-1">Email</label>
          <input type="email" id="field_email" name="email" placeholder="nurse@bhmc.com" class="w-full border rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500">
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-600 mb-1">Phone</label>
          <input type="text" id="field_phone" name="phone" placeholder="+63 912 345 6789" class="w-full border rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500">
        </div>

        <!-- Photo Upload Field -->
        <div class="sm:col-span-2">
          <label class="block text-xs font-semibold text-slate-600 mb-1">Photo (Upload JPG/PNG)</label>
          <div class="flex items-center gap-4 border border-dashed border-slate-300 rounded-lg p-3">
            <input type="file" id="photoFileInput" accept="image/*" class="text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100">
            <img id="photoPreview" class="w-12 h-12 rounded-full object-cover border hidden" alt="Preview">
          </div>
          <input type="hidden" name="photoUrl" id="photoBase64">
        </div>

        <div class="sm:col-span-2">
          <label class="block text-xs font-semibold text-slate-600 mb-1">Admin Security PIN / Password *</label>
          <input type="password" id="field_pin" name="pin" placeholder="Enter portal password" required class="w-full border rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500">
        </div>
      </div>

      <button type="submit" id="submitBtn" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-lg shadow transition">
        Submit
      </button>
    </form>

    <!-- EMPLOYEE ROSTER TABLE WITH SEARCH & PASSWORD-PROTECTED EXPORT -->
    <div class="bg-white rounded-2xl shadow border border-slate-200 overflow-hidden">
      <div class="p-4 border-b bg-slate-50 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
        <div>
          <h3 class="font-bold text-slate-700 text-sm">Active Roster (${users.length} Records)</h3>
          <p class="text-xs text-slate-500">Search by ID, edit records, or export to spreadsheet</p>
        </div>

        <!-- Actions: Search & Protected Export -->
        <div class="flex flex-wrap items-center gap-2">
          <div class="relative">
            <input 
              type="text" 
              id="searchIdInput" 
              onkeyup="filterById()" 
              placeholder="Search ID..." 
              class="border rounded-lg pl-8 pr-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-emerald-500 uppercase w-36 sm:w-44"
            >
            <span class="absolute left-2.5 top-2 text-slate-400 text-xs">🔍</span>
          </div>
          <button 
            type="button" 
            onclick="clearSearch()" 
            class="text-xs bg-slate-200 hover:bg-slate-300 text-slate-700 px-2.5 py-1.5 rounded-lg font-medium transition"
          >
            Clear
          </button>
          <button 
            type="button" 
            onclick="exportToExcelSecure()" 
            class="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 shadow transition"
          >
            🔒 Export CSV
          </button>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-slate-100 text-slate-600 text-[11px] uppercase tracking-wider">
              <th class="p-3">ID</th>
              <th class="p-3">Full Name</th>
              <th class="p-3">Department</th>
              <th class="p-3">Role</th>
              <th class="p-3">Action</th>
            </tr>
          </thead>
          <tbody id="rosterTableBody">
            ${userRows.length > 0 ? userRows : '<tr><td colspan="5" class="p-6 text-center text-xs text-slate-400">No records found.</td></tr>'}
            <tr id="noMatchRow" class="hidden">
              <td colspan="5" class="p-6 text-center text-xs text-slate-400 font-medium">No employee found matching that ID.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <script>
    // Embedded users array for CSV export
    const rosterData = ${JSON.stringify(users.map(u => ({
      id: u.id,
      fullName: u.fullName,
      department: u.department,
      role: u.role,
      status: u.status || 'ACTIVE',
      issuedDate: u.issuedDate || '',
      email: u.email || '',
      phone: u.phone || '',
      verifyUrl: 'https://bhmc-digital-id.vercel.app/verify/' + u.id
    })))};

    // Password-Protected Export to CSV
    function exportToExcelSecure() {
      if (!rosterData || rosterData.length === 0) {
        alert('No employee data available to export.');
        return;
      }

      // Prompt for security password
      const enteredPin = prompt('🔒 Admin Security PIN / Password required to export employee records:');
      
      if (!enteredPin) return; // User clicked Cancel or entered nothing

      // Check entered PIN against server configured PIN
      const expectedPin = '${process.env.ADMIN_PASSWORD || 'bhmcdigitalid2026'}';
      if (enteredPin !== expectedPin) {
        alert('❌ Unauthorized: Incorrect Admin Security Password.');
        return;
      }

      const headers = ['Employee ID', 'Full Name', 'Department', 'Role', 'Status', 'Date of Employment', 'Email', 'Phone', 'Digital ID Link'];
      const csvRows = [headers.join(',')];

      rosterData.forEach(emp => {
        const row = [
          emp.id,
          emp.fullName,
          emp.department,
          emp.role,
          emp.status,
          emp.issuedDate,
          emp.email,
          emp.phone,
          emp.verifyUrl
        ].map(field => '"' + (field || '').toString().replace(/"/g, '""') + '"');
        csvRows.push(row.join(','));
      });

      const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + encodeURIComponent(csvRows.join('\\r\\n'));
      const link = document.createElement('a');
      link.setAttribute('href', csvContent);
      link.setAttribute('download', 'BHMC_Employee_Roster_' + new Date().toISOString().slice(0, 10) + '.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    // Live Search by ID Filter
    function filterById() {
      const filter = document.getElementById('searchIdInput').value.trim().toUpperCase();
      const rows = document.querySelectorAll('.employee-row');
      let matches = 0;

      rows.forEach(row => {
        const id = row.getAttribute('data-id') || '';
        if (id.includes(filter)) {
          row.style.display = '';
          matches++;
        } else {
          row.style.display = 'none';
        }
      });

      const noMatch = document.getElementById('noMatchRow');
      if (matches === 0 && rows.length > 0) {
        noMatch.classList.remove('hidden');
      } else {
        noMatch.classList.add('hidden');
      }
    }

    function clearSearch() {
      document.getElementById('searchIdInput').value = '';
      filterById();
    }

    function editUser(id, name, dept, role, issued, email, phone, photo) {
      document.getElementById('field_id').value = id;
      document.getElementById('field_name').value = decodeURIComponent(name);
      document.getElementById('field_dept').value = decodeURIComponent(dept);
      document.getElementById('field_role').value = decodeURIComponent(role);
      document.getElementById('field_issued').value = issued;
      document.getElementById('field_email').value = email;
      document.getElementById('field_phone').value = phone;

      const decodedPhoto = decodeURIComponent(photo);
      if (decodedPhoto) {
        document.getElementById('photoBase64').value = decodedPhoto;
        document.getElementById('photoPreview').src = decodedPhoto;
        document.getElementById('photoPreview').classList.remove('hidden');
      }

      document.getElementById('formTitle').innerText = 'Editing Record: ' + id;
      document.getElementById('submitBtn').innerText = 'Update & Save Changes';
      document.getElementById('resetBtn').classList.remove('hidden');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function resetForm() {
      document.getElementById('adminForm').reset();
      document.getElementById('photoBase64').value = '';
      document.getElementById('photoPreview').classList.add('hidden');
      document.getElementById('formTitle').innerText = 'Enroll New Employee';
      document.getElementById('submitBtn').innerText = 'Submit';
      document.getElementById('resetBtn').classList.add('hidden');
    }

    // Client-side image compression
    const fileInput = document.getElementById('photoFileInput');
    const preview = document.getElementById('photoPreview');
    const base64Input = document.getElementById('photoBase64');

    fileInput.addEventListener('change', function(e) {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = function(event) {
        const img = new Image();
        img.onload = function() {
          const canvas = document.createElement('canvas');
          const maxDim = 300;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxDim) {
              height *= maxDim / width;
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width *= maxDim / height;
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          const compressed = canvas.toDataURL('image/jpeg', 0.75);
          base64Input.value = compressed;
          preview.src = compressed;
          preview.classList.remove('hidden');
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    });
  </script>
</body>
</html>`);
});

// Admin submit route: updates users.json directly on GitHub
app.post('/admin/add', async (req, res) => {
  const { id, fullName, role, department, issuedDate, email, phone, photoUrl, pin } = req.body;

  const validPin = process.env.ADMIN_PASSWORD || 'bhmcdigitalid2026';
  if (pin !== validPin) {
    return res.status(401).send(`
      <div style="font-family:sans-serif; text-align:center; padding: 50px;">
        <h2 style="color:#dc2626;">Incorrect Admin Security Password</h2>
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

    // Retain existing photo if none was uploaded during edit
    const existingIndex = users.findIndex(u => u.id.toUpperCase() === cleanId);
    let resolvedPhoto = `/images/${cleanId}.png`;
    if (photoUrl && photoUrl.trim() !== '') {
      resolvedPhoto = photoUrl;
    } else if (existingIndex >= 0 && users[existingIndex].photoUrl) {
      resolvedPhoto = users[existingIndex].photoUrl;
    }

    const newUser = {
      id: cleanId,
      fullName: fullName.trim().toUpperCase(),
      role: role.trim().toUpperCase(),
      department: department.trim().toUpperCase(),
      status: 'ACTIVE',
      issuedDate: issuedDate || '',
      photoUrl: resolvedPhoto,
      email: email ? email.trim() : '',
      phone: phone ? phone.trim() : ''
    };

    if (existingIndex >= 0) {
      users[existingIndex] = newUser;
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
        message: `Update employee ${cleanId}`,
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
<body class="bg-slate-100 min-h-screen p-6 sm:p-12 flex items-center justify-center font-sans">
  <div class="bg-white p-8 rounded-2xl shadow max-w-md w-full text-center space-y-4 border border-emerald-200">
    <div class="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-xl font-bold">✓</div>
    <h2 class="text-xl font-bold text-slate-800">Employee Saved Successfully!</h2>
    <p class="text-xs text-slate-500">Record saved to database. Verification goes live in ~20 seconds.</p>

    <img src="${qrImage}" alt="QR Code" class="w-48 h-48 mx-auto border p-2 rounded-xl shadow-inner">
    <p class="font-mono text-base font-bold text-slate-700">${cleanId}</p>

    <!-- Copyable URL Box -->
    <div class="bg-slate-50 border rounded-xl p-3 text-left space-y-1">
      <label class="block text-[11px] font-semibold text-slate-500 uppercase">Verification Link</label>
      <div class="flex items-center gap-2">
        <input id="verifyUrlInput" type="text" readonly value="${targetUrl}" class="w-full bg-transparent text-xs font-mono text-slate-700 outline-none select-all">
        <button type="button" onclick="copyLink()" id="copyBtn" class="bg-slate-800 hover:bg-black text-white text-xs px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition">
          Copy Link
        </button>
      </div>
    </div>

    <div class="space-y-2 pt-2">
      <a href="${qrImage}" download="${cleanId}-QR.png" class="block w-full bg-emerald-700 hover:bg-emerald-800 text-white py-2.5 rounded-lg text-sm font-semibold shadow">Download QR PNG</a>
      <a href="/admin" class="block w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-lg text-sm font-medium">← Back to Portal</a>
    </div>
  </div>

  <script>
    function copyLink() {
      const input = document.getElementById('verifyUrlInput');
      input.select();
      navigator.clipboard.writeText(input.value);
      const btn = document.getElementById('copyBtn');
      btn.innerText = 'Copied!';
      btn.classList.replace('bg-slate-800', 'bg-emerald-600');
      setTimeout(() => {
        btn.innerText = 'Copy Link';
        btn.classList.replace('bg-emerald-600', 'bg-slate-800');
      }, 2000);
    }
  </script>
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
