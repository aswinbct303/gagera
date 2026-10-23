// settings.js - Gagera Web Settings Management
(() => {
  const login = document.querySelector('#login-form');
  const dashboard = document.querySelector('#dashboard');
  const loginBox = document.querySelector('#login');
  const grid = document.querySelector('#settings-grid');
  const loginError = document.querySelector('#login-error');
  const saveResult = document.querySelector('#save-result');
  const saveBtn = document.querySelector('#save-btn');
  const saveStatus = document.querySelector('#save-status');
  const togglePwdBtn = document.querySelector('#toggle-pwd-btn');
  const pwdInput = document.querySelector('#password');
  const eyeIcon = document.querySelector('#eye-icon');
  const displayNumber = document.querySelector('#display-number');
  const avatarInitial = document.querySelector('#avatar-initial');
  const categoryTabs = document.querySelectorAll('.cat-tab');

  let session = localStorage.getItem('gagera_session') || '';
  let activeUser = localStorage.getItem('gagera_user') || '';

  // Password visibility toggle
  if (togglePwdBtn && pwdInput) {
    togglePwdBtn.addEventListener('click', () => {
      const isPassword = pwdInput.type === 'password';
      pwdInput.type = isPassword ? 'text' : 'password';
      if (eyeIcon) {
        eyeIcon.innerHTML = isPassword
          ? `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>`
          : `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>`;
      }
    });
  }

  // Setting specifications
  const fieldDefs = [
    // Status & Stories
    { key: 'AUTO_STATUS_VIEW', label: 'Auto-View Statuses', desc: 'Automatically view incoming WhatsApp status updates as soon as they appear.', type: 'boolean', category: 'status' },
    { key: 'STATUS_REACTION', label: 'Status Reaction', desc: 'Send an automatic emoji reaction when viewing a status.', type: 'boolean', category: 'status' },
    { key: 'STATUS_REACTION_EMOJI', label: 'Reaction Emoji', desc: 'The emoji to send for automated status reactions (e.g. 💚, 🔥, ❤️).', type: 'text', category: 'status' },
    { key: 'STATUS_REPLY', label: 'Status Reply', desc: 'Send an automated text message reply to new status updates.', type: 'boolean', category: 'status' },
    { key: 'STATUS_REPLY_MSG', label: 'Status Reply Message', desc: 'Custom message text sent for status replies.', type: 'text', category: 'status' },
    { key: 'SAVE_STATUS', label: 'Auto-Save Status Media', desc: 'Save status videos and images automatically to local storage.', type: 'boolean', category: 'status' },

    // Privacy & Calls
    { key: 'READ_MESSAGES', label: 'Read Receipts (Blue Ticks)', desc: 'Automatically mark incoming messages as read upon receipt.', type: 'boolean', category: 'privacy' },
    { key: 'REJECT_CALL', label: 'Auto-Reject Incoming Calls', desc: 'Automatically decline voice and video calls to protect the bot session.', type: 'boolean', category: 'privacy' },
    { key: 'REJECT_CALL_MSG', label: 'Call Rejection Message', desc: 'Notice sent to contacts when their call is declined.', type: 'text', category: 'privacy' },
    { key: 'PM_BLOCK', label: 'Block Direct Messages', desc: 'Automatically block unverified direct messages in personal chats.', type: 'boolean', category: 'privacy' },

    // Bot Persona & Behavior
    { key: 'WORK_TYPE', label: 'Work Mode', desc: 'Specify who can execute bot commands (public: everyone, private: owner only).', type: 'select', options: ['public', 'private'], category: 'bot' },
    { key: 'LANGUAGE', label: 'Bot Language', desc: 'Language pack for command messages and help output.', type: 'text', category: 'bot' },
    { key: 'MENU_TYPE', label: 'Menu Display Type', desc: 'Visual media style used for the main .menu command.', type: 'select', options: ['video', 'image', 'text'], category: 'bot' },
    { key: 'BOT_INFO', label: 'Bot Identity & Info', desc: 'Format: BotName;Author;MediaURL (e.g. Gagera;Aswin;https://...).', type: 'text', category: 'bot' },
    { key: 'PING', label: 'Ping Response Label', desc: 'Custom label for bot speed / latency tests.', type: 'text', category: 'bot' },
    { key: 'SUDO', label: 'Admin / Sudo Numbers', desc: 'Authorized phone numbers granted administrator permissions (comma separated).', type: 'text', category: 'bot' },
    { key: 'HANDLERS', label: 'Command Handlers', desc: 'Trigger prefixes for commands (e.g. "." or "false" for prefixless).', type: 'text', category: 'bot' },
    { key: 'STICKER_DATA', label: 'Sticker Pack Metadata', desc: 'Default pack name and author for converted stickers (Pack;Author).', type: 'text', category: 'bot' },
    { key: 'AUDIO_DATA', label: 'Audio Metadata', desc: 'Title and artist metadata applied to converted voice notes (Title;Artist).', type: 'text', category: 'bot' }
  ];

  function showMessage(el, text, isError = false) {
    if (!el) return;
    el.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          ${isError 
            ? '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>' 
            : '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>'}
        </svg>
        <span>${text}</span>
      </div>
    `;
    el.className = isError ? 'result error' : 'result';
    el.hidden = false;
  }

  function render(settings) {
    if (!grid) return;

    grid.innerHTML = fieldDefs.map(field => {
      const { key, label, desc, type, options, category } = field;
      const rawVal = settings[key];
      const boolVal = rawVal === true || rawVal === 'true';

      let inputHtml = '';
      if (type === 'boolean') {
        inputHtml = `
          <div class="switch-wrapper ${boolVal ? 'active' : ''}" data-switch-key="${key}">
            <label class="switch" for="setting-${key}">
              <input type="checkbox" id="setting-${key}" data-key="${key}" ${boolVal ? 'checked' : ''}>
              <span class="slider"></span>
            </label>
            <span class="switch-label-status" id="label-${key}">${boolVal ? 'Enabled' : 'Disabled'}</span>
          </div>
        `;
      } else if (type === 'select') {
        inputHtml = `
          <div class="setting-input-wrapper">
            <select id="setting-${key}" data-key="${key}">
              ${(options || []).map(opt => `<option value="${opt}" ${String(rawVal) === opt ? 'selected' : ''}>${opt.charAt(0).toUpperCase() + opt.slice(1)}</option>`).join('')}
            </select>
          </div>
        `;
      } else {
        const displayVal = rawVal !== undefined && rawVal !== null ? String(rawVal) : '';
        inputHtml = `
          <div class="setting-input-wrapper">
            <input type="text" id="setting-${key}" data-key="${key}" value="${displayVal.replace(/"/g, '&quot;')}" placeholder="Enter ${label.toLowerCase()}">
          </div>
        `;
      }

      return `
        <div class="settings-card" data-category="${category}">
          <div class="setting-header">
            <div class="setting-title-group">
              <div class="setting-title">${label}</div>
              <div class="setting-desc">${desc}</div>
            </div>
          </div>
          ${inputHtml}
        </div>
      `;
    }).join('');

    // Attach switch toggle listeners
    document.querySelectorAll('.switch-wrapper').forEach(wrapper => {
      const checkbox = wrapper.querySelector('input[type="checkbox"]');
      const label = wrapper.querySelector('.switch-label-status');
      if (!checkbox || !label) return;

      checkbox.addEventListener('change', () => {
        const isChecked = checkbox.checked;
        if (navigator.vibrate) navigator.vibrate(20);
        label.textContent = isChecked ? 'Enabled' : 'Disabled';
        if (isChecked) {
          wrapper.classList.add('active');
        } else {
          wrapper.classList.remove('active');
        }
        if (saveStatus) {
          saveStatus.innerHTML = '<span style="color:var(--brand-light)">● Unsaved changes pending</span>';
        }
      });
    });

    // Detect changes on text and select inputs
    document.querySelectorAll('#settings-form input[type="text"], #settings-form select').forEach(input => {
      input.addEventListener('input', () => {
        if (saveStatus) {
          saveStatus.innerHTML = '<span style="color:var(--brand-light)">● Unsaved changes pending</span>';
        }
      });
    });
  }

  // Category Tab Filtering
  categoryTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      categoryTabs.forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      const cat = tab.dataset.category;

      document.querySelectorAll('.settings-card').forEach(card => {
        if (cat === 'all' || card.dataset.category === cat) {
          card.style.display = 'flex';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });

  // Login submission
  login?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (loginError) loginError.hidden = true;
    const number = document.querySelector('#number').value.replace(/\D/g, '');
    const password = document.querySelector('#password').value.trim();

    const loginBtn = document.querySelector('#login-btn');
    if (loginBtn) {
      loginBtn.disabled = true;
      loginBtn.innerHTML = `<span>Authenticating…</span>`;
    }

    try {
      const r = await fetch('/settings/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ number, password })
      });
      const data = await r.json().catch(() => ({}));

      if (!r.ok) {
        throw new Error(data.error || 'Authentication failed. Please verify your number and web password.');
      }

      session = data.sessionId;
      activeUser = data.userNumber || number;
      localStorage.setItem('gagera_session', session);
      localStorage.setItem('gagera_user', activeUser);

      // Fetch user settings
      await loadSettings();

    } catch (err) {
      showMessage(loginError, err.message, true);
    } finally {
      if (loginBtn) {
        loginBtn.disabled = false;
        loginBtn.innerHTML = `<span>Authenticate Session</span><span class="btn-arrow" aria-hidden="true">→</span>`;
      }
    }
  });

  async function loadSettings() {
    try {
      const s = await fetch('/settings/api/settings', {
        headers: { 'x-session-id': session }
      });
      const body = await s.json().catch(() => ({}));

      if (!s.ok) {
        throw new Error(body.error || 'Could not load settings');
      }

      if (displayNumber) {
        displayNumber.textContent = `+${activeUser}`;
      }
      if (avatarInitial) {
        avatarInitial.textContent = activeUser ? activeUser.charAt(0) : '#';
      }

      render(body.settings || {});
      loginBox.hidden = true;
      dashboard.hidden = false;

      if (saveStatus) {
        saveStatus.textContent = 'All settings synchronized with active session.';
      }
    } catch (err) {
      localStorage.removeItem('gagera_session');
      localStorage.removeItem('gagera_user');
      session = '';
      activeUser = '';
      loginBox.hidden = false;
      dashboard.hidden = true;
      if (loginError) showMessage(loginError, 'Session expired or invalid. Please sign in again.', true);
    }
  }

  // Settings Save
  document.querySelector('#settings-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (saveResult) saveResult.hidden = true;

    const updates = {};
    document.querySelectorAll('[data-key]').forEach(el => {
      if (el.type === 'checkbox') {
        updates[el.dataset.key] = el.checked;
      } else {
        updates[el.dataset.key] = el.value.trim();
      }
    });

    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.innerHTML = `<span>Saving changes…</span>`;
    }

    try {
      const r = await fetch('/settings/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': session
        },
        body: JSON.stringify(updates)
      });
      const data = await r.json().catch(() => ({}));

      if (!r.ok) throw new Error(data.error || 'Failed to save settings');

      showMessage(saveResult, 'Preferences saved! The bot session has been updated with the new configuration.');
      if (saveStatus) {
        saveStatus.innerHTML = '<span style="color:var(--brand-light)">✓ All changes synchronized.</span>';
      }
    } catch (err) {
      showMessage(saveResult, err.message, true);
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.innerHTML = `<span>Save Changes</span><span class="btn-arrow" aria-hidden="true">→</span>`;
      }
    }
  });

  // Logout
  document.querySelector('#logout')?.addEventListener('click', async () => {
    try {
      await fetch('/settings/api/logout', {
        method: 'POST',
        headers: { 'x-session-id': session }
      });
    } catch (_) { }
    localStorage.removeItem('gagera_session');
    localStorage.removeItem('gagera_user');
    location.reload();
  });

  // Auto-resume session if stored
  if (session && activeUser) {
    loadSettings();
  }
})();
