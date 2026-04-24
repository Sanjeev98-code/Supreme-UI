// ── Branch Masters Page ────────────────────────────────────────────────────────
registerPage('branches', {
  _query: '',
  _showPurged: false,

  render() {
    let rows = getSheet('Branches');
    if (!this._showPurged) rows = rows.filter(r => r.Status !== 'Purged');
    rows = filterRows(rows, this._query, ['BranchName', 'BranchCode', 'ZSM', 'ASM', 'RSM', 'Promoter', 'StoreCategory']);

    return `
      <div class="page-header">
        <div class="page-header-left">
          <h1 class="page-title">Branch Masters</h1>
          <p class="page-subtitle">Manage branches with ZSM, ASM, RSM and Promoter assignments</p>
        </div>
        <button class="btn btn-primary" id="btn-add-branch">${icons.add} Add Branch</button>
      </div>
      ${noFileBanner()}
      <div class="page-body">
        <div class="table-container">
          <div class="table-toolbar" style="align-items:flex-start">
            <div>
              <input type="text" class="search-input" id="search-branch" placeholder="Search branches..." value="${this._query}" />
              <div style="font-size:12px;color:var(--text-muted);margin-top:0.4rem;padding-left:0.2rem">${rows.length} record${rows.length !== 1 ? 's' : ''}</div>
            </div>
            <label style="font-size:12px;color:var(--text-muted);display:flex;align-items:center;gap:0.4rem;cursor:pointer;margin-top:0.6rem">
              <input type="checkbox" id="toggle-purged-branch" ${this._showPurged ? 'checked' : ''} / /> Show Purged
            </label>
          </div>
          ${rows.length === 0 ? `
            <div class="empty-state">${icons.branch}<p>No branches found. Click "Add Branch" to get started.</p></div>
          ` : `
            <div style="overflow-x:auto">
            <table class="data-table">
              <thead><tr>
                <th>Branch Name</th>
                <th>Code</th>
                <th>ZSM</th>
                <th>ASM</th>
                <th>RSM</th>
                <th>Promoter</th>
                <th>LTL Store</th>
                <th>GP%</th>
                <th>Category</th>
                <th>Status</th>
                <th>Actions</th>
              </tr></thead>
              <tbody>
                ${rows.map(row => {
                  const realIdx = getSheet('Branches').indexOf(row);
                  const isPurged = row.Status === 'Purged';
                  return `<tr style="${isPurged ? 'opacity:0.5' : ''}">
                    <td><strong>${row.BranchName || '—'}</strong></td>
                    <td><span style="font-family:monospace">${row.BranchCode || '—'}</span></td>
                    <td>${row.ZSM || '—'}</td>
                    <td>${row.ASM || '—'}</td>
                    <td>${row.RSM || '—'}</td>
                    <td>
                      ${(row.Promoter || '').split(',').map(p => p.trim()).filter(Boolean)
                        .map(p => `<span class="badge badge-blue" style="font-size:11px;margin:1px">${p}</span>`).join('') || '—'}
                    </td>
                    <td>${row.LikeToLikeStore === 'Yes'
                      ? '<span class="badge badge-green">Yes</span>'
                      : (row.LikeToLikeStore === 'No' ? '<span class="badge badge-red">No</span>' : '—')}</td>
                    <td>${row.GPPercent ? row.GPPercent + '%' : '—'}</td>
                    <td>${row.StoreCategory ? `<span class="badge badge-blue">${row.StoreCategory}</span>` : '—'}</td>
                    <td>${isPurged ? '<span class="badge badge-red">Purged</span>' : '<span class="badge badge-green">Active</span>'}</td>
                    <td>
                      <div class="action-btns">
                        <button class="btn btn-icon btn-edit-branch" data-idx="${realIdx}" title="Edit">${icons.edit}</button>
                        ${isPurged
                          ? `<button class="btn btn-icon btn-restore-branch" data-idx="${realIdx}" title="Restore" style="color:var(--success);border-color:var(--success)">↩</button>`
                          : `<button class="btn btn-icon danger btn-purge-branch" data-idx="${realIdx}" title="Purge">${icons.trash}</button>`}
                      </div>
                    </td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
            </div>
          `}
        </div>
      </div>
    `;
  },

  init() {
    const self = this;
    document.getElementById('btn-add-branch')?.addEventListener('click', () => self.openForm(-1, {}));
    document.getElementById('search-branch')?.addEventListener('input', (e) => {
      self._query = e.target.value; self.refresh();
    });
    document.getElementById('toggle-purged-branch')?.addEventListener('change', (e) => {
      self._showPurged = e.target.checked; self.refresh();
    });
    document.querySelectorAll('.btn-edit-branch').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx);
        self.openForm(idx, { ...getSheet('Branches')[idx] });
      });
    });
    document.querySelectorAll('.btn-purge-branch').forEach(btn => {
      btn.addEventListener('click', async () => {
        const idx = parseInt(btn.dataset.idx);
        if (!confirm('Purge this branch?')) return;
        const rows = [...getSheet('Branches')];
        rows[idx].Status = 'Purged';
        const ok = await saveSheet('Branches', rows);
        if (ok) { showToast('Branch purged.', 'success'); self.refresh(); }
      });
    });
    document.querySelectorAll('.btn-restore-branch').forEach(btn => {
      btn.addEventListener('click', async () => {
        const idx = parseInt(btn.dataset.idx);
        const rows = [...getSheet('Branches')];
        rows[idx].Status = 'Active';
        const ok = await saveSheet('Branches', rows);
        if (ok) { showToast('Branch restored.', 'success'); self.refresh(); }
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
    const zsms      = getEmployeesByRole('ZSM');
    const asms      = getEmployeesByRole('ASM');
    const rsms      = getEmployeesByRole('RSM');
    const promoters = getEmployeesByRole('Promoter');

    const empDropdown = (id, list, selected) => `
      <select class="form-select" id="${id}">
        <option value="">— Select —</option>
        ${list.map(e => `<option value="${e.EmployeeName}" ${selected === e.EmployeeName ? 'selected' : ''}>${e.EmployeeName}</option>`).join('')}
      </select>`;

    const bodyHTML = `
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Branch Name <span style="color:var(--danger)">*</span></label>
          <input type="text" class="form-input" id="f-bname" placeholder="e.g. MG Road Showroom" value="${data.BranchName || ''}" />
        </div>
        <div class="form-group">
          <label class="form-label">Branch Code <span style="color:var(--danger)">*</span></label>
          <input type="text" class="form-input" id="f-bcode" placeholder="e.g. MG001" value="${data.BranchCode || ''}" />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">ZSM</label>
          ${empDropdown('f-zsm', zsms, data.ZSM)}
        </div>
        <div class="form-group">
          <label class="form-label">ASM</label>
          ${empDropdown('f-asm', asms, data.ASM)}
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">RSM</label>
          ${empDropdown('f-rsm', rsms, data.RSM)}
        </div>
        <div class="form-group">
          <label class="form-label">Promoter(s) <span style="color:var(--text-muted);font-size:11px">(select all that apply)</span></label>
          <div style="max-height:140px;overflow-y:auto;border:1px solid var(--border);border-radius:var(--radius);padding:0.5rem;background:var(--bg-input)">
            ${promoters.length === 0
              ? '<p style="color:var(--text-muted);font-size:12px;margin:0">No promoters added yet. Add employees with role Promoter first.</p>'
              : promoters.map(e => {
                  const selected = (data.Promoter || '').split(',').map(p => p.trim()).includes(e.EmployeeName);
                  return `<label style="display:flex;align-items:center;gap:0.5rem;padding:0.3rem 0;cursor:pointer;font-size:13px;color:var(--text-primary)">
                    <input type="checkbox" class="promoter-check" value="${e.EmployeeName}" ${selected ? 'checked' : ''} />
                    ${e.EmployeeName}
                  </label>`;
                }).join('')}
          </div>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Like to Like Store</label>
          <select class="form-select" id="f-ltl">
            <option value="">— Select —</option>
            <option value="Yes" ${data.LikeToLikeStore === 'Yes' ? 'selected' : ''}>Yes</option>
            <option value="No"  ${data.LikeToLikeStore === 'No'  ? 'selected' : ''}>No</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">GP %</label>
          <input type="number" class="form-input" id="f-gp" placeholder="e.g. 12.5" step="0.01" value="${data.GPPercent || ''}" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Store Category</label>
        <select class="form-select" id="f-category">
          <option value="">— Select —</option>
          ${['A+','A','B','C','D','E'].map(c => `<option value="${c}" ${data.StoreCategory === c ? 'selected' : ''}>${c}</option>`).join('')}
        </select>
      </div>
    `;
    const self = this;
    openModal(isEdit ? 'Edit Branch' : 'Add Branch', bodyHTML, async () => {
      const bname = document.getElementById('f-bname').value.trim();
      const bcode = document.getElementById('f-bcode').value.trim();
      if (!bname || !bcode) { showToast('Branch Name and Code are required.', 'error'); return false; }

      const row = {
        BranchName:       bname,
        BranchCode:       bcode,
        ZSM:              document.getElementById('f-zsm').value,
        ASM:              document.getElementById('f-asm').value,
        RSM:              document.getElementById('f-rsm').value,
        Promoter:         Array.from(document.querySelectorAll('.promoter-check:checked')).map(c => c.value).join(', '),
        LikeToLikeStore:  document.getElementById('f-ltl').value,
        GPPercent:        document.getElementById('f-gp').value,
        StoreCategory:    document.getElementById('f-category').value,
        Status:           data.Status || 'Active',
      };
      const rows = [...getSheet('Branches')];
      if (isEdit) rows[idx] = row; else rows.push(row);
      const ok = await saveSheet('Branches', rows);
      if (ok) { showToast(isEdit ? 'Branch updated.' : 'Branch added.', 'success'); self.refresh(); return true; }
      return false;
    });
  }
});
