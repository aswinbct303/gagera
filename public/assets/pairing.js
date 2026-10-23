// pairing.js - Gagera WhatsApp Pairing Client
(() => {
  const form = document.querySelector('#pair-form');
  const input = document.querySelector('#phone');
  const button = document.querySelector('#pair-button');
  const result = document.querySelector('#result');

  if (!form || !input || !button || !result) return;

  let countdownInterval = null;

  function startCountdown(seconds) {
    if (countdownInterval) clearInterval(countdownInterval);
    const countdownEl = document.querySelector('#code-countdown');
    if (!countdownEl) return;

    let remaining = seconds;
    countdownInterval = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearInterval(countdownInterval);
        countdownEl.textContent = 'Code may have expired. Generate a new one if not linked.';
        countdownEl.style.color = 'var(--danger)';
      } else {
        const mins = Math.floor(remaining / 60);
        const secs = remaining % 60;
        countdownEl.textContent = `Valid for ~${mins}:${secs < 10 ? '0' : ''}${secs}`;
      }
    }, 1000);
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const rawNumber = input.value.trim();
    const number = rawNumber.replace(/\D/g, '');

    result.hidden = true;
    result.className = 'result';
    result.innerHTML = '';
    if (countdownInterval) clearInterval(countdownInterval);

    if (number.length < 7) {
      result.className = 'result error';
      result.innerHTML = `
        <div class="result-header">
          <span class="result-badge" style="color:var(--danger)">Invalid Phone Number</span>
        </div>
        <p>Please enter a complete international phone number including country code (e.g. 919876543210).</p>
      `;
      result.hidden = false;
      input.focus();
      return;
    }

    // Set loading state
    button.disabled = true;
    const originalContent = button.innerHTML;
    button.innerHTML = `
      <svg class="spinner" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="animation: spin 0.8s linear infinite;">
        <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
        <path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"></path>
      </svg>
      <span>Generating secure pairing code…</span>
    `;

    try {
      const response = await fetch(`/code?number=${encodeURIComponent(number)}`, {
        headers: { Accept: 'application/json' }
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.code) {
        if (data.status === 'already_connected') {
          result.className = 'result';
          result.innerHTML = `
            <div class="result-header">
              <span class="result-badge" style="color:var(--brand-light)">Session Active</span>
            </div>
            <p style="margin-bottom: 12px;">This number is already connected! You can manage your bot preferences directly in settings.</p>
            <a href="/settings" class="button secondary compact" style="display:inline-flex;width:auto;">Go to Settings →</a>
          `;
          result.hidden = false;
          return;
        }
        throw new Error(data.error || data.message || 'Unable to generate pairing code. Ensure the number is correct.');
      }

      const rawCode = String(data.code).trim();

      result.innerHTML = `
        <div class="result-header">
          <span class="result-badge">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
            Pairing Code Ready
          </span>
          <span id="code-countdown" style="font-size:11px;color:var(--text-muted);font-family:var(--font-mono);">Valid for ~3:00</span>
        </div>
        <div class="code-container">
          <code id="pairing-code">${rawCode}</code>
          <button type="button" class="copy-btn" id="copy-button" aria-label="Copy pairing code">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            <span>Copy Code</span>
          </button>
        </div>
        <p class="hint" style="margin-bottom:0;">
          Open <strong>WhatsApp</strong> on your phone → tap <strong>Linked devices</strong> → <strong>Link with phone number</strong> → enter the code above.
        </p>
      `;
      result.hidden = false;

      // Copy to clipboard handling
      async function doCopy() {
        try {
          await navigator.clipboard.writeText(rawCode);
          if (navigator.vibrate) navigator.vibrate(35);
          if (copyBtn) {
            copyBtn.classList.add('copied');
            copyBtn.innerHTML = `
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
              <span>Copied!</span>
            `;
            setTimeout(() => {
              copyBtn.classList.remove('copied');
              copyBtn.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                <span>Copy Code</span>
              `;
            }, 3000);
          }
        } catch (e) {
          // Fallback for older mobile browsers
          const textArea = document.createElement('textarea');
          textArea.value = rawCode;
          textArea.style.position = 'fixed';
          textArea.style.opacity = '0';
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
          if (copyBtn) copyBtn.textContent = 'Copied!';
        }
      }

      const copyBtn = document.querySelector('#copy-button');
      if (copyBtn) copyBtn.addEventListener('click', doCopy);
      const codeEl = document.querySelector('#pairing-code');
      if (codeEl) {
        codeEl.style.cursor = 'pointer';
        codeEl.title = 'Click to copy';
        codeEl.addEventListener('click', doCopy);
      }

      startCountdown(180);

    } catch (error) {
      result.className = 'result error';
      result.innerHTML = `
        <div class="result-header">
          <span class="result-badge" style="color:var(--danger)">Pairing Error</span>
        </div>
        <p>${error.message || 'Something went wrong while requesting pairing code.'}</p>
      `;
      result.hidden = false;
    } finally {
      button.disabled = false;
      button.innerHTML = originalContent;
    }
  });
})();
