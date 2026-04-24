// ── Distribution List Page ─────────────────────────────────────────────────────
registerPage('distribution', {
  _query: '',
  _showPurged: false,

  render() {
    let rows = getSheet('Distribution');
    if (!this._showPurged) rows = rows.filter(r => r.Status !== 'Purged');
    rows = filterRows(rows, this._query, ['ReportName', 'Mode', 'Recipients']);

    const activeReports = getActiveSheet('Reports');

    return `
      <div class="page-header">
        <div class="page-header-left">
          <h1 class="page-title">Distribution List</h1>
          <p class="page-subtitle">Map reports to recipients via Email, WhatsApp or Both</p>
        </div>
        <button class="btn btn-primary" id="btn-add-dist">${icons.add} Add Distribution</button>
      </div>
      ${noFileBanner()}
      <div class="page-body">
        <div class="table-container">
          <div class="table-toolbar" style="align-items:flex-start">
            <div>
              <input type="text" class="search-input" id="search-dist" placeholder="Search distributions..." value="${this._query}" />
              <div style="font-size:12px;color:var(--text-muted);margin-top:0.4rem;padding-left:0.2rem">${rows.length} mapping${rows.length !== 1 ? 's' : ''}</div>
            </div>
            <label style="font-size:12px;color:var(--text-muted);display:flex;align-items:center;gap:0.4rem;cursor:pointer;margin-top:0.6rem">
              <input type="checkbox" id="toggle-purged-dist" ${this._showPurged ? 'checked' : ''} / /> Show Purged
            </label>
          </div>
          ${rows.length === 0 ? `
            <div class="empty-state">${icons.dist}<p>No distribution mappings found. Click "Add Distribution" to assign reports to recipients.</p></div>
          ` : `
            <table class="data-table">
              <thead><tr>
                <th>Report</th>
                <th>Mode</th>
                <th>Recipients / Groups</th>
                <th>Status</th>
                <th>Actions</th>
              </tr></thead>
              <tbody>
                ${rows.map(row => {
                  const realIdx = getSheet('Distribution').indexOf(row);
                  const isPurged = row.Status === 'Purged';
                  const modeBadge = row.Mode === 'WhatsApp' ? 'badge-wa' : row.Mode === 'Email' ? 'badge-blue' : 'badge-yellow';
                  return `<tr style="${isPurged ? 'opacity:0.5' : ''}">
                    <td><strong>${row.ReportName || '—'}</strong></td>
                    <td><span class="badge ${modeBadge}">${row.Mode || '—'}</span></td>
                    <td>
                      <div style="display:flex;flex-wrap:wrap;gap:0.3rem">
                        ${(row.Recipients || '').split(',').map(r => r.trim()).filter(Boolean).map(r =>
                          `<span class="badge badge-blue" style="font-size:11px">${r}</span>`
                        ).join('')}
                      </div>
                    </td>
                    <td>${isPurged ? '<span class="badge badge-red">Purged</span>' : '<span class="badge badge-green">Active</span>'}</td>
                    <td>
                      <div class="action-btns">
                        <button class="btn btn-icon btn-edit-dist" data-idx="${realIdx}" title="Edit">${icons.edit}</button>
                        ${isPurged
                          ? `<button class="btn btn-icon btn-restore-dist" data-idx="${realIdx}" title="Restore" style="color:var(--success);border-color:var(--success)">↩</button>`
                          : `<button class="btn btn-icon danger btn-purge-dist" data-idx="${realIdx}" title="Purge">${icons.trash}</button>`}
                      </div>
                    </td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          `}
        </div>
      </div>
    `;
  },

  init() {
    const self = this;
    document.getElementById('btn-add-dist')?.addEventListener('click', () => self.openForm(-1, {}));
    document.getElementById('search-dist')?.addEventListener('input', (e) => { self._query = e.target.value; self.refresh(); });
    document.getElementById('toggle-purged-dist')?.addEventListener('change', (e) => { self._showPurged = e.target.checked; self.refresh(); });
    document.querySelectorAll('.btn-edit-dist').forEach(btn => {
      btn.addEventListener('click', () => { self.openForm(parseInt(btn.dataset.idx), { ...getSheet('Distribution')[parseInt(btn.dataset.idx)] }); });
    });
    document.querySelectorAll('.btn-purge-dist').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Purge this distribution?')) return;
        const rows = [...getSheet('Distribution')]; rows[parseInt(btn.dataset.idx)].Status = 'Purged';
        if (await saveSheet('Distribution', rows)) { showToast('Distribution purged.', 'success'); self.refresh(); }
      });
    });
    document.querySelectorAll('.btn-restore-dist').forEach(btn => {
      btn.addEventListener('click', async () => {
        const rows = [...getSheet('Distribution')]; rows[parseInt(btn.dataset.idx)].Status = 'Active';
        if (await saveSheet('Distribution', rows)) { showToast('Distribution restored.', 'success'); self.refresh(); }
      });
    });
  },

  refresh() { const c = document.getElementById('page-container'); c.innerHTML = this.render(); this.init(); },

  openForm(idx, data) {
    const isEdit = idx >= 0;
    const activeReports = getActiveSheet('Reports');
    const activeEmps    = getActiveSheet('Employees');
    const currentRecipients = (data.Recipients || '').split(',').map(r => r.trim()).filter(Boolean);

    const bodyHTML = `
      <div class="form-group">
        <label class="form-label">Report <span style="color:var(--danger)">*</span></label>
        <select class="form-select" id="f-report">
          <option value="">— Select Report —</option>
          ${activeReports.map(r => `<option value="${r.ReportName}" ${data.ReportName === r.ReportName ? 'selected' : ''}>${r.ReportName}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Mode <span style="color:var(--danger)">*</span></label>
        <select class="form-select" id="f-mode">
          <option value="">— Select —</option>
          <option value="Email" ${data.Mode === 'Email' ? 'selected' : ''}>Email</option>
          <option value="WhatsApp" ${data.Mode === 'WhatsApp' ? 'selected' : ''}>WhatsApp</option>
          <option value="Both" ${data.Mode === 'Both' ? 'selected' : ''}>Both</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Select Employees</label>
        <div style="max-height:180px;overflow-y:auto;border:1px solid var(--border);border-radius:var(--radius);padding:0.5rem;background:var(--bg-input)">
          ${activeEmps.length === 0 ? '<p style="color:var(--text-muted);font-size:12px">No employees added yet.</p>' :
            activeEmps.map(e => `
              <label style="display:flex;align-items:center;gap:0.5rem;padding:0.3rem 0;cursor:pointer;font-size:13px;color:var(--text-primary)">
                <input type="checkbox" class="emp-check" value="${e.EmployeeName}" ${currentRecipients.includes(e.EmployeeName) ? 'checked' : ''} />
                ${e.EmployeeName} <span style="color:var(--text-muted);font-size:11px">(${e.Role} — ${e.Mobile || 'No phone'})</span>
              </label>
            `).join('')}
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">WhatsApp Group Names (comma separated)</label>
        <input type="text" class="form-input" id="f-groups" placeholder="e.g. South Managers, Daily Sales Group"
          value="${currentRecipients.filter(r => !activeEmps.some(e => e.EmployeeName === r)).join(', ')}" />
        <p class="form-hint">Type group names that aren't in the employee list.</p>
      </div>
    `;
    const self = this;
    openModal(isEdit ? 'Edit Distribution' : 'Add Distribution', bodyHTML, async () => {
      const reportName = document.getElementById('f-report').value;
      const mode       = document.getElementById('f-mode').value;
      if (!reportName || !mode) { showToast('Report and Mode are required.', 'error'); return false; }

      // Gather employees checked
      const checkedEmps = Array.from(document.querySelectorAll('.emp-check:checked')).map(c => c.value);
      // Gather group names
      const groupsRaw = document.getElementById('f-groups').value;
      const groups = groupsRaw.split(',').map(g => g.trim()).filter(Boolean);
      const allRecipients = [...checkedEmps, ...groups].join(', ');

      const row = { ReportName: reportName, Mode: mode, Recipients: allRecipients, Status: data.Status || 'Active' };
      const rows = [...getSheet('Distribution')];
      if (isEdit) rows[idx] = row; else rows.push(row);
      if (await saveSheet('Distribution', rows)) { showToast(isEdit ? 'Distribution updated.' : 'Distribution added.', 'success'); self.refresh(); return true; }
      return false;
    });
  }
});
