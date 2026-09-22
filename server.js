const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// Verification endpoint scanned by phones
app.get('/verify/:id', (req, res) => {
  const users = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'users.json'), 'utf-8'));
  const user = users.find(u => u.id.toLowerCase() === req.params.id.toLowerCase());

  if (!user) {
    return res.status(404).render('not-found', { id: req.params.id });
  }

  const scanTime = new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' });
  res.render('profile', { user, scanTime });
});

app.listen(PORT, () => {
  console.log(`Verification server running at http://localhost:${PORT}`);
});
module.exports = app;