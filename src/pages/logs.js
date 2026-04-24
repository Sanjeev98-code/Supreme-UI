// ── Logs Page ──────────────────────────────────────────────────────────────────
registerPage('logs', {
  render() {
    const logs = getSheet('Logs');

    // Generate last 30 days worth of dates
    const dates = [];
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split('T')[0]);
    }

    // Build a lookup: date → { InputFetched, LogicRan, Sent }
    const logMap = {};
    logs.forEach(l => { logMap[l.Date] = l; });

    return `
      <div class="page-header">
        <div class="page-header-left">
          <h1 class="page-title">Logs</h1>
          <p class="page-subtitle">Track daily report execution — Input Fetched, Logic Ran, Sent</p>
        </div>
        <div style="display:flex;gap:0.5rem">
          <button class="btn btn-secondary" id="btn-download-log">📥 Download Log</button>
          <button class="btn btn-primary" id="btn-record-log">${icons.add} Record Today's Log</button>
        </div>
      </div>
      ${noFileBanner()}
      <div class="page-body">
        <div class="table-container">
          <div class="table-toolbar">
            <span style="font-size:13px;font-weight:600;color:var(--text-primary)">Last 30 Days</span>
            <span style="font-size:12px;color:var(--text-muted)">${logs.length} log entries</span>
          </div>
          <table class="data-table">
            <thead><tr>
              <th>Date</th>
              <th style="text-align:center">Input Fetched</th>
              <th style="text-align:center">Logic Ran</th>
              <th style="text-align:center">Sent</th>
              <th>Actions</th>
            </tr></thead>
            <tbody>
              ${dates.map(date => {
                const log = logMap[date] || {};
                const tick = (val) => val === 'Yes'
                  ? '<span style="color:var(--success);font-size:18px">✓</span>'
                  : (val === 'Failed' ? '<span style="color:var(--danger);font-size:18px">✗</span>' : '<span style="color:var(--text-muted)">—</span>');
                const hasLog = log.Date;
                return `<tr>
                  <td>
                    <strong>${formatDate(date)}</strong>
                    <span style="display:block;font-size:11px;color:var(--text-muted)">${getDayName(date)}</span>
                  </td>
                  <td style="text-align:center">${tick(log.InputFetched)}</td>
                  <td style="text-align:center">${tick(log.LogicRan)}</td>
                  <td style="text-align:center">${tick(log.Sent)}</td>
                  <td>
                    <button class="btn btn-sm btn-secondary btn-edit-log" data-date="${date}" title="Edit">
                      ${hasLog ? icons.edit + ' Edit' : icons.add + ' Log'}
                    </button>
                  </td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  init() {
    const self = this;
    document.getElementById('btn-record-log')?.addEventListener('click', () => {
      const today = new Date().toISOString().split('T')[0];
      const existing = getSheet('Logs').find(l => l.Date === today);
      self.openForm(today, existing || {});
    });
    
    document.getElementById('btn-download-log')?.addEventListener('click', async () => {
      const logs = getSheet('Logs');
      if (logs.length === 0) {
        showToast('No logs available to download.', 'error');
        return;
      }
      
      const dataToExport = logs.map(l => ({
        Date: l.Date,
        Day: getDayName(l.Date),
        "Input Fetched": l.InputFetched || '',
        "Logic Ran": l.LogicRan || '',
        "Sent": l.Sent || '',
        Notes: l.Notes || ''
      }));

      const todayStr = new Date().toISOString().split('T')[0];
      const fp = await window.api.exportExcel({
        defaultPath: `Logs_Export_${todayStr}.xlsx`,
        sheetName: 'Logs',
        data: dataToExport
      });
      
      if (fp) {
        showToast('Logs downloaded successfully as Excel!', 'success');
      }
    });

    document.querySelectorAll('.btn-edit-log').forEach(btn => {
      btn.addEventListener('click', () => {
        const date = btn.dataset.date;
        const existing = getSheet('Logs').find(l => l.Date === date);
        self.openForm(date, existing || {});
      });
    });
  },

  refresh() { const c = document.getElementById('page-container'); c.innerHTML = this.render(); this.init(); },

  openForm(date, data) {
    const isEdit = !!data.Date;
    const bodyHTML = `
      <div class="form-group">
        <label class="form-label">Date</label>
        <input type="text" class="form-input" value="${formatDate(date)} (${getDayName(date)})" readonly style="opacity:0.7" />
      </div>
      <div class="form-group">
        <label class="form-label">Input Fetched</label>
        <select class="form-select" id="f-input">
          <option value="">— Not Recorded —</option>
          <option value="Yes" ${data.InputFetched === 'Yes' ? 'selected' : ''}>✓ Yes</option>
          <option value="Failed" ${data.InputFetched === 'Failed' ? 'selected' : ''}>✗ Failed</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Logic Ran</label>
        <select class="form-select" id="f-logic">
          <option value="">— Not Recorded —</option>
          <option value="Yes" ${data.LogicRan === 'Yes' ? 'selected' : ''}>✓ Yes</option>
          <option value="Failed" ${data.LogicRan === 'Failed' ? 'selected' : ''}>✗ Failed</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Sent</label>
        <select class="form-select" id="f-sent">
          <option value="">— Not Recorded —</option>
          <option value="Yes" ${data.Sent === 'Yes' ? 'selected' : ''}>✓ Yes</option>
          <option value="Failed" ${data.Sent === 'Failed' ? 'selected' : ''}>✗ Failed</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Notes (optional)</label>
        <input type="text" class="form-input" id="f-notes" placeholder="Any comments..." value="${data.Notes || ''}" />
      </div>
    `;
    const self = this;
    openModal(`Log — ${formatDate(date)}`, bodyHTML, async () => {
      const row = {
        Date:         date,
        InputFetched: document.getElementById('f-input').value,
        LogicRan:     document.getElementById('f-logic').value,
        Sent:         document.getElementById('f-sent').value,
        Notes:        document.getElementById('f-notes').value.trim(),
      };
      const rows = [...getSheet('Logs')];
      const existingIdx = rows.findIndex(l => l.Date === date);
      if (existingIdx >= 0) rows[existingIdx] = row; else rows.push(row);
      // Sort by date descending
      rows.sort((a, b) => b.Date.localeCompare(a.Date));
      if (await saveSheet('Logs', rows)) { showToast('Log saved.', 'success'); self.refresh(); return true; }
      return false;
    });
  }
});

// ── Date helpers ───────────────────────────────────────────────────────────────
function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getDayName(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { weekday: 'long' });
}
