/**
 * Internet Cafe Diary — Frontend Application JS
 * Handles: Navigation, CRUD Calls, System Manager, DataTables, Offline Assets, Document Management
 */

// ══════════════════════════════════════════════════════════════
// CONFIG
// ══════════════════════════════════════════════════════════════
const API = 'php_files/api.php';
const SERVICES = ['Document Print', 'Form Fill', 'Browsing', 'Photo Print', 'Scanning', 'PDF Convert', 'Online Work', 'Government Form', 'Scholarship', 'Job Application', 'Aadhar Work', 'PAN Card', 'Other'];
const PAYMENT_MODES = ['cash', 'upi', 'credit', 'free'];

// ══════════════════════════════════════════════════════════════
// STATE
// ══════════════════════════════════════════════════════════════
let state = {
  page: 'dashboard',
  customers: [],
  sessions: [],
  folders: [],
  allDocuments: [],
  docDataTable: null,
  docViewMode: 'table',
  stats: {},
  settings: null,
  selectedCustomer: null,
  filters: { search: '', year: '', status: '', directory_id: '' },
  sesFilters: { search: '', year: '', date: '' },
  docFilters: { location: '' },
  chart: null
};

// ══════════════════════════════════════════════════════════════
// INIT
// ══════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {
  updateClock();
  setInterval(updateClock, 1000);

  // Load Settings First to apply branding
  await loadSettingsData();

  navigateTo('dashboard');

  // Nav clicks
  document.querySelectorAll('.nav-item').forEach(el => {
    el.addEventListener('click', () => navigateTo(el.dataset.page));
  });

  // Settings Tab clicks
  document.querySelectorAll('.settings-tab').forEach(tab => {
    tab.addEventListener('click', () => switchSettingsTab(tab.dataset.tab));
  });

  // Header search
  document.getElementById('headerSearch')?.addEventListener('input', (e) => {
    const q = e.target.value.trim();
    if (state.page === 'customers') {
      state.filters.search = q;
      renderCustomers();
    } else if (state.page === 'documents' && state.docDataTable) {
      state.docDataTable.search(q).draw();
    }
  });

  // Mobile sidebar toggle
  document.getElementById('menuToggle')?.addEventListener('click', () => {
    document.querySelector('.sidebar')?.classList.toggle('open');
  });

  // Logo type switch in settings
  document.getElementById('logoTypeSelect')?.addEventListener('change', (e) => {
    const isImg = e.target.value === 'image';
    document.getElementById('logoIconGroup')?.classList.toggle('hidden', isImg);
    document.getElementById('logoUrlGroup')?.classList.toggle('hidden', !isImg);
  });

  initCustomerForm();
  initSessionForm();
  initFilters();
  initSettingsForms();
  initDirectoryForm();
  initDocumentForms();
});

// ══════════════════════════════════════════════════════════════
// SETTINGS & BRANDING
// ══════════════════════════════════════════════════════════════
async function loadSettingsData() {
  try {
    const res = await apiGet('settings');
    if (res.success && res.data) {
      state.settings = res.data;
      applySettings(res.data);
      populateStorageDirectoryDropdowns();
    }
  } catch (e) {
    console.error('Failed to load settings:', e);
  }
}

function applySettings(settings) {
  if (!settings || !settings.general) return;
  const g = settings.general;

  const iconClass = (g.logo_icon && g.logo_icon.startsWith('fa-')) ? g.logo_icon : 'fa-solid fa-desktop';
  const topTitle = document.getElementById('topHeaderTitle');
  if (topTitle) {
    topTitle.innerHTML = `<i class="${iconClass}"></i> ${escapeHtml(g.site_title || 'Internet Cafe Diary')}`;
  }

  const sidebarTitle = document.getElementById('sidebarShopTitle');
  if (sidebarTitle) sidebarTitle.textContent = g.site_title || 'Internet Cafe';

  const sidebarTagline = document.getElementById('sidebarTagline');
  if (sidebarTagline) sidebarTagline.textContent = g.tagline || 'Diary System';

  const sidebarIcon = document.getElementById('sidebarLogoIcon');
  if (sidebarIcon) {
    if (g.logo_type === 'image' && g.logo_url) {
      sidebarIcon.innerHTML = `<img src="${g.logo_url}" style="width:100%;height:100%;object-fit:cover;border-radius:8px;" alt="Logo">`;
    } else {
      sidebarIcon.innerHTML = `<i class="${iconClass}"></i>`;
    }
  }

  const ownerEl = document.getElementById('sidebarOwnerName');
  if (ownerEl) ownerEl.textContent = g.owner_name || 'Admin';

  const avatarEl = document.getElementById('sidebarUserAvatar');
  if (avatarEl) avatarEl.textContent = (g.owner_name || 'A').charAt(0).toUpperCase();

  document.querySelectorAll('.currency-symbol').forEach(el => {
    el.textContent = g.currency_symbol || '₹';
  });

  document.title = `${g.site_title || 'Internet Cafe Diary'} — Dashboard`;
}

function populateStorageDirectoryDropdowns() {
  const dirs = state.settings?.storage?.directories || [];
  const activeDirs = dirs.filter(d => d.is_active !== false);

  const custDirSelect = document.getElementById('inp-storage-dir');
  if (custDirSelect) {
    custDirSelect.innerHTML = activeDirs.map(d =>
      `<option value="${d.id}" ${d.is_default ? 'selected' : ''}>${escapeHtml(d.name)} (${escapeHtml(d.path)}) ${d.is_default ? '★ Default' : ''}</option>`
    ).join('');
  }

  const custFilterSelect = document.getElementById('filterCustomerDir');
  if (custFilterSelect) {
    custFilterSelect.innerHTML = '<option value="">All Locations</option>' +
      dirs.map(d => `<option value="${d.id}">${escapeHtml(d.name)}</option>`).join('');
  }

  const docLocSelect = document.getElementById('filterDocLocation');
  if (docLocSelect) {
    docLocSelect.innerHTML = '<option value="">All Storage Locations</option>' +
      dirs.map(d => `<option value="${d.id}">${escapeHtml(d.name)}</option>`).join('');
  }
}

// ══════════════════════════════════════════════════════════════
// NAVIGATION
// ══════════════════════════════════════════════════════════════
function navigateTo(page) {
  state.page = page;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const pageEl = document.getElementById('page-' + page);
  if (pageEl) pageEl.classList.add('active');
  document.querySelector(`.nav-item[data-page="${page}"]`)?.classList.add('active');

  const shopTitle = state.settings?.general?.site_title || 'Internet Cafe Diary';
  const iconClass = (state.settings?.general?.logo_icon && state.settings.general.logo_icon.startsWith('fa-')) ? state.settings.general.logo_icon : 'fa-solid fa-desktop';

  const titles = {
    dashboard: `<i class="${iconClass}"></i> ${escapeHtml(shopTitle)}`,
    customers: '<i class="fa-solid fa-users"></i> Customers',
    sessions:  '<i class="fa-solid fa-clock"></i> Sessions',
    documents: '<i class="fa-solid fa-folder-open"></i> Documents Manager',
    reports:   '<i class="fa-solid fa-chart-line"></i> Reports',
    settings:  '<i class="fa-solid fa-gear"></i> System Manager'
  };
  const topHeaderTitle = document.getElementById('topHeaderTitle');
  if (topHeaderTitle) topHeaderTitle.innerHTML = titles[page] || escapeHtml(shopTitle);

  if (page === 'dashboard') loadDashboard();
  if (page === 'customers') loadCustomers();
  if (page === 'sessions')  loadSessions();
  if (page === 'documents') loadDocuments();
  if (page === 'reports')   loadReports();
  if (page === 'settings')  loadSettings();
}

// ══════════════════════════════════════════════════════════════
// CLOCK
// ══════════════════════════════════════════════════════════════
function updateClock() {
  const now = new Date();
  const d = now.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
  const t = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  const el = document.getElementById('dateDisplay');
  if (el) el.textContent = `${d}  ${t}`;
}

// ══════════════════════════════════════════════════════════════
// API HELPERS
// ══════════════════════════════════════════════════════════════
async function apiGet(resource, params = {}) {
  const q = new URLSearchParams({ resource, ...params });
  const res = await fetch(`${API}?${q}`);
  return res.json();
}

async function apiPost(resource, body, action = '') {
  const q = new URLSearchParams({ resource });
  if (action) q.append('action', action);
  const res = await fetch(`${API}?${q}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return res.json();
}

async function apiPut(resource, id, body) {
  const res = await fetch(`${API}?resource=${resource}&id=${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return res.json();
}

async function apiDelete(resource, id) {
  const res = await fetch(`${API}?resource=${resource}&id=${id}`, { method: 'DELETE' });
  return res.json();
}

// ══════════════════════════════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════════════════════════════
async function loadDashboard() {
  showLoading('dash-stats');
  try {
    const [statsData, custData, sesData] = await Promise.all([
      apiGet('stats'),
      apiGet('customers'),
      apiGet('sessions')
    ]);

    state.stats     = statsData;
    state.customers = custData.data || [];
    state.sessions  = sesData.data  || [];

    renderDashStats(statsData);
    renderRecentCustomers();
    renderRecentSessions();
    renderYearChart(statsData.by_year || {});
    updateCustomerBadge(state.customers.length);
  } catch(e) {
    toast('Failed to load dashboard data', 'error');
  }
}

function updateCustomerBadge(count) {
  const badge = document.getElementById('badge-customers');
  if (badge) badge.textContent = count;
}

function updateDocumentBadge(count) {
  const badge = document.getElementById('badge-documents');
  if (badge) badge.textContent = count;
  const countEl = document.getElementById('docs-total-count');
  if (countEl) countEl.textContent = `(${count})`;
}

function renderDashStats(s) {
  const el = document.getElementById('dash-stats');
  if (!el) return;
  const sym = state.settings?.general?.currency_symbol || '₹';
  el.innerHTML = `
    <div class="stat-card cyan">
      <div class="stat-icon"><i class="fa-solid fa-users"></i></div>
      <div class="stat-label">Total Customers</div>
      <div class="stat-value">${s.total_customers ?? 0}</div>
      <div class="stat-sub">${s.active_customers ?? 0} active</div>
    </div>
    <div class="stat-card purple">
      <div class="stat-icon"><i class="fa-solid fa-clock"></i></div>
      <div class="stat-label">Total Sessions</div>
      <div class="stat-value">${s.total_sessions ?? 0}</div>
      <div class="stat-sub">${s.today_sessions ?? 0} today</div>
    </div>
    <div class="stat-card green">
      <div class="stat-icon"><i class="fa-solid fa-wallet"></i></div>
      <div class="stat-label">Today's Revenue</div>
      <div class="stat-value">${sym}${(s.today_revenue ?? 0).toFixed(0)}</div>
      <div class="stat-sub">Year: ${sym}${(s.year_revenue ?? 0).toFixed(0)}</div>
    </div>
    <div class="stat-card orange">
      <div class="stat-icon"><i class="fa-solid fa-chart-pie"></i></div>
      <div class="stat-label">Total Revenue</div>
      <div class="stat-value">${sym}${(s.total_revenue ?? 0).toFixed(0)}</div>
      <div class="stat-sub">All time earnings</div>
    </div>`;
}

function renderRecentCustomers() {
  const el = document.getElementById('dash-recent-customers');
  if (!el) return;
  const recent = [...state.customers].slice(-5).reverse();
  if (!recent.length) { el.innerHTML = emptyState('No customers yet'); return; }
  el.innerHTML = `<div class="table-wrap"><table>
    <thead><tr><th>#</th><th>Name</th><th>Phone</th><th>Date</th><th>Status</th><th></th></tr></thead>
    <tbody>${recent.map((c,i) => `<tr>
      <td class="text-muted">${i+1}</td>
      <td class="td-name">${initials(c.name)} ${escapeHtml(c.name)}</td>
      <td class="td-mono">${escapeHtml(c.phone)||'—'}</td>
      <td class="td-mono">${fmtDate(c.created_date)}</td>
      <td><span class="badge badge-${c.status==='active'?'active':'inactive'}">${c.status}</span></td>
      <td><button class="btn btn-sm btn-secondary" onclick="viewCustomer('${c.id}')"><i class="fa-solid fa-eye"></i> View</button></td>
    </tr>`).join('')}</tbody>
  </table></div>`;
}

function renderRecentSessions() {
  const el = document.getElementById('dash-recent-sessions');
  if (!el) return;
  const recent = [...state.sessions].slice(0, 5);
  const sym = state.settings?.general?.currency_symbol || '₹';
  if (!recent.length) { el.innerHTML = emptyState('No sessions recorded'); return; }
  el.innerHTML = `<div class="table-wrap"><table>
    <thead><tr><th>Customer</th><th>Date</th><th>Service</th><th>Time</th><th>Amount</th></tr></thead>
    <tbody>${recent.map(s => `<tr>
      <td class="td-name">${escapeHtml(s.customer_name)}</td>
      <td class="td-mono">${fmtDate(s.date)}</td>
      <td><span class="badge badge-cyan">${escapeHtml(s.service)||'—'}</span></td>
      <td class="td-mono">${s.start_time||''}${s.end_time?' → '+s.end_time:''}</td>
      <td class="td-mono text-right">${sym}${s.amount||0}</td>
    </tr>`).join('')}</tbody>
  </table></div>`;
}

function renderYearChart(byYear) {
  const canvas = document.getElementById('yearChart');
  if (!canvas || !window.Chart) return;
  if (state.chart) state.chart.destroy();

  const labels = Object.keys(byYear);
  const data   = Object.values(byYear);
  state.chart  = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Customers',
        data,
        backgroundColor: 'rgba(0,212,255,0.3)',
        borderColor: '#00d4ff',
        borderWidth: 2,
        borderRadius: 6
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#8b9dc3' }, grid: { color: 'rgba(255,255,255,0.05)' } },
        y: { ticks: { color: '#8b9dc3', precision: 0 }, grid: { color: 'rgba(255,255,255,0.05)' } }
      }
    }
  });
}

// ══════════════════════════════════════════════════════════════
// CUSTOMERS
// ══════════════════════════════════════════════════════════════
async function loadCustomers() {
  showLoading('customers-table');
  try {
    const res = await apiGet('customers', state.filters);
    state.customers = res.data || [];
    renderCustomers();
    document.getElementById('cust-count').textContent = `(${state.customers.length})`;
    updateCustomerBadge(state.customers.length);
  } catch(e) {
    toast('Failed to load customers', 'error');
  }
}

function renderCustomers() {
  const el = document.getElementById('customers-table');
  if (!el) return;

  let list = [...state.customers];
  const s = state.filters.search.toLowerCase();
  if (s) list = list.filter(c =>
    c.name.toLowerCase().includes(s) ||
    (c.phone||'').includes(s) ||
    (c.aadhar||'').includes(s)
  );
  if (state.filters.year)   list = list.filter(c => c.created_year === state.filters.year);
  if (state.filters.status) list = list.filter(c => c.status === state.filters.status);
  if (state.filters.directory_id) list = list.filter(c => (c.storage_dir_id || 'dir_root') === state.filters.directory_id);

  list.sort((a,b) => a.name.localeCompare(b.name));

  if (!list.length) { el.innerHTML = emptyState('No customers found'); return; }

  el.innerHTML = `<div class="table-wrap"><table>
    <thead><tr>
      <th>#</th>
      <th>Name</th>
      <th>Phone</th>
      <th>Aadhar</th>
      <th>Location</th>
      <th>Year</th>
      <th>Documents</th>
      <th>Status</th>
      <th>Actions</th>
    </tr></thead>
    <tbody>${list.map((c,i) => `<tr>
      <td class="text-muted td-mono">${String(i+1).padStart(2,'0')}</td>
      <td>
        <div class="flex items-center gap-2">
          <div style="width:32px;height:32px;border-radius:8px;background:linear-gradient(135deg,#00d4ff,#a855f7);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;flex-shrink:0;">
            ${c.name.charAt(0)}
          </div>
          <div>
            <div class="td-name" style="font-size:13px;">${escapeHtml(c.name)}</div>
            <div class="text-muted text-sm font-mono">${escapeHtml(c.folder_name)}</div>
          </div>
        </div>
      </td>
      <td class="td-mono">${escapeHtml(c.phone)||'—'}</td>
      <td class="td-mono">${escapeHtml(c.aadhar)||'—'}</td>
      <td><span class="badge badge-cyan" title="${escapeHtml(c.storage_path||'')}"><i class="fa-solid fa-hard-drive"></i> ${escapeHtml(c.storage_dir_name || 'Default')}</span></td>
      <td><span class="badge badge-purple">${c.created_year||'—'}</span></td>
      <td><span class="badge badge-orange"><i class="fa-solid fa-file"></i> ${(c.documents||[]).length} files</span></td>
      <td><span class="badge badge-${c.status==='active'?'active':'inactive'}">${c.status}</span></td>
      <td>
        <div class="action-btns">
          <button class="btn btn-xs btn-secondary" onclick="viewCustomer('${c.id}')" title="View"><i class="fa-solid fa-eye"></i></button>
          <button class="btn btn-xs btn-secondary" onclick="editCustomer('${c.id}')" title="Edit"><i class="fa-solid fa-pen-to-square"></i></button>
          <button class="btn btn-xs btn-danger"    onclick="deleteCustomer('${c.id}','${escapeHtml(c.name)}')" title="Delete"><i class="fa-solid fa-trash"></i></button>
        </div>
      </td>
    </tr>`).join('')}</tbody>
  </table></div>`;
}

function initFilters() {
  document.getElementById('filterYear')?.addEventListener('change', e => {
    state.filters.year = e.target.value;
    if (state.page === 'customers') loadCustomers();
  });
  document.getElementById('filterStatus')?.addEventListener('change', e => {
    state.filters.status = e.target.value;
    if (state.page === 'customers') loadCustomers();
  });
  document.getElementById('filterCustomerDir')?.addEventListener('change', e => {
    state.filters.directory_id = e.target.value;
    if (state.page === 'customers') loadCustomers();
  });
  document.getElementById('custSearch')?.addEventListener('input', e => {
    state.filters.search = e.target.value;
    renderCustomers();
  });
  document.getElementById('sesSearch')?.addEventListener('input', e => {
    state.sesFilters.search = e.target.value;
    renderSessions();
  });
  document.getElementById('sesFilterYear')?.addEventListener('change', e => {
    state.sesFilters.year = e.target.value;
    renderSessions();
  });
  document.getElementById('sesFilterDate')?.addEventListener('change', e => {
    state.sesFilters.date = e.target.value;
    renderSessions();
  });
}

async function viewCustomer(id) {
  const c = state.customers.find(x => x.id === id);
  if (!c) return;
  state.selectedCustomer = c;
  navigateTo('customers');

  document.getElementById('customers-list-view').classList.add('hidden');
  document.getElementById('customers-detail-view').classList.remove('hidden');

  const targetDirId = c.storage_dir_id || 'dir_root';
  const targetDir = (state.settings?.storage?.directories || []).find(d => d.id === targetDirId);
  const basePath = targetDir ? targetDir.path : '';
  const customerFolderFullPath = basePath ? (basePath.replace(/[\\\/]$/, '') + '\\' + c.folder_name) : '';

  const docs = (c.documents||[]).map(d => {
    const ext = d.split('.').pop().toLowerCase();
    const icon = getFileIconHtml(ext);
    const fullPath = customerFolderFullPath ? (customerFolderFullPath + '\\' + d) : '';

    return `<div class="doc-item" title="${escapeHtml(d)}">
      <div class="doc-icon" onclick="previewDocument('${escapeJsString(fullPath)}','${escapeJsString(d)}','${ext}')" style="cursor:pointer;">${icon}</div>
      <div class="doc-name" onclick="previewDocument('${escapeJsString(fullPath)}','${escapeJsString(d)}','${ext}')" style="cursor:pointer;">${escapeHtml(d)}</div>
      <div class="flex items-center justify-center gap-2 mt-4">
        <button class="btn btn-xs btn-secondary" onclick="openRenameDocModal('${escapeJsString(fullPath)}','${escapeJsString(d)}')" title="Rename"><i class="fa-solid fa-pen-to-square"></i></button>
        <button class="btn btn-xs btn-secondary" onclick="downloadDocument('${escapeJsString(fullPath)}')" title="Download"><i class="fa-solid fa-download"></i></button>
        <button class="btn btn-xs btn-danger" onclick="deleteDocument('${escapeJsString(fullPath)}','${escapeJsString(d)}')" title="Delete"><i class="fa-solid fa-trash"></i></button>
      </div>
    </div>`;
  }).join('');

  const sym = state.settings?.general?.currency_symbol || '₹';
  const visits = (c.visits||[]).map(v => `<tr>
    <td class="td-mono">${fmtDate(v.date)}</td>
    <td><span class="badge badge-cyan">${escapeHtml(v.service)||'—'}</span></td>
    <td class="td-mono">${sym}${v.amount||0}</td>
    <td class="text-muted">${escapeHtml(v.duration)||'—'}</td>
  </tr>`).join('');

  document.getElementById('customer-detail-content').innerHTML = `
    <div class="detail-header">
      <div class="detail-avatar">${c.name.charAt(0)}</div>
      <div class="detail-info">
        <h2>${escapeHtml(c.name)}</h2>
        <p>ID: ${c.id} &nbsp;|&nbsp; Folder: <code>${escapeHtml(c.folder_name)}</code></p>
        <p class="text-muted text-sm mt-4">Storage: <span class="badge badge-cyan"><i class="fa-solid fa-hard-drive"></i> ${escapeHtml(c.storage_dir_name || 'Default')}</span> <code class="text-muted">${escapeHtml(c.storage_path || '')}</code></p>
        <div class="flex gap-2 mt-4">
          <span class="badge badge-${c.status==='active'?'active':'inactive'}">${c.status}</span>
          <span class="badge badge-purple">${c.created_year||'—'}</span>
        </div>
      </div>
      <div style="margin-left:auto;">
        <button class="btn btn-primary btn-sm" onclick="openUploadDocModal('${c.id}')"><i class="fa-solid fa-cloud-arrow-up"></i> Upload Doc</button>
        <button class="btn btn-secondary btn-sm mt-4" onclick="openSessionModal('${c.id}','${escapeHtml(c.name)}')"><i class="fa-solid fa-plus"></i> Add Session</button>
        <button class="btn btn-secondary btn-sm mt-4" onclick="editCustomer('${c.id}')"><i class="fa-solid fa-pen-to-square"></i> Edit</button>
      </div>
    </div>
    <div class="detail-grid mb-4">
      <div class="detail-field"><label>Phone</label><p>${escapeHtml(c.phone)||'—'}</p></div>
      <div class="detail-field"><label>Aadhar</label><p class="font-mono">${escapeHtml(c.aadhar)||'—'}</p></div>
      <div class="detail-field"><label>Address</label><p>${escapeHtml(c.address)||'—'}</p></div>
      <div class="detail-field"><label>Registered Date</label><p class="font-mono">${fmtDate(c.created_date)}</p></div>
      ${c.notes ? `<div class="detail-field" style="grid-column:1/-1"><label>Notes</label><p>${escapeHtml(c.notes)}</p></div>` : ''}
    </div>
    <div class="card mb-4">
      <div class="card-header">
        <h3><i class="fa-solid fa-folder-open"></i> Customer Documents (${(c.documents||[]).length})</h3>
        <button class="btn btn-sm btn-primary" onclick="openUploadDocModal('${c.id}')"><i class="fa-solid fa-cloud-arrow-up"></i> Upload Document</button>
      </div>
      <div class="card-body">
        ${docs ? `<div class="docs-grid">${docs}</div>` : '<p class="text-muted text-sm">No documents stored for this customer.</p>'}
      </div>
    </div>
    <div class="card">
      <div class="card-header"><h3><i class="fa-solid fa-clock-rotate-left"></i> Visit History (${(c.visits||[]).length})</h3></div>
      <div class="card-body" style="padding:0;">
        ${visits ? `<div class="table-wrap"><table>
          <thead><tr><th>Date</th><th>Service</th><th>Amount</th><th>Duration</th></tr></thead>
          <tbody>${visits}</tbody>
        </table></div>` : '<p class="text-muted text-sm" style="padding:20px;">No visits recorded</p>'}
      </div>
    </div>`;
}

function backToCustomers() {
  document.getElementById('customers-list-view').classList.remove('hidden');
  document.getElementById('customers-detail-view').classList.add('hidden');
  state.selectedCustomer = null;
}

function initCustomerForm() {
  const form = document.getElementById('customerForm');
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    const id   = form.dataset.editId;
    let res;
    if (id) {
      res = await apiPut('customers', id, data);
    } else {
      res = await apiPost('customers', data);
    }
    if (res.success) {
      toast(res.message, 'success');
      closeModal('customerModal');
      form.reset(); delete form.dataset.editId;
      loadCustomers();
    } else {
      toast(res.message || 'Error occurred', 'error');
    }
  });
}

function openCustomerModal(editId = null) {
  const form  = document.getElementById('customerForm');
  const title = document.getElementById('customerModalTitle');
  form.reset();
  delete form.dataset.editId;
  populateStorageDirectoryDropdowns();

  if (editId) {
    const c = state.customers.find(x => x.id === editId);
    if (!c) return;
    form.dataset.editId = editId;
    title.innerHTML     = '<i class="fa-solid fa-pen-to-square"></i> Edit Customer';
    form.name.value     = c.name;
    form.phone.value    = c.phone   || '';
    form.address.value  = c.address || '';
    form.aadhar.value   = c.aadhar  || '';
    form.status.value   = c.status  || 'active';
    form.notes.value    = c.notes   || '';
    if (form.storage_dir_id && c.storage_dir_id) {
      form.storage_dir_id.value = c.storage_dir_id;
    }
  } else {
    title.innerHTML = '<i class="fa-solid fa-user-plus"></i> Add New Customer';
  }
  openModal('customerModal');
}

function editCustomer(id) { openCustomerModal(id); }

async function deleteCustomer(id, name) {
  if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
  const res = await apiDelete('customers', id);
  if (res.success) {
    toast('Customer deleted', 'success');
    loadCustomers();
  } else {
    toast(res.message || 'Delete failed', 'error');
  }
}

// ══════════════════════════════════════════════════════════════
// SESSIONS
// ══════════════════════════════════════════════════════════════
async function loadSessions() {
  showLoading('sessions-table');
  try {
    const res = await apiGet('sessions');
    state.sessions = res.data || [];
    renderSessions();
  } catch(e) {
    toast('Failed to load sessions', 'error');
  }
}

function renderSessions() {
  const el = document.getElementById('sessions-table');
  if (!el) return;

  let list = [...state.sessions];
  const s = state.sesFilters.search.toLowerCase();
  if (s) list = list.filter(x => x.customer_name.toLowerCase().includes(s));
  if (state.sesFilters.year) list = list.filter(x => x.year === state.sesFilters.year);
  if (state.sesFilters.date) list = list.filter(x => x.date === state.sesFilters.date);

  list.sort((a,b) => b.date.localeCompare(a.date));

  if (!list.length) { el.innerHTML = emptyState('No sessions found'); return; }

  const sym = state.settings?.general?.currency_symbol || '₹';
  el.innerHTML = `<div class="table-wrap"><table>
    <thead><tr>
      <th>ID</th><th>Customer</th><th>Date</th><th>Service</th>
      <th>Time</th><th>Duration</th><th>Amount</th><th>Payment</th><th>Actions</th>
    </tr></thead>
    <tbody>${list.map(s => `<tr>
      <td class="td-mono text-muted" style="font-size:11px;">${s.id}</td>
      <td class="td-name">${escapeHtml(s.customer_name)}</td>
      <td class="td-mono">${fmtDate(s.date)}</td>
      <td><span class="badge badge-cyan">${escapeHtml(s.service)||'—'}</span></td>
      <td class="td-mono">${s.start_time||''}${s.end_time?' → '+s.end_time:''}</td>
      <td class="text-muted">${s.duration_min||0} min</td>
      <td class="td-mono"><strong>${sym}${s.amount||0}</strong></td>
      <td><span class="badge badge-${s.payment_mode==='cash'?'active':'purple'}">${escapeHtml(s.payment_mode||'cash')}</span></td>
      <td>
        <button class="btn btn-xs btn-danger" onclick="deleteSession('${s.id}')" title="Delete"><i class="fa-solid fa-trash"></i></button>
      </td>
    </tr>`).join('')}</tbody>
  </table></div>`;
}

function initSessionForm() {
  const form = document.getElementById('sessionForm');
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    const res  = await apiPost('sessions', data);
    if (res.success) {
      toast('Session saved!', 'success');
      closeModal('sessionModal');
      form.reset();
      loadSessions();
      if (state.selectedCustomer) viewCustomer(state.selectedCustomer.id);
    } else {
      toast(res.message || 'Error', 'error');
    }
  });
}

function openSessionModal(custId = '', custName = '') {
  const form = document.getElementById('sessionForm');
  form.reset();
  form.date.value       = new Date().toISOString().split('T')[0];
  form.start_time.value = new Date().toTimeString().slice(0,5);

  const sel = form.querySelector('[name="customer_id"]');
  sel.innerHTML = state.customers.map(c =>
    `<option value="${c.id}" ${c.id===custId?'selected':''}>${escapeHtml(c.name)}</option>`
  ).join('');

  const nameSel = form.querySelector('[name="customer_name"]');
  if (custName) nameSel.value = custName;

  sel.onchange = () => {
    const c = state.customers.find(x => x.id === sel.value);
    if (c) nameSel.value = c.name;
  };

  openModal('sessionModal');
}

async function deleteSession(id) {
  if (!confirm('Delete this session?')) return;
  const res = await apiDelete('sessions', id);
  if (res.success) {
    toast('Session deleted', 'success');
    loadSessions();
  } else {
    toast(res.message, 'error');
  }
}

// ══════════════════════════════════════════════════════════════
// DOCUMENTS (DATATABLES & FULL CRUD)
// ══════════════════════════════════════════════════════════════
async function loadDocuments() {
  try {
    const [docsRes, foldRes] = await Promise.all([
      apiGet('documents'),
      apiGet('folders')
    ]);

    state.allDocuments = docsRes.data || [];
    state.folders      = foldRes.data || [];

    updateDocumentBadge(state.allDocuments.length);
    renderDocumentsDataTable();
    renderDocumentsFolderGrid();
  } catch(e) {
    toast('Failed to load documents', 'error');
  }
}

function switchDocViewMode(mode) {
  state.docViewMode = mode;
  const tableContainer = document.getElementById('documents-table-container');
  const gridContainer  = document.getElementById('documents-grid-container');
  const tableBtn       = document.getElementById('viewModeTableBtn');
  const gridBtn        = document.getElementById('viewModeGridBtn');

  if (mode === 'table') {
    tableContainer?.classList.remove('hidden');
    gridContainer?.classList.add('hidden');
    tableBtn?.classList.add('active-view');
    gridBtn?.classList.remove('active-view');
    if (state.docDataTable) state.docDataTable.columns.adjust().draw();
  } else {
    tableContainer?.classList.add('hidden');
    gridContainer?.classList.remove('hidden');
    tableBtn?.classList.remove('active-view');
    gridBtn?.classList.add('active-view');
  }
}

function renderDocumentsDataTable() {
  let docs = [...state.allDocuments];
  if (state.docFilters.location) {
    docs = docs.filter(d => d.storage_id === state.docFilters.location);
  }

  // Destroy existing DataTable instance if exists
  if (state.docDataTable && $.fn.DataTable.isDataTable('#documentsDataTable')) {
    state.docDataTable.destroy();
  }

  const tableBody = document.querySelector('#documentsDataTable tbody');
  if (!tableBody) return;

  tableBody.innerHTML = docs.map(d => {
    const icon = getFileIconHtml(d.ext);
    const escapedPath = escapeJsString(d.full_path);
    const escapedName = escapeJsString(d.name);

    return `<tr>
      <td style="text-align:center;width:40px;">${icon}</td>
      <td>
        <span class="td-name font-mono" style="cursor:pointer;color:var(--accent-cyan);" onclick="previewDocument('${escapedPath}','${escapedName}','${d.ext}')">
          ${escapeHtml(d.name)}
        </span>
      </td>
      <td>
        <div class="td-name">${escapeHtml(d.customer_name)}</div>
        <div class="text-muted text-sm font-mono">${escapeHtml(d.folder)}</div>
      </td>
      <td><span class="badge badge-cyan"><i class="fa-solid fa-hard-drive"></i> ${escapeHtml(d.storage_name)}</span></td>
      <td class="font-mono td-mono">${d.size_formatted}</td>
      <td class="font-mono text-muted text-sm">${d.modified_date}</td>
      <td>
        <div class="action-btns">
          <button class="btn btn-xs btn-secondary" onclick="previewDocument('${escapedPath}','${escapedName}','${d.ext}')" title="Preview / View"><i class="fa-solid fa-eye"></i></button>
          <button class="btn btn-xs btn-secondary" onclick="downloadDocument('${escapedPath}')" title="Download"><i class="fa-solid fa-download"></i></button>
          <button class="btn btn-xs btn-secondary" onclick="openRenameDocModal('${escapedPath}','${escapedName}')" title="Rename"><i class="fa-solid fa-pen-to-square"></i></button>
          <button class="btn btn-xs btn-danger" onclick="deleteDocument('${escapedPath}','${escapedName}')" title="Delete"><i class="fa-solid fa-trash"></i></button>
        </div>
      </td>
    </tr>`;
  }).join('');

  // Re-initialize DataTable with search, sort, and pagination
  if (window.jQuery && $.fn.DataTable) {
    state.docDataTable = $('#documentsDataTable').DataTable({
      pageLength: 25,
      lengthMenu: [10, 25, 50, 100],
      order: [[5, 'desc']], // sort by modified date desc
      language: {
        search: "_INPUT_",
        searchPlaceholder: "Search any document, customer, location...",
        lengthMenu: "Show _MENU_ entries"
      }
    });
  }
}

function renderDocumentsFolderGrid() {
  const el = document.getElementById('documents-grid');
  if (!el) return;

  let folders = [...state.folders];
  if (state.docFilters.location) {
    folders = folders.filter(f => f.storage_id === state.docFilters.location);
  }

  if (!folders.length) {
    el.innerHTML = emptyState('No customer folders found in scanned directories');
    return;
  }

  el.innerHTML = folders.map(f => {
    const cust = state.customers.find(c => c.folder_name === f.folder) || null;
    const docs = f.files || [];
    const docHtml = docs.map(d => {
      const ext = d.split('.').pop().toLowerCase();
      const icon = getFileIconHtml(ext);
      const fullPath = f.full_path ? (f.full_path + '\\' + d) : '';
      const escapedPath = escapeJsString(fullPath);
      const escapedName = escapeJsString(d);

      return `<div class="doc-item" title="${escapeHtml(d)}">
        <div class="doc-icon" onclick="previewDocument('${escapedPath}','${escapedName}','${ext}')" style="cursor:pointer;">${icon}</div>
        <div class="doc-name" onclick="previewDocument('${escapedPath}','${escapedName}','${ext}')" style="cursor:pointer;">${escapeHtml(d)}</div>
        <div class="flex items-center justify-center gap-2 mt-4">
          <button class="btn btn-xs btn-secondary" onclick="openRenameDocModal('${escapedPath}','${escapedName}')" title="Rename"><i class="fa-solid fa-pen-to-square"></i></button>
          <button class="btn btn-xs btn-secondary" onclick="downloadDocument('${escapedPath}')" title="Download"><i class="fa-solid fa-download"></i></button>
          <button class="btn btn-xs btn-danger" onclick="deleteDocument('${escapedPath}','${escapedName}')" title="Delete"><i class="fa-solid fa-trash"></i></button>
        </div>
      </div>`;
    }).join('');

    return `<div class="card mb-4">
      <div class="card-header">
        <div class="flex items-center gap-3">
          <div style="width:38px;height:38px;background:linear-gradient(135deg,#00d4ff,#a855f7);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:16px;">
            <i class="fa-solid fa-folder"></i>
          </div>
          <div>
            <h3 style="font-size:14px;">${escapeHtml(f.folder)}</h3>
            <p class="text-muted text-sm">${f.count} file${f.count!==1?'s':''} &bull; Location: <span class="badge badge-cyan"><i class="fa-solid fa-hard-drive"></i> ${escapeHtml(f.storage_name || 'Storage')}</span></p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          ${cust ? `<span class="badge badge-active"><i class="fa-solid fa-check"></i> Registered</span>` : `<span class="badge badge-inactive">Unlinked</span>`}
          <button class="btn btn-xs btn-primary" onclick="openUploadDocModal('${cust ? cust.id : ''}')"><i class="fa-solid fa-upload"></i> Upload</button>
        </div>
      </div>
      ${docs.length ? `<div class="card-body"><div class="docs-grid">${docHtml}</div></div>` : ''}
    </div>`;
  }).join('');
}

function filterDocumentsByLocation() {
  const sel = document.getElementById('filterDocLocation');
  state.docFilters.location = sel?.value || '';
  renderDocumentsDataTable();
  renderDocumentsFolderGrid();
}

// ── DOCUMENT MODALS & ACTIONS ────────────────────────────────
function initDocumentForms() {
  // Upload Document Form
  const uploadForm = document.getElementById('uploadDocForm');
  uploadForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(uploadForm);
    toast('Uploading document...', 'info');

    try {
      const res = await fetch(`${API}?resource=documents&action=upload`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();

      if (data.success) {
        toast(data.message, 'success');
        closeModal('uploadDocModal');
        uploadForm.reset();
        await loadDocuments();
        if (state.selectedCustomer) viewCustomer(state.selectedCustomer.id);
      } else {
        toast(data.message || 'Upload failed', 'error');
      }
    } catch(err) {
      toast('Upload failed to complete', 'error');
    }
  });

  // Rename Document Form
  const renameForm = document.getElementById('renameDocForm');
  renameForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(renameForm));
    toast('Renaming document...', 'info');

    const res = await apiPost('documents', {
      path: data.path,
      new_name: data.new_name
    }, 'rename');

    if (res.success) {
      toast(res.message, 'success');
      closeModal('renameDocModal');
      await loadDocuments();
      if (state.selectedCustomer) viewCustomer(state.selectedCustomer.id);
    } else {
      toast(res.message || 'Rename failed', 'error');
    }
  });
}

function openUploadDocModal(prefillCustomerId = '') {
  const form = document.getElementById('uploadDocForm');
  form?.reset();

  const custSelect = document.getElementById('uploadDocCustomerSelect');
  if (custSelect) {
    custSelect.innerHTML = '<option value="">— Select Customer —</option>' +
      state.customers.map(c =>
        `<option value="${c.id}" ${c.id === prefillCustomerId ? 'selected' : ''}>${escapeHtml(c.name)} (${escapeHtml(c.folder_name)})</option>`
      ).join('') +
      '<option value="__custom__">+ Enter Custom Folder Name</option>';

    custSelect.onchange = () => {
      const isCustom = custSelect.value === '__custom__';
      document.getElementById('uploadCustomFolderGroup').style.display = isCustom ? 'block' : 'none';
    };
  }

  document.getElementById('uploadCustomFolderGroup').style.display = 'none';
  openModal('uploadDocModal');
}

function previewDocument(path, name, ext) {
  const modal = document.getElementById('docPreviewModal');
  const title = document.getElementById('docPreviewTitle');
  const content = document.getElementById('docPreviewContent');
  const downloadBtn = document.getElementById('docPreviewDownloadBtn');
  const externalBtn = document.getElementById('docPreviewExternalBtn');

  if (!modal || !content) return;

  const viewUrl = `${API}?resource=documents&action=view&path=${encodeURIComponent(path)}`;
  const downloadUrl = `${API}?resource=documents&action=download&path=${encodeURIComponent(path)}`;

  if (title) title.innerHTML = `<i class="fa-solid fa-file"></i> ${escapeHtml(name)}`;
  if (downloadBtn) downloadBtn.href = downloadUrl;
  if (externalBtn) externalBtn.href = viewUrl;

  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
  if (imageExts.includes(ext.toLowerCase())) {
    content.innerHTML = `<img src="${viewUrl}" alt="${escapeHtml(name)}">`;
  } else if (ext.toLowerCase() === 'pdf') {
    content.innerHTML = `<iframe src="${viewUrl}#toolbar=1" title="${escapeHtml(name)}"></iframe>`;
  } else {
    content.innerHTML = `
      <div style="text-align:center;padding:40px;">
        <div style="font-size:48px;margin-bottom:16px;">${getFileIconHtml(ext)}</div>
        <h3>${escapeHtml(name)}</h3>
        <p class="text-muted mt-4">Preview not available for this file type.</p>
        <a href="${downloadUrl}" class="btn btn-primary mt-4"><i class="fa-solid fa-download"></i> Download File</a>
      </div>
    `;
  }

  openModal('docPreviewModal');
}

function downloadDocument(path) {
  const downloadUrl = `${API}?resource=documents&action=download&path=${encodeURIComponent(path)}`;
  window.open(downloadUrl, '_blank');
}

function openRenameDocModal(path, currentName) {
  const form = document.getElementById('renameDocForm');
  if (!form) return;
  form.reset();

  document.getElementById('renameDocPath').value = path;
  document.getElementById('renameDocOldName').value = currentName;
  document.getElementById('renameDocNewName').value = currentName;

  openModal('renameDocModal');
}

async function deleteDocument(path, name) {
  if (!confirm(`Are you sure you want to delete "${name}"? This file will be permanently removed from disk.`)) {
    return;
  }

  toast('Deleting document...', 'info');
  const res = await apiPost('documents', { path }, 'delete');

  if (res.success) {
    toast(res.message, 'success');
    await loadDocuments();
    if (state.selectedCustomer) viewCustomer(state.selectedCustomer.id);
  } else {
    toast(res.message || 'Delete failed', 'error');
  }
}

// ══════════════════════════════════════════════════════════════
// REPORTS
// ══════════════════════════════════════════════════════════════
async function loadReports() {
  try {
    const [statsRes, sesRes] = await Promise.all([
      apiGet('stats'),
      apiGet('sessions')
    ]);
    const s = statsRes;
    const sessions = sesRes.data || [];

    const monthly = s.monthly_revenue || {};
    const reportsEl = document.getElementById('monthly-chart-container');
    if (reportsEl && window.Chart) {
      reportsEl.innerHTML = '<canvas id="monthlyChart"></canvas>';
      const canvas = document.getElementById('monthlyChart');
      new Chart(canvas, {
        type: 'bar',
        data: {
          labels: Object.keys(monthly),
          datasets: [{
            label: 'Revenue',
            data: Object.values(monthly),
            backgroundColor: 'rgba(168,85,247,0.3)',
            borderColor: '#a855f7',
            borderWidth: 2,
            borderRadius: 6
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { labels: { color: '#8b9dc3' } } },
          scales: {
            x: { ticks: { color: '#8b9dc3' }, grid: { color: 'rgba(255,255,255,0.05)' } },
            y: { ticks: { color: '#8b9dc3' }, grid: { color: 'rgba(255,255,255,0.05)' } }
          }
        }
      });
    }

    const svcCount = {};
    sessions.forEach(s => { svcCount[s.service||'Other'] = (svcCount[s.service||'Other']||0) + 1; });
    const svcEl = document.getElementById('service-breakdown');
    if (svcEl) {
      svcEl.innerHTML = Object.entries(svcCount).sort((a,b)=>b[1]-a[1]).map(([svc,cnt]) =>
        `<div class="flex items-center gap-2 mb-4" style="padding:8px 0;border-bottom:1px solid var(--border);">
          <span class="badge badge-cyan">${escapeHtml(svc)}</span>
          <div style="flex:1;background:rgba(0,212,255,0.1);height:6px;border-radius:3px;overflow:hidden;">
            <div style="width:${(cnt/sessions.length*100).toFixed(0)}%;height:100%;background:linear-gradient(90deg,#00d4ff,#a855f7);border-radius:3px;"></div>
          </div>
          <span class="text-muted text-sm font-mono">${cnt}</span>
        </div>`
      ).join('') || '<p class="text-muted text-sm">No data</p>';
    }

  } catch(e) {
    toast('Failed to load reports', 'error');
  }
}

// ══════════════════════════════════════════════════════════════
// SYSTEM MANAGER & SETTINGS
// ══════════════════════════════════════════════════════════════
async function loadSettings() {
  await loadSettingsData();
  populateGeneralSettingsForm();
  populateSmtpSettingsForm();
  renderStorageDirectories();
  loadSystemInfo();
}

function switchSettingsTab(tabName) {
  document.querySelectorAll('.settings-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.tab === tabName);
  });
  document.querySelectorAll('.settings-section').forEach(s => {
    s.classList.toggle('active', s.id === `tab-${tabName}`);
  });
  if (tabName === 'system') loadSystemInfo();
}

function populateGeneralSettingsForm() {
  const g = state.settings?.general;
  if (!g) return;
  const form = document.getElementById('generalSettingsForm');
  if (!form) return;

  form.site_title.value       = g.site_title || '';
  form.tagline.value          = g.tagline || '';
  form.owner_name.value       = g.owner_name || '';
  form.currency_symbol.value  = g.currency_symbol || '₹';
  form.phone.value            = g.phone || '';
  form.email.value            = g.email || '';
  form.address.value          = g.address || '';
  form.logo_type.value        = g.logo_type || 'icon';
  form.logo_icon.value        = g.logo_icon || 'fa-solid fa-desktop';
  form.logo_url.value         = g.logo_url || '';

  const isImg = g.logo_type === 'image';
  document.getElementById('logoIconGroup')?.classList.toggle('hidden', isImg);
  document.getElementById('logoUrlGroup')?.classList.toggle('hidden', !isImg);
}

function populateSmtpSettingsForm() {
  const s = state.settings?.smtp;
  if (!s) return;
  const form = document.getElementById('smtpSettingsForm');
  if (!form) return;

  form.host.value       = s.host || '';
  form.port.value       = s.port || 587;
  form.encryption.value = s.encryption || 'tls';
  form.enabled.value    = s.enabled ? 'true' : 'false';
  form.username.value   = s.username || '';
  form.password.value   = s.password || '';
  form.from_email.value = s.from_email || '';
  form.from_name.value  = s.from_name || '';
}

function renderStorageDirectories() {
  const container = document.getElementById('storage-directories-list');
  if (!container) return;

  const dirs = state.settings?.storage?.directories || [];
  if (!dirs.length) {
    container.innerHTML = emptyState('No storage directories configured');
    return;
  }

  container.innerHTML = dirs.map(d => {
    const isDef = d.is_default;
    const isActive = d.is_active !== false;

    return `
      <div class="directory-card ${isDef ? 'is-default' : ''}">
        <div class="dir-info">
          <h4>
            <span>${escapeHtml(d.name)}</span>
            ${isDef ? '<span class="badge badge-cyan"><i class="fa-solid fa-star"></i> Default Location</span>' : ''}
            <span class="badge badge-${isActive ? 'active' : 'inactive'}">${isActive ? 'Active' : 'Inactive'}</span>
          </h4>
          <p><i class="fa-solid fa-folder"></i> ${escapeHtml(d.path)}</p>
        </div>
        <div class="flex items-center gap-2">
          ${!isDef ? `
            <button class="btn btn-xs btn-secondary" onclick="setDefaultDirectory('${d.id}')"><i class="fa-solid fa-star"></i> Set Default</button>
            <button class="btn btn-xs btn-secondary" onclick="toggleDirectoryStatus('${d.id}')">${isActive ? '<i class="fa-solid fa-pause"></i> Deactivate' : '<i class="fa-solid fa-play"></i> Activate'}</button>
            <button class="btn btn-xs btn-danger" onclick="removeDirectory('${d.id}')" title="Delete"><i class="fa-solid fa-trash"></i></button>
          ` : `
            <span class="text-muted text-sm font-mono"><i class="fa-solid fa-shield"></i> Primary Storage</span>
          `}
        </div>
      </div>
    `;
  }).join('');
}

function initSettingsForms() {
  const genForm = document.getElementById('generalSettingsForm');
  genForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(genForm));
    const res = await apiPost('settings', { general: data });
    if (res.success) {
      toast('Branding settings saved!', 'success');
      state.settings = res.data;
      applySettings(res.data);
    } else {
      toast(res.message || 'Save failed', 'error');
    }
  });

  const smtpForm = document.getElementById('smtpSettingsForm');
  smtpForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const raw = Object.fromEntries(new FormData(smtpForm));
    const data = {
      ...raw,
      port: parseInt(raw.port) || 587,
      enabled: raw.enabled === 'true'
    };
    const res = await apiPost('settings', { smtp: data });
    if (res.success) {
      toast('SMTP settings saved!', 'success');
      state.settings = res.data;
    } else {
      toast(res.message || 'Save failed', 'error');
    }
  });
}

async function testSmtpConnection() {
  const form = document.getElementById('smtpSettingsForm');
  if (!form) return;
  const raw = Object.fromEntries(new FormData(form));
  toast('Testing SMTP connection...', 'info');

  try {
    const res = await apiPost('settings', {
      host: raw.host,
      port: parseInt(raw.port) || 587,
      encryption: raw.encryption
    }, 'test_smtp');

    if (res.success) {
      toast(res.message, 'success');
    } else {
      toast(res.message, 'error');
    }
  } catch(e) {
    toast('SMTP test failed to execute', 'error');
  }
}

// ── DYNAMIC DIRECTORIES ACTIONS ──────────────────────────────
function initDirectoryForm() {
  const form = document.getElementById('directoryForm');
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    const res = await apiPost('settings', {
      name: data.name,
      path: data.path,
      is_default: !!data.is_default
    }, 'add_directory');

    if (res.success) {
      toast('Storage location added!', 'success');
      closeModal('directoryModal');
      form.reset();
      document.getElementById('dirTestResult').textContent = '';
      await loadSettings();
    } else {
      toast(res.message || 'Failed to add directory', 'error');
    }
  });
}

function openDirectoryModal() {
  const form = document.getElementById('directoryForm');
  form?.reset();
  document.getElementById('dirTestResult').textContent = '';
  openModal('directoryModal');
}

async function testDirectoryPath() {
  const pathInp = document.getElementById('dirPathInput');
  const resultEl = document.getElementById('dirTestResult');
  const path = pathInp?.value.trim();

  if (!path) {
    if (resultEl) resultEl.innerHTML = '<span style="color:var(--accent-red)"><i class="fa-solid fa-circle-xmark"></i> Enter a path</span>';
    return;
  }

  if (resultEl) resultEl.innerHTML = '<span class="text-muted"><i class="fa-solid fa-spinner fa-spin"></i> Testing...</span>';
  const res = await apiPost('settings', { path }, 'test_directory');

  if (res.success) {
    if (resultEl) resultEl.innerHTML = `<span style="color:var(--accent-green)"><i class="fa-solid fa-circle-check"></i> ${escapeHtml(res.message)}</span>`;
  } else {
    if (resultEl) resultEl.innerHTML = `<span style="color:var(--accent-red)"><i class="fa-solid fa-circle-xmark"></i> ${escapeHtml(res.message)}</span>`;
  }
}

async function setDefaultDirectory(id) {
  const res = await apiPost('settings', { id }, 'set_default_directory');
  if (res.success) {
    toast('Default storage directory updated', 'success');
    await loadSettings();
  } else {
    toast(res.message, 'error');
  }
}

async function toggleDirectoryStatus(id) {
  const res = await apiPost('settings', { id }, 'toggle_directory_status');
  if (res.success) {
    toast('Directory status updated', 'success');
    await loadSettings();
  } else {
    toast(res.message, 'error');
  }
}

async function removeDirectory(id) {
  if (!confirm('Remove this storage location? Existing files will not be deleted.')) return;
  const res = await apiPost('settings', { id }, 'remove_directory');
  if (res.success) {
    toast('Storage location removed', 'success');
    await loadSettings();
  } else {
    toast(res.message, 'error');
  }
}

// ── SYSTEM INFO ──────────────────────────────────────────────
async function loadSystemInfo() {
  const container = document.getElementById('system-info-content');
  if (!container) return;

  try {
    const res = await apiGet('system_info');
    if (res.success) {
      const d = res;
      const diskHtml = (d.storage_disks || []).map(dk => `
        <div style="background:var(--bg-input);padding:12px;border-radius:8px;margin-bottom:8px;border:1px solid var(--border);">
          <div class="flex items-center justify-between">
            <strong><i class="fa-solid fa-hard-drive"></i> ${escapeHtml(dk.name)}</strong>
            <span class="badge ${dk.exists ? 'badge-active' : 'badge-inactive'}">${dk.exists ? '<i class="fa-solid fa-check"></i> Online' : '<i class="fa-solid fa-xmark"></i> Not Found'}</span>
          </div>
          <div class="font-mono text-sm text-muted mt-4">${escapeHtml(dk.path)}</div>
          ${dk.exists ? `<div class="text-sm mt-4">Free: <strong>${dk.free_gb} GB</strong> / Total: ${dk.total_gb} GB</div>` : ''}
        </div>
      `).join('');

      container.innerHTML = `
        <div class="detail-grid mb-4">
          <div class="detail-field"><label>PHP Version</label><p class="font-mono">${escapeHtml(d.php_version)}</p></div>
          <div class="detail-field"><label>Operating System</label><p>${escapeHtml(d.server_os)}</p></div>
          <div class="detail-field"><label>Server Software</label><p class="font-mono">${escapeHtml(d.server_soft)}</p></div>
          <div class="detail-field"><label>Memory Limit</label><p class="font-mono">${escapeHtml(d.memory_limit)}</p></div>
        </div>
        <h4 style="font-size:13px;font-weight:700;margin-bottom:10px;"><i class="fa-solid fa-database"></i> Storage Drive Health & Free Space</h4>
        ${diskHtml}
      `;
    }
  } catch(e) {
    container.innerHTML = '<p class="text-muted">Failed to load system diagnostics</p>';
  }
}

// ══════════════════════════════════════════════════════════════
// MODAL HELPERS
// ══════════════════════════════════════════════════════════════
function openModal(id)  { document.getElementById(id)?.classList.add('open'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('open'); }

document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('open');
  }
});

// ══════════════════════════════════════════════════════════════
// TOAST
// ══════════════════════════════════════════════════════════════
function toast(msg, type = 'info') {
  const icons = {
    success: '<i class="fa-solid fa-circle-check"></i>',
    error:   '<i class="fa-solid fa-circle-xmark"></i>',
    info:    '<i class="fa-solid fa-circle-info"></i>',
    warning: '<i class="fa-solid fa-triangle-exclamation"></i>'
  };
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span class="toast-icon">${icons[type]||icons.info}</span><span>${escapeHtml(msg)}</span>`;
  container.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = '0.3s'; setTimeout(() => el.remove(), 300); }, 3500);
}

// ══════════════════════════════════════════════════════════════
// UTILITIES
// ══════════════════════════════════════════════════════════════
function showLoading(id) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = '<div class="loading-overlay"><div class="spinner"></div></div>';
}

function emptyState(msg) {
  return `<div class="empty-state"><div class="icon"><i class="fa-solid fa-inbox"></i></div><p>${escapeHtml(msg)}</p></div>`;
}

function initials(name) {
  return `<span style="display:inline-flex;width:28px;height:28px;border-radius:7px;background:linear-gradient(135deg,#00d4ff,#a855f7);align-items:center;justify-content:center;font-size:11px;font-weight:700;margin-right:6px;">${name.charAt(0)}</span>`;
}

function fmtDate(d) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
  } catch { return d; }
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeJsString(str) {
  if (!str) return '';
  return String(str).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"');
}

function getFileIconHtml(ext) {
  switch (ext) {
    case 'pdf':
      return '<i class="fa-solid fa-file-pdf" style="color:#ef4444;font-size:24px;"></i>';
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'webp':
      return '<i class="fa-solid fa-file-image" style="color:#3b82f6;font-size:24px;"></i>';
    case 'doc':
    case 'docx':
      return '<i class="fa-solid fa-file-word" style="color:#2563eb;font-size:24px;"></i>';
    case 'xls':
    case 'xlsx':
    case 'csv':
      return '<i class="fa-solid fa-file-excel" style="color:#10b981;font-size:24px;"></i>';
    default:
      return '<i class="fa-solid fa-file-lines" style="color:#a855f7;font-size:24px;"></i>';
  }
}
