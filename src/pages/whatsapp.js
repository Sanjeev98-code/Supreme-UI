// ── WhatsApp Management Page ───────────────────────────────────────────────────
registerPage('whatsapp', {
  _status: 'loading', // loading | disconnected | qr | initializing | ready
  _qrDataUrl: null,
  _consoleLogs: [],

  render() {
    const statusBadge = this._getStatusBadge();

    return `
      <div class="page-header">
        <div class="page-header-left">
          <h1 class="page-title">Communication Settings</h1>
          <p class="page-subtitle">Connect, manage, and send reports via WhatsApp</p>
        </div>
        ${statusBadge}
      </div>
      <div class="page-body">
        ${this._renderStatusPanels()}
        ${this._renderSendPanel()}
        ${this._renderConsole()}
      </div>
    `;
  },

  _getStatusBadge() {
    switch(this._status) {
      case 'ready':
        return '<span class="badge badge-green" style="font-size:13px;padding:0.4rem 1rem">● Connected</span>';
      case 'qr':
        return '<span class="badge badge-yellow" style="font-size:13px;padding:0.4rem 1rem">◌ Scan QR Code</span>';
      case 'initializing':
        return '<span class="badge badge-yellow" style="font-size:13px;padding:0.4rem 1rem">⟳ Connecting...</span>';
      default:
        return '<span class="badge badge-red" style="font-size:13px;padding:0.4rem 1rem">● Disconnected</span>';
    }
  },

  _renderStatusPanels() {
    let emailPanel = `
      <div class="table-container" style="padding:1.5rem; margin-bottom: 1.5rem">
        <div style="display:flex;align-items:center;justify-content:space-between">
          <div style="display:flex;align-items:center;gap:1rem">
            <div style="width:48px;height:48px;border-radius:50%;background:var(--success);display:flex;align-items:center;justify-content:center;font-size:24px">✉</div>
            <div>
              <h3 style="color:var(--text-primary);margin:0">Email Connected</h3>
              <p style="color:var(--text-muted);margin:0;font-size:13px">Sending as automations@supremeparadise.in</p>
            </div>
          </div>
          <span class="badge badge-green">Available</span>
        </div>
      </div>
    `;

    let waPanel = '';

    if (this._status === 'loading') {
      waPanel = `
        <div class="table-container" style="text-align:center;padding:3rem">
          <p style="color:var(--text-muted)">Checking WhatsApp connection status...</p>
        </div>`;
    } else if (this._status === 'disconnected') {
      waPanel = `
        <div class="table-container" style="text-align:center;padding:3rem">
          <div style="font-size:48px;margin-bottom:1rem">📱</div>
          <h2 style="color:var(--text-primary);margin-bottom:0.5rem">WhatsApp Not Connected</h2>
          <p style="color:var(--text-muted);margin-bottom:1.5rem;max-width:400px;margin-left:auto;margin-right:auto">
            Connect your WhatsApp account to send reports directly to phone numbers and groups.
            You only need to scan the QR code once — it will remember your session.
          </p>
          <button class="btn btn-primary" id="btn-wa-connect" style="font-size:14px;padding:0.6rem 2rem">
            📲 Connect WhatsApp
          </button>
        </div>`;
    } else if (this._status === 'initializing') {
      waPanel = `
        <div class="table-container" style="text-align:center;padding:3rem">
          <div class="wa-spinner"></div>
          <p style="color:var(--text-muted);margin-top:1rem">Starting WhatsApp... This may take a moment.</p>
          <p style="color:var(--text-muted);font-size:12px">A browser instance is loading in the background.</p>
        </div>`;
    } else if (this._status === 'qr') {
      waPanel = `
        <div class="table-container" style="text-align:center;padding:2rem">
          <h3 style="color:var(--text-primary);margin-bottom:0.5rem">Scan QR Code with WhatsApp</h3>
          <p style="color:var(--text-muted);font-size:13px;margin-bottom:1.5rem">
            Open WhatsApp on your phone → Settings → Linked Devices → Link a Device
          </p>
          <div style="display:inline-block;background:#fff;padding:12px;border-radius:12px">
            ${this._qrDataUrl
              ? `<img src="${this._qrDataUrl}" alt="QR Code" style="width:250px;height:250px;display:block" />`
              : '<p style="color:#333;padding:2rem">Waiting for QR code...</p>'}
          </div>
          <p style="color:var(--text-muted);font-size:12px;margin-top:1rem">QR refreshes automatically if it expires.</p>
        </div>`;
    } else if (this._status === 'ready') {
      waPanel = `
        <div class="table-container" style="padding:1.5rem">
          <div style="display:flex;align-items:center;justify-content:space-between">
            <div style="display:flex;align-items:center;gap:1rem">
              <div style="width:48px;height:48px;border-radius:50%;background:var(--success);display:flex;align-items:center;justify-content:center;font-size:24px">✓</div>
              <div>
                <h3 style="color:var(--text-primary);margin:0">WhatsApp Connected</h3>
                <p style="color:var(--text-muted);margin:0;font-size:13px">Session is active. You can send reports to phone numbers and groups.</p>
              </div>
            </div>
            <button class="btn btn-sm" id="btn-wa-disconnect" style="color:var(--danger);border-color:var(--danger)">Disconnect</button>
          </div>
        </div>`;
    }

    return emailPanel + waPanel;
  },

  _renderSendPanel() {
    const distributions = getActiveSheet('Distribution');

    return `
      <div class="table-container" style="margin-top:1.5rem;padding:1.5rem">
        <h3 style="color:var(--text-primary);margin:0 0 1rem 0">Send Report Files</h3>

        <div class="form-row">
          <div class="form-group" style="flex:2">
            <label class="form-label">Distribution Mapping</label>
            <select class="form-select" id="wa-dist-select">
              <option value="">— Select a distribution —</option>
              ${distributions.map((d, i) => `<option value="${i}">${d.ReportName} → ${d.Recipients} (${d.Mode})</option>`).join('')}
            </select>
          </div>
          <div class="form-group" style="flex:1">
            <label class="form-label">File to Send</label>
            <div class="input-group">
              <input type="text" class="form-input" id="wa-file-path" placeholder="Select a file..." readonly />
              <button class="btn btn-secondary" id="btn-wa-browse">Browse</button>
            </div>
          </div>
        </div>

        <div style="display:flex;gap:0.5rem;margin-top:0.5rem">
          <button class="btn btn-primary" id="btn-wa-send" style="padding:0.5rem 1.5rem">
            📤 Send to All Recipients
          </button>
        </div>
      </div>`;
  },

  _renderConsole() {
    return `
      <div class="console-panel" style="margin-top:1.5rem">
        <div class="console-header">
          <div class="console-header-dots">
            <div class="console-dot console-dot-red"></div>
            <div class="console-dot console-dot-yellow"></div>
            <div class="console-dot console-dot-green"></div>
          </div>
          <span class="console-title">Communication Log</span>
        </div>
        <div class="console-body" id="wa-console" style="min-height:100px;max-height:250px">
          ${this._consoleLogs.length === 0
            ? '<span class="console-line-info">$ Waiting for activity...</span>'
            : this._consoleLogs.map(l => `<div class="console-line-${l.type}">${l.text}</div>`).join('')}
        </div>
      </div>`;
  },

  _log(text, type = 'info') {
    this._consoleLogs.push({ text, type: type || 'info' });
    const el = document.getElementById('wa-console');
    if (el) {
      el.innerHTML += `<div class="console-line-${type}">${text}</div>`;
      el.scrollTop = el.scrollHeight;
    }
  },

  async init() {
    const self = this;

    // Check current status on load
    if (this._status === 'loading') {
      const result = await window.api.waGetStatus();
      this._status = result.status;
      this.refresh();
      // Don't return here, we need to bind event listeners even if rendering changes
    }

    // Set up event listeners
    window.api.removeWaListeners();

    window.api.onWaQR((dataUrl) => {
      self._status = 'qr';
      self._qrDataUrl = dataUrl;
      self.refresh();
      self._log('QR code received — scan with your phone', 'info');
    });

    window.api.onWaReady(() => {
      self._status = 'ready';
      self._qrDataUrl = null;
      self.refresh();
      self._log('✓ WhatsApp connected successfully!', 'success');
      showToast('WhatsApp connected!', 'success');
    });

    window.api.onWaDisconnected((data) => {
      self._status = 'disconnected';
      self.refresh();
      self._log('✗ Disconnected: ' + (data.reason || 'Unknown reason'), 'stderr');
      showToast('WhatsApp disconnected. Please reconnect.', 'error');
    });

    window.api.onWaStatusUpdate((data) => {
      if (data.status === 'initializing') {
        self._status = 'initializing';
        self.refresh();
      }
      self._log(data.message || data.status, 'info');
    });

    // Connect button
    document.getElementById('btn-wa-connect')?.addEventListener('click', async () => {
      self._status = 'initializing';
      self.refresh();
      self._log('Initializing WhatsApp client...', 'info');
      const result = await window.api.waInit();
      if (result.error) {
        self._status = 'disconnected';
        self.refresh();
        self._log('✗ Failed to start: ' + result.error, 'stderr');
        showToast('Failed to connect WhatsApp: ' + result.error, 'error');
      }
    });

    // Disconnect button
    document.getElementById('btn-wa-disconnect')?.addEventListener('click', async () => {
      if (!confirm('Disconnect WhatsApp? You will need to scan the QR code again.')) return;
      self._log('Disconnecting WhatsApp...', 'info');
      await window.api.waLogout();
      self._status = 'disconnected';
      self.refresh();
      self._log('WhatsApp disconnected.', 'info');
      showToast('WhatsApp disconnected.', 'success');
    });

    // Browse file button
    document.getElementById('btn-wa-browse')?.addEventListener('click', async () => {
      const fp = await window.api.waPickFile();
      if (fp) document.getElementById('wa-file-path').value = fp;
    });

    // Send button
    document.getElementById('btn-wa-send')?.addEventListener('click', async () => {
      const distIdx = document.getElementById('wa-dist-select')?.value;
      const filePath = document.getElementById('wa-file-path')?.value;

      if (distIdx === '' || distIdx === undefined) {
        showToast('Please select a distribution mapping.', 'error');
        return;
      }
      if (!filePath) {
        showToast('Please select a file to send.', 'error');
        return;
      }

      const distributions = getActiveSheet('Distribution');
      const dist = distributions[parseInt(distIdx)];
      if (!dist) { showToast('Invalid distribution selected.', 'error'); return; }

      const recipients = (dist.Recipients || '').split(',').map(r => r.trim()).filter(Boolean);
      if (recipients.length === 0) {
        showToast('No recipients configured for this distribution.', 'error');
        return;
      }
      
      const mode = dist.Mode || 'WhatsApp'; // Email, WhatsApp, Both
      if ((mode === 'WhatsApp' || mode === 'Both') && self._status !== 'ready') {
        showToast('WhatsApp is not connected but required for this mapping.', 'error');
        return;
      }

      const employees = getActiveSheet('Employees');
      const delay = ms => new Promise(res => setTimeout(res, ms));
      const randomDelay = () => Math.floor(Math.random() * 7000) + 8000; // 8–15 seconds

      self._log(`Sending "${dist.ReportName}" to ${recipients.length} recipient(s) via ${mode}...`, 'info');

      for (const recipient of recipients) {
        // Check if recipient is an employee
        const emp = employees.find(e => e.EmployeeName === recipient);

        // 1. WhatsApp Transmission
        if (mode === 'WhatsApp' || mode === 'Both') {
          if (emp && emp.Mobile) {
            // Send to phone number
            self._log(`→ [WA] Sending to ${recipient} (${emp.Mobile})...`, 'info');
            const result = await window.api.waSendFile({
              target: emp.Mobile,
              targetType: 'phone',
              filePath: filePath
            });
            if (result.error) {
              self._log(`  ✗ [WA] Failed: ${result.error}`, 'stderr');
            } else {
              self._log(`  ✓ [WA] Sent`, 'success');
            }
          } else {
            // Treat as WhatsApp group name
            self._log(`→ [WA] Sending to group "${recipient}"...`, 'info');
            const result = await window.api.waSendFile({
              target: recipient,
              targetType: 'group',
              filePath: filePath
            });
            if (result.error) {
              self._log(`  ✗ [WA] Failed: ${result.error}`, 'stderr');
            } else {
              self._log(`  ✓ [WA] Sent`, 'success');
            }
          }
          const waitMs = randomDelay();
          self._log(`  ⏱ Waiting ${(waitMs/1000).toFixed(1)}s before next send...`, 'info');
          await delay(waitMs);
        }

        // 2. Email Transmission
        if (mode === 'Email' || mode === 'Both') {
          // Determine the target email address
          let targetEmail = null;
          if (emp && emp.Email) {
            targetEmail = emp.Email;
          } else if (recipient.includes('@')) {
            targetEmail = recipient;
          }

          if (targetEmail) {
            self._log(`→ [Email] Sending to ${recipient} (${targetEmail})...`, 'info');
            const result = await window.api.sendEmail({
              to: targetEmail,
              subject: `Automated Report: ${dist.ReportName}`,
              body: `Hello ${recipient},\n\nPlease find the attached report: ${dist.ReportName}.\n\nRegards,\nSupreme UI Automations`,
              filePath: filePath
            });

            if (result.error) {
              self._log(`  ✗ [Email] Failed: ${result.error}`, 'stderr');
            } else {
              self._log(`  ✓ [Email] Sent`, 'success');
            }
          } else {
            self._log(`  ✗ [Email] Skipped ${recipient}: No valid email found.`, 'stderr');
          }
        }
      }

      self._log('✓ All sends completed!', 'success');
      showToast('Report sent to all recipients!', 'success');
    });
  },

  refresh() {
    const c = document.getElementById('page-container');
    c.innerHTML = this.render();
    this.init();
  }
});
