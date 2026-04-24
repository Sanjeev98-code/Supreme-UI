// ── Zones Page ─────────────────────────────────────────────────────────────────
registerPage('zones', {
  render() {
    const rows = getSheet('Zones');
    const active = rows.filter(r => r.Status !== 'Purged');
    const purged = rows.filter(r => r.Status === 'Purged');

    return `
      <div class="page-header">
        <div class="page-header-left">
          <h1 class="page-title">Zones</h1>
          <p class="page-subtitle">Manage geographical zones</p>
        </div>
        <button class="btn btn-primary" id="btn-add-zone">${icons.add} Add Zone</button>
      </div>
      ${noFileBanner()}
      <div class="page-body">
        <div class="table-container">
          <div class="table-toolbar">
            <span style="font-size:13px;font-weight:600;color:var(--text-primary)">Active Zones</span>
            <span style="font-size:12px;color:var(--text-muted)">${active.length} zone${active.length !== 1 ? 's' : ''}</span>
          </div>
          ${active.length === 0 ? `
            <div class="empty-state">${icons.zone}<p>No zones added yet. Click "Add Zone" to get started.</p></div>
          ` : `
            <table class="data-table">
              <thead><tr><th>Zone Name</th><th style="width:140px">Actions</th></tr></thead>
              <tbody>
                ${active.map(row => {
                  const realIdx = rows.indexOf(row);
                  return `<tr>
                    <td><strong>${row.ZoneName || '—'}</strong></td>
                    <td>
                      <div class="action-btns">
                        <button class="btn btn-icon btn-edit-zone" data-idx="${realIdx}" title="Edit">${icons.edit}</button>
                        <button class="btn btn-icon danger btn-purge-zone" data-idx="${realIdx}" title="Purge">${icons.trash}</button>
                      </div>
                    </td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          `}
        </div>

        ${purged.length > 0 ? `
        <div class="table-container" style="margin-top:1.5rem">
          <div class="table-toolbar">
            <span style="font-size:13px;font-weight:600;color:var(--text-muted)">Purged Zones</span>
            <span style="font-size:12px;color:var(--text-muted)">${purged.length}</span>
          </div>
          <table class="data-table">
            <thead><tr><th>Zone Name</th><th style="width:140px">Actions</th></tr></thead>
            <tbody>
              ${purged.map(row => {
                const realIdx = rows.indexOf(row);
                return `<tr style="opacity:0.5">
                  <td>${row.ZoneName} <span class="badge badge-red">Purged</span></td>
                  <td><button class="btn btn-sm btn-secondary btn-restore-zone" data-idx="${realIdx}">Restore</button></td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}
      </div>
    `;
  },

  init() {
    const self = this;
    document.getElementById('btn-add-zone')?.addEventListener('click', () => self.openForm(-1, {}));
    document.querySelectorAll('.btn-edit-zone').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx);
        self.openForm(idx, { ...getSheet('Zones')[idx] });
      });
    });
    document.querySelectorAll('.btn-purge-zone').forEach(btn => {
      btn.addEventListener('click', async () => {
        const idx = parseInt(btn.dataset.idx);
        if (!confirm('Purge this zone?')) return;
        const rows = [...getSheet('Zones')];
        rows[idx].Status = 'Purged';
        const ok = await saveSheet('Zones', rows);
        if (ok) { showToast('Zone purged.', 'success'); self.refresh(); }
      });
    });
    document.querySelectorAll('.btn-restore-zone').forEach(btn => {
      btn.addEventListener('click', async () => {
        const idx = parseInt(btn.dataset.idx);
        const rows = [...getSheet('Zones')];
        rows[idx].Status = 'Active';
        const ok = await saveSheet('Zones', rows);
        if (ok) { showToast('Zone restored.', 'success'); self.refresh(); }
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
    const bodyHTML = `
      <div class="form-group">
        <label class="form-label">Zone Name <span style="color:var(--danger)">*</span></label>
        <input type="text" class="form-input" id="f-zone" placeholder="e.g. South Zone" value="${data.ZoneName || ''}" />
      </div>
    `;
    const self = this;
    openModal(isEdit ? 'Edit Zone' : 'Add Zone', bodyHTML, async () => {
      const name = document.getElementById('f-zone').value.trim();
      if (!name) { showToast('Zone name is required.', 'error'); return false; }
      const row = { ZoneName: name, Status: data.Status || 'Active' };
      const rows = [...getSheet('Zones')];
      if (isEdit) rows[idx] = row; else rows.push(row);
      const ok = await saveSheet('Zones', rows);
      if (ok) { showToast(isEdit ? 'Zone updated.' : 'Zone added.', 'success'); self.refresh(); return true; }
      return false;
    });
  }
});
