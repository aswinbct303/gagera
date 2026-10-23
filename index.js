require('dotenv').config();
const express = require('express');
const path = require('path');
const app = express();
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const PORT = process.env.PORT || 8000;
const code = require('./pair');
const webSettings = require('./webSettings');
const { startSessionCleaner } = require('./session_cleaner');

require('events').EventEmitter.defaultMaxListeners = 500;
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/assets', express.static(path.join(process.cwd(), 'public', 'assets')));
app.use('/code', code);
app.use('/settings', webSettings);
app.get('/pair', (req, res) => res.sendFile(path.join(process.cwd(), 'public', 'index.html')));
app.get('/', (req, res) => res.sendFile(path.join(process.cwd(), 'public', 'index.html')));

if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Web settings: http://localhost:${PORT}/settings`);
    startSessionCleaner();
  });
}
module.exports = app;
