// ── Report List Page ───────────────────────────────────────────────────────────
registerPage('reports', {
  _query: '',
  _showPurged: false,

  render() {
    let rows = getSheet('Reports');
    if (!this._showPurged) rows = rows.filter(r => r.Status !== 'Purged');
    rows = filterRows(rows, this._query, ['ReportName', 'Team']);

    // Maximum selectable date is 2 days ago
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() - 2);
    const maxStr = maxDate.toISOString().split('T')[0];

    return `
      <div class="page-header">
        <div class="page-header-left">
          <h1 class="page-title">Report List</h1>
          <p class="page-subtitle">Manage reports and manually trigger them (for dates 2 days ago or older)</p>
        </div>
        <button class="btn btn-primary" id="btn-add-report">${icons.add} Add Report</button>
      </div>
      ${noFileBanner()}
      <div class="page-body">
        <div class="table-container">
          <div class="table-toolbar" style="align-items:flex-start">
            <div>
              <input type="text" class="search-input" id="search-report" placeholder="Search reports..." value="${this._query}" />
              <div style="font-size:12px;color:var(--text-muted);margin-top:0.4rem;padding-left:0.2rem">${rows.length} report${rows.length !== 1 ? 's' : ''}</div>
            </div>
            <label style="font-size:12px;color:var(--text-muted);display:flex;align-items:center;gap:0.4rem;cursor:pointer;margin-top:0.6rem">
              <input type="checkbox" id="toggle-purged-report" ${this._showPurged ? 'checked' : ''} / /> Show Purged
            </label>
          </div>
          ${rows.length === 0 ? `
            <div class="empty-state">${icons.report}<p>No reports found. Click "Add Report" to get started.</p></div>
          ` : `
            <table class="data-table">
              <thead><tr>
                <th>Report Name</th>
                <th>Team</th>
                <th>Status</th>
                <th>Run For Date</th>
                <th>Actions</th>
              </tr></thead>
              <tbody>
                ${rows.map(row => {
                  const realIdx = getSheet('Reports').indexOf(row);
                  const isPurged = row.Status === 'Purged';
                  return `<tr style="${isPurged ? 'opacity:0.5' : ''}">
                    <td><strong>${row.ReportName || '—'}</strong></td>
                    <td>${row.Team ? `<span class="badge badge-blue">${row.Team}</span>` : '—'}</td>
                    <td>${isPurged ? '<span class="badge badge-red">Purged</span>' : '<span class="badge badge-green">Active</span>'}</td>
                    <td>
                      ${!isPurged ? `<input type="date" class="form-input run-date" data-idx="${realIdx}"
                        value="${maxStr}" max="${maxStr}"
                        style="width:140px;padding:0.35rem 0.5rem;font-size:12px" />` : '—'}
                    </td>
                    <td>
                      <div class="action-btns">
                        ${!isPurged ? `<button class="btn btn-sm btn-success btn-run-report" data-idx="${realIdx}" title="Run">
                          ${icons.run} Run
                        </button>` : ''}
                        <button class="btn btn-icon btn-edit-report" data-idx="${realIdx}" title="Edit">${icons.edit}</button>
                        ${isPurged
                          ? `<button class="btn btn-icon btn-restore-report" data-idx="${realIdx}" title="Restore" style="color:var(--success);border-color:var(--success)">↩</button>`
                          : `<button class="btn btn-icon danger btn-purge-report" data-idx="${realIdx}" title="Purge">${icons.trash}</button>`}
                      </div>
                    </td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          `}
        </div>

        <!-- Console Output -->
        <div class="console-panel" style="margin-top:1.5rem" id="report-console-wrap" style="display:none">
          <div class="console-header">
            <div class="console-header-dots">
              <div class="console-dot console-dot-red"></div>
              <div class="console-dot console-dot-yellow"></div>
              <div class="console-dot console-dot-green"></div>
            </div>
            <span class="console-title">Report Output</span>
          </div>
          <div class="console-body" id="report-console">
            <span class="console-line-info">$ Ready — click Run on a report to execute it</span>
          </div>
        </div>
      </div>
    `;
  },

  init() {
    const self = this;
    document.getElementById('btn-add-report')?.addEventListener('click', () => self.openForm(-1, {}));
    document.getElementById('search-report')?.addEventListener('input', (e) => { self._query = e.target.value; self.refresh(); });
    document.getElementById('toggle-purged-report')?.addEventListener('change', (e) => { self._showPurged = e.target.checked; self.refresh(); });
    document.querySelectorAll('.btn-edit-report').forEach(btn => {
      btn.addEventListener('click', () => { self.openForm(parseInt(btn.dataset.idx), { ...getSheet('Reports')[parseInt(btn.dataset.idx)] }); });
    });
    document.querySelectorAll('.btn-purge-report').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Purge this report?')) return;
        const rows = [...getSheet('Reports')]; rows[parseInt(btn.dataset.idx)].Status = 'Purged';
        if (await saveSheet('Reports', rows)) { showToast('Report purged.', 'success'); self.refresh(); }
      });
    });
    document.querySelectorAll('.btn-restore-report').forEach(btn => {
      btn.addEventListener('click', async () => {
        const rows = [...getSheet('Reports')]; rows[parseInt(btn.dataset.idx)].Status = 'Active';
        if (await saveSheet('Reports', rows)) { showToast('Report restored.', 'success'); self.refresh(); }
      });
    });
    // Run buttons
    document.querySelectorAll('.btn-run-report').forEach(btn => {
      btn.addEventListener('click', async () => {
        const idx = parseInt(btn.dataset.idx);
        const report = getSheet('Reports')[idx];
        const dateInput = document.querySelector(`.run-date[data-idx="${idx}"]`);
        const runDate = dateInput ? dateInput.value : new Date().toISOString().split('T')[0];


        const consolEl = document.getElementById('report-console');
        consolEl.innerHTML = `<div class="console-line-info">$ Running "${report.ReportName}" for date ${runDate}...</div>`;

        window.api.removeReportListeners();
        window.api.onReportOutput((data) => {
          const lines = data.text.split('\n').filter(l => l.length > 0);
          lines.forEach(l => {
            consolEl.innerHTML += `<div class="console-line-${data.type}">${l.replace(/</g,'&lt;')}</div>`;
          });
          consolEl.scrollTop = consolEl.scrollHeight;
        });
        window.api.onReportDone((data) => {
          const msg = data.code === 0 ? '✓ Completed successfully' : `✗ Exited with code ${data.code}`;
          consolEl.innerHTML += `<div class="console-line-${data.code === 0 ? 'success' : 'stderr'}">${msg}</div>`;
          showToast(data.code === 0 ? `${report.ReportName} completed!` : `${report.ReportName} failed.`, data.code === 0 ? 'success' : 'error');
        });

        await window.api.runReport(report.ScriptPath, ['--date', runDate]);
      });
    });
  },

  refresh() { const c = document.getElementById('page-container'); c.innerHTML = this.render(); this.init(); },

  openForm(idx, data) {
    const isEdit = idx >= 0;
    const teams = ['Sales', 'Inventory', 'Accounts', 'Accessories', 'Mobile'];
    const bodyHTML = `
      <div class="form-group">
        <label class="form-label">Report Name <span style="color:var(--danger)">*</span></label>
        <input type="text" class="form-input" id="f-rname" placeholder="e.g. Daily Sales Report" value="${data.ReportName || ''}" />
      </div>
      <div class="form-group">
        <label class="form-label">Team <span style="color:var(--danger)">*</span></label>
        <select class="form-select" id="f-team">
          <option value="">— Select Team —</option>
          ${teams.map(t => `<option value="${t}" ${data.Team === t ? 'selected' : ''}>${t}</option>`).join('')}
        </select>
      </div>
    `;
    const self = this;
    openModal(isEdit ? 'Edit Report' : 'Add Report', bodyHTML, async () => {
      const rname = document.getElementById('f-rname').value.trim();
      const team  = document.getElementById('f-team').value;
      if (!rname || !team) { showToast('Report Name and Team are required.', 'error'); return false; }
      const row = { ReportName: rname, Team: team, Status: data.Status || 'Active' };
      const rows = [...getSheet('Reports')];
      if (isEdit) rows[idx] = row; else rows.push(row);
      if (await saveSheet('Reports', rows)) { showToast(isEdit ? 'Report updated.' : 'Report added.', 'success'); self.refresh(); return true; }
      return false;
    });

  }
});
