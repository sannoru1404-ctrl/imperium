// Extracts the game's inline <script> from src/index.html so Node tests can eval it.
const fs = require('fs');
const path = require('path');
module.exports = () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'src', 'index.html'), 'utf8');
  const m = html.match(/<script>([\s\S]*?)<\/script>/);
  if (!m) throw new Error('game script not found');
  return m[1];
};
