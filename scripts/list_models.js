const fs = require('fs');
(async () => {
  try {
    const env = fs.readFileSync('.env.local', 'utf-8');
    const key = env.split('\n').find(l => l.startsWith('GEMINI_API_KEY')).split('=')[1];
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('error', err);
  }
})();
