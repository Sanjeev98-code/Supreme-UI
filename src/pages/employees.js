// ── Shared Icons & Helpers ─────────────────────────────────────────────────────
const icons = {
  employee: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>`,
  zone:     `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="10" r="3"/><path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 00-16 0c0 3 2.7 7 8 11.7z"/></svg>`,
  branch:   `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
  brand:    `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12" y2="18"/></svg>`,
  report:   `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
  dist:     `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22 6 12 13 2 6"/></svg>`,
  log:      `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`,
  edit:     `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
  trash:    `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18.36 6.64A9 9 0 015.64 18.36 9 9 0 0118.36 6.64z"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`,
  add:      `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  run:      `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>`,
};

// Helper: get active (non-purged) items from a sheet
window.getActiveSheet = function(name) {
  return (AppState.data[name] || []).filter(r => r.Status !== 'Purged');
};

// Helper: get employees filtered by role
window.getEmployeesByRole = function(role) {
  return getActiveSheet('Employees').filter(r => r.Role === role);
};

// ── Employees Page ─────────────────────────────────────────────────────────────
registerPage('employees', {
  _query: '',
  _showPurged: false,

  render() {
    let rows = getSheet('Employees');
    if (!this._showPurged) rows = rows.filter(r => r.Status !== 'Purged');
    rows = filterRows(rows, this._query, ['EmployeeName', 'Role', 'Mobile', 'Email']);

    return `
      <div class="page-header">
        <div class="page-header-left">
          <h1 class="page-title">Employees</h1>
          <p class="page-subtitle">Manage employees with roles — ASM, ZSM, RSM, Promoter</p>
        </div>
        <button class="btn btn-primary" id="btn-add-emp">${icons.add} Add Employee</button>
      </div>
      ${noFileBanner()}
      <div class="page-body">
        <div class="table-container">
          <div class="table-toolbar" style="align-items:flex-start">
            <div>
              <input type="text" class="search-input" id="search-emp" placeholder="Search employees..." value="${this._query}" />
              <div style="font-size:12px;color:var(--text-muted);margin-top:0.4rem;padding-left:0.2rem">${rows.length} record${rows.length !== 1 ? 's' : ''}</div>
            </div>
            <label style="font-size:12px;color:var(--text-muted);display:flex;align-items:center;gap:0.4rem;cursor:pointer;margin-top:0.6rem">
              <input type="checkbox" id="toggle-purged" ${this._showPurged ? 'checked' : ''} / /> Show Purged
            </label>
          </div>
          ${rows.length === 0 ? `
            <div class="empty-state">${icons.employee}<p>No employees found. Click "Add Employee" to get started.</p></div>
          ` : `
            <table class="data-table">
              <thead><tr>
                <th>Employee Name</th>
                <th>Staff Code</th>
                <th>Role</th>
                <th>Brand</th>
                <th>Mobile Number</th>
                <th>Email</th>
                <th>Status</th>
                <th>Actions</th>
              </tr></thead>
              <tbody>
                ${rows.map(row => {
                  const realIdx = getSheet('Employees').indexOf(row);
                  const isPurged = row.Status === 'Purged';
                  return `<tr style="${isPurged ? 'opacity:0.5' : ''}">
                    <td><strong>${row.EmployeeName || '—'}</strong></td>
                    <td><span style="font-family:monospace;font-size:12px;color:var(--text-secondary)">${row.StaffCode || '—'}</span></td>
                    <td><span class="badge badge-blue">${row.Role || '—'}</span></td>
                    <td>${row.Role === 'Promoter' && row.Brand ? `<span class="badge" style="background:var(--bg-accent);color:var(--text-primary)">${row.Brand}</span>` : '—'}</td>
                    <td><span style="font-family:monospace;color:var(--wa-green)">${row.Mobile || '—'}</span></td>
                    <td>${row.Email || '—'}</td>
                    <td>${isPurged
                      ? '<span class="badge badge-red">Purged</span>'
                      : '<span class="badge badge-green">Active</span>'}</td>
                    <td>
                      <div class="action-btns">
                        <button class="btn btn-icon btn-edit-emp" data-idx="${realIdx}" title="Edit">${icons.edit}</button>
                        ${isPurged
                          ? `<button class="btn btn-icon btn-restore-emp" data-idx="${realIdx}" title="Restore" style="color:var(--success);border-color:var(--success)">↩</button>`
                          : `<button class="btn btn-icon danger btn-purge-emp" data-idx="${realIdx}" title="Purge">${icons.trash}</button>`}
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
    document.getElementById('btn-add-emp')?.addEventListener('click', () => self.openForm(-1, {}));
    document.getElementById('search-emp')?.addEventListener('input', (e) => {
      self._query = e.target.value; self.refresh();
    });
    document.getElementById('toggle-purged')?.addEventListener('change', (e) => {
      self._showPurged = e.target.checked; self.refresh();
    });
    document.querySelectorAll('.btn-edit-emp').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx);
        self.openForm(idx, { ...getSheet('Employees')[idx] });
      });
    });
    document.querySelectorAll('.btn-purge-emp').forEach(btn => {
      btn.addEventListener('click', async () => {
        const idx = parseInt(btn.dataset.idx);
        if (!confirm('Purge this employee? They will be hidden from all dropdowns.')) return;
        const rows = [...getSheet('Employees')];
        rows[idx].Status = 'Purged';
        const ok = await saveSheet('Employees', rows);
        if (ok) { showToast('Employee purged.', 'success'); self.refresh(); }
      });
    });
    document.querySelectorAll('.btn-restore-emp').forEach(btn => {
      btn.addEventListener('click', async () => {
        const idx = parseInt(btn.dataset.idx);
        const rows = [...getSheet('Employees')];
        rows[idx].Status = 'Active';
        const ok = await saveSheet('Employees', rows);
        if (ok) { showToast('Employee restored.', 'success'); self.refresh(); }
      });
    });
  },

  refresh() {
    const c = document.getElementById('page-container');
    c.innerHTML = this.render();
    this.init();
  },

  openForm(idx, data) {
    const isEdit = idx >= 0;
    const brands = getActiveSheet('Brands');
    const bodyHTML = `
      <div class="form-group">
        <label class="form-label">Employee Name <span style="color:var(--danger)">*</span></label>
        <input type="text" class="form-input" id="f-name" placeholder="Full name" value="${data.EmployeeName || ''}" />
      </div>
      <div class="form-group">
        <label class="form-label">Staff Code <span style="color:var(--danger)">*</span></label>
        <input type="text" class="form-input" id="f-code" placeholder="e.g. EMP001" value="${data.StaffCode || ''}" />
      </div>
      <div class="form-row">
        <div class="form-group" style="flex:1">
          <label class="form-label">Role <span style="color:var(--danger)">*</span></label>
          <select class="form-select" id="f-role">
            <option value="">— Select Role —</option>
            ${['ASM', 'ZSM', 'RSM', 'Promoter'].map(r => `<option value="${r}" ${data.Role === r ? 'selected' : ''}>${r}</option>`).join('')}
          </select>
        </div>
        <div class="form-group" id="group-brand" style="flex:1; ${data.Role === 'Promoter' ? 'display:block' : 'display:none'}">
          <label class="form-label">Brand <span style="color:var(--danger)">*</span></label>
          <select class="form-select" id="f-brand">
            <option value="">— Select Brand —</option>
            ${brands.map(b => `<option value="${b.Brand}" ${data.Brand === b.Brand ? 'selected' : ''}>${b.Brand}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Mobile / WhatsApp <span style="color:var(--danger)">*</span></label>
          <input type="text" class="form-input" id="f-mobile" placeholder="+91XXXXXXXXXX" value="${data.Mobile || ''}" maxlength="13" />
          <p class="form-hint">Include +91 followed by 10 digit number, no spaces. e.g. +919876543210</p>
        </div>
        <div class="form-group">
          <label class="form-label">Email</label>
          <input type="email" class="form-input" id="f-email" placeholder="name@company.com" value="${data.Email || ''}" />
          <p class="form-hint">Must be a complete email (e.g. name@company.com, user@firm.co.in)</p>
        </div>
      </div>
    `;
    const self = this;
    openModal(isEdit ? 'Edit Employee' : 'Add Employee', bodyHTML, async () => {
      const name   = document.getElementById('f-name').value.trim();
      const code   = document.getElementById('f-code').value.trim();
      const role   = document.getElementById('f-role').value;
      const brand  = document.getElementById('f-brand').value;
      const mobile = document.getElementById('f-mobile').value.trim();
      const email  = document.getElementById('f-email').value.trim();

      if (!name || !code || !role || !mobile) { showToast('Name, Staff Code, Role and Mobile are required.', 'error'); return false; }
      if (role === 'Promoter' && !brand) { showToast('Brand is required for Promoters.', 'error'); return false; }

      // Validate mobile: must be +91 followed by exactly 10 digits, no spaces
      const mobileRegex = /^\+91\d{10}$/;
      if (!mobileRegex.test(mobile)) {
        showToast('Mobile must be +91 followed by exactly 10 digits (no spaces). e.g. +919876543210', 'error');
        document.getElementById('f-mobile').style.borderColor = 'var(--danger)';
        document.getElementById('f-mobile').focus();
        return false;
      }

      // Validate email if provided: must be a complete valid email format
      if (email) {
        const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(email)) {
          showToast('Please enter a complete email address (e.g. name@company.com)', 'error');
          document.getElementById('f-email').style.borderColor = 'var(--danger)';
          document.getElementById('f-email').focus();
          return false;
        }
      }

      const row = { EmployeeName: name, StaffCode: code, Role: role, Brand: brand, Mobile: mobile, Email: email, Status: data.Status || 'Active' };
      const rows = [...getSheet('Employees')];
      if (isEdit) rows[idx] = row; else rows.push(row);
      const ok = await saveSheet('Employees', rows);
      if (ok) { showToast(isEdit ? 'Employee updated.' : 'Employee added.', 'success'); self.refresh(); return true; }
      return false;
    });

    setTimeout(() => {
      const roleSel = document.getElementById('f-role');
      const brandGrp = document.getElementById('group-brand');
      if(roleSel) {
        roleSel.addEventListener('change', (e) => {
          if(e.target.value === 'Promoter') brandGrp.style.display = 'block';
          else {
            brandGrp.style.display = 'none';
            document.getElementById('f-brand').value = '';
          }
        });
      }
    }, 50);
  }
});
