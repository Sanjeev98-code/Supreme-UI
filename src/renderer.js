/**
 * Renderer Process — Router & Global State
 */

// ── Global State ──────────────────────────────────────────────────────────────
window.AppState = {
  excelPath: null,
  data: {},
  sheets: [],
};

// ── Page Registry ─────────────────────────────────────────────────────────────
const Pages = {};

function registerPage(name, module) {
  Pages[name] = module;
}

// ── Router ────────────────────────────────────────────────────────────────────
let currentPage = 'employees';

function navigateTo(page) {
  // Deactivate old nav
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  const navEl = document.querySelector(`[data-page="${page}"]`);
  if (navEl) navEl.classList.add('active');

  currentPage = page;
  if (Pages[page]) {
    const container = document.getElementById('page-container');
    container.innerHTML = Pages[page].render();
    Pages[page].init && Pages[page].init();
  }
}

// ── Toast System ───────────────────────────────────────────────────────────────
window.showToast = function(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span class="toast-dot"></span>${message}`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
};

// ── Modal System ───────────────────────────────────────────────────────────────
window.openModal = function(title, bodyHTML, onSave) {
  const overlay = document.getElementById('modal-overlay');
  const box = document.getElementById('modal-box');
  box.innerHTML = `
    <div class="modal-header">
      <h3>${title}</h3>
      <button class="modal-close" id="modal-close-btn">&times;</button>
    </div>
    <div class="modal-body">${bodyHTML}</div>
    <div class="modal-footer">
      <button class="btn btn-secondary" id="modal-cancel-btn">Cancel</button>
      <button class="btn btn-primary" id="modal-save-btn">Save</button>
    </div>
  `;
  overlay.classList.remove('hidden');
  document.getElementById('modal-close-btn').onclick = closeModal;
  document.getElementById('modal-cancel-btn').onclick = closeModal;
  document.getElementById('modal-save-btn').onclick = () => {
    if (onSave()) closeModal();
  };
};

window.closeModal = function() {
  document.getElementById('modal-overlay').classList.add('hidden');
};

// ── Excel Helpers ──────────────────────────────────────────────────────────────
window.loadExcelData = async function() {
  if (!AppState.excelPath) return;
  const result = await window.api.readExcel(AppState.excelPath);
  if (result.error) {
    showToast('Failed to read Excel: ' + result.error, 'error');
    return;
  }
  AppState.data = result.data;
  AppState.sheets = result.sheets;
};

window.getSheet = function(name) {
  return AppState.data[name] || [];
};

window.saveSheet = async function(name, rows) {
  if (!AppState.excelPath) {
    showToast('No Excel file selected. Go to Settings.', 'error');
    return false;
  }
  AppState.data[name] = rows;
  const result = await window.api.writeExcel(AppState.excelPath, name, rows);
  if (result.error) {
    showToast('Save failed: ' + result.error, 'error');
    return false;
  }
  return true;
};

// ── No-file Banner ─────────────────────────────────────────────────────────────
window.noFileBanner = function() {
  return AppState.excelPath ? '' : `
    <div class="no-file-banner">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
      No Excel file configured. Click <strong>&nbsp;Settings&nbsp;</strong> in the sidebar to select your master file.
    </div>`;
};

// ── Search + Filter helper ─────────────────────────────────────────────────────
window.filterRows = function(rows, query, fields) {
  if (!query) return rows;
  const q = query.toLowerCase();
  return rows.filter(row =>
    fields.some(f => String(row[f] || '').toLowerCase().includes(q))
  );
};

// ── Load page scripts in order ─────────────────────────────────────────────────
const pageModules = [
  'src/pages/employees.js',
  'src/pages/zones.js',
  'src/pages/branches.js',
  'src/pages/brands.js',
  'src/pages/reports.js',
  'src/pages/distribution.js',
  'src/pages/logs.js',
  'src/pages/whatsapp.js',
];

function loadScripts(scripts, index, callback) {
  if (index >= scripts.length) { callback(); return; }
  const s = document.createElement('script');
  s.src = scripts[index];
  s.onload = () => loadScripts(scripts, index + 1, callback);
  document.body.appendChild(s);
}

// ── Boot ───────────────────────────────────────────────────────────────────────
async function boot() {
  // Load saved Excel path
  const savedPath = await window.api.getDataPath();
  if (savedPath) {
    AppState.excelPath = savedPath;
    await loadExcelData();
  }

  loadScripts(pageModules, 0, () => {
    // Sidebar navigation
    document.querySelectorAll('.nav-item[data-page]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        navigateTo(el.dataset.page);
      });
    });

    // Title bar controls (via contextBridge)
    document.getElementById('btn-minimize').addEventListener('click', () => window.api.minimize());
    document.getElementById('btn-maximize').addEventListener('click', () => window.api.maximize());
    document.getElementById('btn-close').addEventListener('click',    () => window.api.close());

    // Settings button
    document.getElementById('btn-settings').addEventListener('click', openSettings);

    navigateTo('employees');
  });
}

// ── Settings ───────────────────────────────────────────────────────────────────
function openSettings() {
  const overlay = document.getElementById('settings-overlay');
  overlay.classList.remove('hidden');
  document.getElementById('settings-excel-path').value = AppState.excelPath || '';

  document.getElementById('btn-settings-close').onclick = closeSettings;
  document.getElementById('btn-settings-cancel').onclick = closeSettings;
  document.getElementById('btn-browse-excel').onclick = async () => {
    const fp = await window.api.openFileDialog();
    if (fp) document.getElementById('settings-excel-path').value = fp;
  };
  document.getElementById('btn-create-excel').onclick = async () => {
    const fp = await window.api.saveFileDialog();
    if (fp) {
      document.getElementById('settings-excel-path').value = fp;
      showToast('New Excel file created with all sheets!', 'success');
    }
  };
  document.getElementById('btn-settings-save').onclick = async () => {
    const fp = document.getElementById('settings-excel-path').value.trim();
    if (!fp) { showToast('Please select or create a file first.', 'error'); return; }
    await window.api.saveDataPath(fp);
    AppState.excelPath = fp;
    await loadExcelData();
    closeSettings();
    showToast('Settings saved. Excel file loaded.', 'success');
    navigateTo(currentPage);
  };
}

function closeSettings() {
  document.getElementById('settings-overlay').classList.add('hidden');
}

// Close modals on overlay click
document.getElementById('modal-overlay').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeModal();
});
document.getElementById('settings-overlay').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeSettings();
});

boot();
