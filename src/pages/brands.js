// ── Brand Category Page ────────────────────────────────────────────────────────
registerPage('brands', {
  _query: '',
  _showPurged: false,

  render() {
    let rows = getSheet('Brands');
    if (!this._showPurged) rows = rows.filter(r => r.Status !== 'Purged');
    rows = filterRows(rows, this._query, ['Brand', 'DisplayCategory', 'Order']);

    return `
      <div class="page-header">
        <div class="page-header-left">
          <h1 class="page-title">Brand Category</h1>
          <p class="page-subtitle">Manage mobile brands, display categories and report order</p>
        </div>
        <button class="btn btn-primary" id="btn-add-brand">${icons.add} Add Brand</button>
      </div>
      ${noFileBanner()}
      <div class="page-body">
        <div class="table-container">
          <div class="table-toolbar" style="align-items:flex-start">
            <div>
              <input type="text" class="search-input" id="search-brand" placeholder="Search brands..." value="${this._query}" />
              <div style="font-size:12px;color:var(--text-muted);margin-top:0.4rem;padding-left:0.2rem">${rows.length} record${rows.length !== 1 ? 's' : ''}</div>
            </div>
            <label style="font-size:12px;color:var(--text-muted);display:flex;align-items:center;gap:0.4rem;cursor:pointer;margin-top:0.6rem">
              <input type="checkbox" id="toggle-purged-brand" ${this._showPurged ? 'checked' : ''} / /> Show Purged
            </label>
          </div>
          ${rows.length === 0 ? `
            <div class="empty-state">${icons.brand}<p>No brands found. Click "Add Brand" to get started.</p></div>
          ` : `
            <table class="data-table">
              <thead><tr>
                <th>Brand</th>
                <th>Report Display Category</th>
                <th>Order</th>
                <th>Status</th>
                <th>Actions</th>
              </tr></thead>
              <tbody>
                ${rows.map(row => {
                  const realIdx = getSheet('Brands').indexOf(row);
                  const isPurged = row.Status === 'Purged';
                  return `<tr style="${isPurged ? 'opacity:0.5' : ''}">
                    <td><strong>${row.Brand || '—'}</strong></td>
                    <td>${row.DisplayCategory || '—'}</td>
                    <td><span class="badge badge-blue">${row.Order || '—'}</span></td>
                    <td>${isPurged ? '<span class="badge badge-red">Purged</span>' : '<span class="badge badge-green">Active</span>'}</td>
                    <td>
                      <div class="action-btns">
                        <button class="btn btn-icon btn-edit-brand" data-idx="${realIdx}" title="Edit">${icons.edit}</button>
                        ${isPurged
                          ? `<button class="btn btn-icon btn-restore-brand" data-idx="${realIdx}" title="Restore" style="color:var(--success);border-color:var(--success)">↩</button>`
                          : `<button class="btn btn-icon danger btn-purge-brand" data-idx="${realIdx}" title="Purge">${icons.trash}</button>`}
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
    document.getElementById('btn-add-brand')?.addEventListener('click', () => self.openForm(-1, {}));
    document.getElementById('search-brand')?.addEventListener('input', (e) => { self._query = e.target.value; self.refresh(); });
    document.getElementById('toggle-purged-brand')?.addEventListener('change', (e) => { self._showPurged = e.target.checked; self.refresh(); });
    document.querySelectorAll('.btn-edit-brand').forEach(btn => {
      btn.addEventListener('click', () => { self.openForm(parseInt(btn.dataset.idx), { ...getSheet('Brands')[parseInt(btn.dataset.idx)] }); });
    });
    document.querySelectorAll('.btn-purge-brand').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Purge this brand?')) return;
        const rows = [...getSheet('Brands')]; rows[parseInt(btn.dataset.idx)].Status = 'Purged';
        if (await saveSheet('Brands', rows)) { showToast('Brand purged.', 'success'); self.refresh(); }
      });
    });
    document.querySelectorAll('.btn-restore-brand').forEach(btn => {
      btn.addEventListener('click', async () => {
        const rows = [...getSheet('Brands')]; rows[parseInt(btn.dataset.idx)].Status = 'Active';
        if (await saveSheet('Brands', rows)) { showToast('Brand restored.', 'success'); self.refresh(); }
      });
    });
  },

  refresh() { const c = document.getElementById('page-container'); c.innerHTML = this.render(); this.init(); },

  openForm(idx, data) {
    const isEdit = idx >= 0;
    const bodyHTML = `
      <div class="form-group">
        <label class="form-label">Brand Name <span style="color:var(--danger)">*</span></label>
        <input type="text" class="form-input" id="f-brand" placeholder="e.g. Samsung" value="${data.Brand || ''}" />
      </div>
      <div class="form-group">
        <label class="form-label">Report Display Category <span style="color:var(--danger)">*</span></label>
        <input type="text" class="form-input" id="f-display" placeholder="How brand appears in output" value="${data.DisplayCategory || ''}" />
      </div>
      <div class="form-group">
        <label class="form-label">Order <span style="color:var(--danger)">*</span></label>
        <input type="number" class="form-input" id="f-order" placeholder="Numeric order for report export" min="1" value="${data.Order || ''}" />
      </div>
    `;
    const self = this;
    openModal(isEdit ? 'Edit Brand' : 'Add Brand', bodyHTML, async () => {
      const brand   = document.getElementById('f-brand').value.trim();
      const display = document.getElementById('f-display').value.trim();
      const order   = document.getElementById('f-order').value.trim();
      if (!brand || !display || !order) { showToast('All fields are required.', 'error'); return false; }
      const row = { Brand: brand, DisplayCategory: display, Order: order, Status: data.Status || 'Active' };
      const rows = [...getSheet('Brands')];
      if (isEdit) rows[idx] = row; else rows.push(row);
      if (await saveSheet('Brands', rows)) { showToast(isEdit ? 'Brand updated.' : 'Brand added.', 'success'); self.refresh(); return true; }
      return false;
    });
  }
});
