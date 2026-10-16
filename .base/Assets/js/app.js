/**
 * Internet Cafe Diary — Frontend Application JS
 * Handles: Navigation, CRUD Calls, Rendering, Charts, Toasts
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
  stats: {},
  selectedCustomer: null,
  filters: { search: '', year: '', status: '' },
  sesFilters: { search: '', year: '', date: '' },
  chart: null
};

// ══════════════════════════════════════════════════════════════
// INIT
// ══════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  updateClock();
  setInterval(updateClock, 1000);
  navigateTo('dashboard');

  // Nav clicks
  document.querySelectorAll('.nav-item').forEach(el => {
    el.addEventListener('click', () => navigateTo(el.dataset.page));
  });

  // Header search
  document.getElementById('headerSearch')?.addEventListener('input', (e) => {
    const q = e.target.value.trim();
    if (state.page === 'customers') {
      state.filters.search = q;
      renderCustomers();
    }
  });

  // Mobile sidebar toggle
  document.getElementById('menuToggle')?.addEventListener('click', () => {
    document.querySelector('.sidebar')?.classList.toggle('open');
  });

  initCustomerForm();
  initSessionForm();
  initFilters();
});

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

  document.querySelector('.header-title').textContent =
    { dashboard: '🖥️ Internet Cafe Diary', customers: '👥 Customers', sessions: '⏱️ Sessions', documents: '📁 Documents', reports: '📊 Reports' }[page] || 'Dashboard';

  if (page === 'dashboard')  loadDashboard();
  if (page === 'customers')  loadCustomers();
  if (page === 'sessions')   loadSessions();
  if (page === 'documents')  loadDocuments();
  if (page === 'reports')    loadReports();
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

async function apiPost(resource, body) {
  const res = await fetch(`${API}?resource=${resource}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  });
  return res.json();
}

async function apiPut(resource, id, body) {
  const res = await fetch(`${API}?resource=${resource}&id=${id}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
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
  } catch(e) {
    toast('Failed to load dashboard data', 'error');
  }
}

function renderDashStats(s) {
  const el = document.getElementById('dash-stats');
  if (!el) return;
  el.innerHTML = `
    <div class="stat-card cyan">
      <div class="stat-icon">👥</div>
      <div class="stat-label">Total Customers</div>
      <div class="stat-value">${s.total_customers ?? 0}</div>
      <div class="stat-sub">${s.active_customers ?? 0} active</div>
    </div>
    <div class="stat-card purple">
      <div class="stat-icon">⏱️</div>
      <div class="stat-label">Total Sessions</div>
      <div class="stat-value">${s.total_sessions ?? 0}</div>
      <div class="stat-sub">${s.today_sessions ?? 0} today</div>
    </div>
    <div class="stat-card green">
      <div class="stat-icon">💰</div>
      <div class="stat-label">Today's Revenue</div>
      <div class="stat-value">₹${(s.today_revenue ?? 0).toFixed(0)}</div>
      <div class="stat-sub">Year: ₹${(s.year_revenue ?? 0).toFixed(0)}</div>
    </div>
    <div class="stat-card orange">
      <div class="stat-icon">📈</div>
      <div class="stat-label">Total Revenue</div>
      <div class="stat-value">₹${(s.total_revenue ?? 0).toFixed(0)}</div>
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
      <td class="td-name">${initials(c.name)} ${c.name}</td>
      <td class="td-mono">${c.phone||'—'}</td>
      <td class="td-mono">${fmtDate(c.created_date)}</td>
      <td><span class="badge badge-${c.status==='active'?'active':'inactive'}">${c.status}</span></td>
      <td><button class="btn btn-sm btn-secondary" onclick="viewCustomer('${c.id}')">View</button></td>
    </tr>`).join('')}</tbody>
  </table></div>`;
}

function renderRecentSessions() {
  const el = document.getElementById('dash-recent-sessions');
  if (!el) return;
  const recent = [...state.sessions].slice(0, 5);
  if (!recent.length) { el.innerHTML = emptyState('No sessions recorded'); return; }
  el.innerHTML = `<div class="table-wrap"><table>
    <thead><tr><th>Customer</th><th>Date</th><th>Service</th><th>Time</th><th>Amount</th></tr></thead>
    <tbody>${recent.map(s => `<tr>
      <td class="td-name">${s.customer_name}</td>
      <td class="td-mono">${fmtDate(s.date)}</td>
      <td><span class="badge badge-cyan">${s.service||'—'}</span></td>
      <td class="td-mono">${s.start_time||''}${s.end_time?' → '+s.end_time:''}</td>
      <td class="td-mono text-right">₹${s.amount||0}</td>
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

  // Sort A-Z
  list.sort((a,b) => a.name.localeCompare(b.name));

  if (!list.length) { el.innerHTML = emptyState('No customers found'); return; }

  el.innerHTML = `<div class="table-wrap"><table>
    <thead><tr>
      <th>#</th>
      <th>Name</th>
      <th>Phone</th>
      <th>Aadhar</th>
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
            <div class="td-name" style="font-size:13px;">${c.name}</div>
            <div class="text-muted text-sm">${c.folder_name}</div>
          </div>
        </div>
      </td>
      <td class="td-mono">${c.phone||'—'}</td>
      <td class="td-mono">${c.aadhar||'—'}</td>
      <td><span class="badge badge-purple">${c.created_year||'—'}</span></td>
      <td><span class="badge badge-orange">${(c.documents||[]).length} files</span></td>
      <td><span class="badge badge-${c.status==='active'?'active':'inactive'}">${c.status}</span></td>
      <td>
        <div class="action-btns">
          <button class="btn btn-xs btn-secondary" onclick="viewCustomer('${c.id}')" title="View">👁</button>
          <button class="btn btn-xs btn-secondary" onclick="editCustomer('${c.id}')" title="Edit">✏️</button>
          <button class="btn btn-xs btn-danger"    onclick="deleteCustomer('${c.id}','${c.name}')" title="Delete">🗑</button>
        </div>
      </td>
    </tr>`).join('')}</tbody>
  </table></div>`;
}

// ── Customer Filters ─────────────────────────────────────────
function initFilters() {
  document.getElementById('filterYear')?.addEventListener('change', e => {
    state.filters.year = e.target.value;
    if (state.page === 'customers') loadCustomers();
  });
  document.getElementById('filterStatus')?.addEventListener('change', e => {
    state.filters.status = e.target.value;
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

// ── View Customer Detail ─────────────────────────────────────
async function viewCustomer(id) {
  const c = state.customers.find(x => x.id === id);
  if (!c) return;
  state.selectedCustomer = c;
  navigateTo('customers');

  // Show detail panel
  document.getElementById('customers-list-view').classList.add('hidden');
  document.getElementById('customers-detail-view').classList.remove('hidden');

  const docs = (c.documents||[]).map(d => {
    const ext  = d.split('.').pop().toLowerCase();
    const icon = { pdf:'📄', jpg:'🖼️', jpeg:'🖼️', png:'🖼️', doc:'📝', docx:'📝', xlsx:'📊', xls:'📊' }[ext] || '📎';
    return `<div class="doc-item" title="${d}">
      <div class="doc-icon">${icon}</div>
      <div class="doc-name">${d}</div>
    </div>`;
  }).join('');

  const visits = (c.visits||[]).map(v => `<tr>
    <td class="td-mono">${fmtDate(v.date)}</td>
    <td><span class="badge badge-cyan">${v.service||'—'}</span></td>
    <td class="td-mono">₹${v.amount||0}</td>
    <td class="text-muted">${v.duration||'—'}</td>
  </tr>`).join('');

  document.getElementById('customer-detail-content').innerHTML = `
    <div class="detail-header">
      <div class="detail-avatar">${c.name.charAt(0)}</div>
      <div class="detail-info">
        <h2>${c.name}</h2>
        <p>ID: ${c.id} &nbsp;|&nbsp; Folder: ${c.folder_name}</p>
        <div class="flex gap-2 mt-4">
          <span class="badge badge-${c.status==='active'?'active':'inactive'}">${c.status}</span>
          <span class="badge badge-purple">${c.created_year||'—'}</span>
        </div>
      </div>
      <div style="margin-left:auto;">
        <button class="btn btn-primary btn-sm" onclick="openSessionModal('${c.id}','${c.name}')">➕ Add Session</button>
        <button class="btn btn-secondary btn-sm mt-4" onclick="editCustomer('${c.id}')">✏️ Edit</button>
      </div>
    </div>
    <div class="detail-grid mb-4">
      <div class="detail-field"><label>Phone</label><p>${c.phone||'—'}</p></div>
      <div class="detail-field"><label>Aadhar</label><p class="font-mono">${c.aadhar||'—'}</p></div>
      <div class="detail-field"><label>Address</label><p>${c.address||'—'}</p></div>
      <div class="detail-field"><label>Registered Date</label><p class="font-mono">${fmtDate(c.created_date)}</p></div>
      ${c.notes ? `<div class="detail-field" style="grid-column:1/-1"><label>Notes</label><p>${c.notes}</p></div>` : ''}
    </div>
    <div class="card mb-4">
      <div class="card-header"><h3>📁 Documents (${(c.documents||[]).length})</h3>
        <small class="text-muted">Folder: <code>${c.folder_name}</code></small>
      </div>
      <div class="card-body">
        ${docs ? `<div class="docs-grid">${docs}</div>` : '<p class="text-muted text-sm">No documents stored</p>'}
      </div>
    </div>
    <div class="card">
      <div class="card-header"><h3>⏱️ Visit History (${(c.visits||[]).length})</h3></div>
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

// ── CUSTOMER FORM ────────────────────────────────────────────
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

  if (editId) {
    const c = state.customers.find(x => x.id === editId);
    if (!c) return;
    form.dataset.editId = editId;
    title.textContent   = '✏️ Edit Customer';
    form.name.value    = c.name;
    form.phone.value   = c.phone   || '';
    form.address.value = c.address || '';
    form.aadhar.value  = c.aadhar  || '';
    form.status.value  = c.status  || 'active';
    form.notes.value   = c.notes   || '';
  } else {
    title.textContent = '➕ Add New Customer';
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

  el.innerHTML = `<div class="table-wrap"><table>
    <thead><tr>
      <th>ID</th><th>Customer</th><th>Date</th><th>Service</th>
      <th>Time</th><th>Duration</th><th>Amount</th><th>Payment</th><th>Actions</th>
    </tr></thead>
    <tbody>${list.map(s => `<tr>
      <td class="td-mono text-muted" style="font-size:11px;">${s.id}</td>
      <td class="td-name">${s.customer_name}</td>
      <td class="td-mono">${fmtDate(s.date)}</td>
      <td><span class="badge badge-cyan">${s.service||'—'}</span></td>
      <td class="td-mono">${s.start_time||''}${s.end_time?' → '+s.end_time:''}</td>
      <td class="text-muted">${s.duration_min||0} min</td>
      <td class="td-mono"><strong>₹${s.amount||0}</strong></td>
      <td><span class="badge badge-${s.payment_mode==='cash'?'active':'purple'}">${s.payment_mode||'cash'}</span></td>
      <td>
        <button class="btn btn-xs btn-danger" onclick="deleteSession('${s.id}')">🗑</button>
      </td>
    </tr>`).join('')}</tbody>
  </table></div>`;
}

function initSessionForm() {
  // Populate customer select when modal opens
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

  // Populate customer dropdown
  const sel = form.querySelector('[name="customer_id"]');
  sel.innerHTML = state.customers.map(c =>
    `<option value="${c.id}" ${c.id===custId?'selected':''}>${c.name}</option>`
  ).join('');

  const nameSel = form.querySelector('[name="customer_name"]');
  if (custName) nameSel.value = custName;

  // Sync name on customer change
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
// DOCUMENTS
// ══════════════════════════════════════════════════════════════
async function loadDocuments() {
  showLoading('documents-grid');
  try {
    const [custRes, foldRes] = await Promise.all([
      apiGet('customers'),
      apiGet('folders')
    ]);

    const customers = custRes.data || [];
    const folders   = foldRes.data || [];

    const el = document.getElementById('documents-grid');
    if (!el) return;

    if (!folders.length) { el.innerHTML = emptyState('No customer folders found'); return; }

    el.innerHTML = folders.map(f => {
      const cust    = customers.find(c => c.folder_name === f.folder) || null;
      const docs    = f.files || [];
      const docHtml = docs.map(d => {
        const ext  = d.split('.').pop().toLowerCase();
        const icon = { pdf:'📄', jpg:'🖼️', jpeg:'🖼️', png:'🖼️', doc:'📝', docx:'📝', xlsx:'📊' }[ext] || '📎';
        return `<div class="doc-item" title="${d}"><div class="doc-icon">${icon}</div><div class="doc-name">${d}</div></div>`;
      }).join('');

      return `<div class="card mb-4">
        <div class="card-header">
          <div class="flex items-center gap-3">
            <div style="width:38px;height:38px;background:linear-gradient(135deg,#00d4ff,#a855f7);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:16px;">📁</div>
            <div>
              <h3 style="font-size:14px;">${f.folder}</h3>
              <p class="text-muted text-sm">${f.count} file${f.count!==1?'s':''}</p>
            </div>
          </div>
          ${cust ? `<span class="badge badge-active">Registered</span>` : `<span class="badge badge-inactive">Not in DB</span>`}
        </div>
        ${docs.length ? `<div class="card-body"><div class="docs-grid">${docHtml}</div></div>` : ''}
      </div>`;
    }).join('');
  } catch(e) {
    toast('Failed to load documents', 'error');
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

    // Monthly chart
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
            label: 'Revenue (₹)',
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

    // Service breakdown
    const svcCount = {};
    sessions.forEach(s => { svcCount[s.service||'Other'] = (svcCount[s.service||'Other']||0) + 1; });
    const svcEl = document.getElementById('service-breakdown');
    if (svcEl) {
      svcEl.innerHTML = Object.entries(svcCount).sort((a,b)=>b[1]-a[1]).map(([svc,cnt]) =>
        `<div class="flex items-center gap-2 mb-4" style="padding:8px 0;border-bottom:1px solid var(--border);">
          <span class="badge badge-cyan">${svc}</span>
          <div style="flex:1;background:rgba(0,212,255,0.1);height:6px;border-radius:3px;overflow:hidden;">
            <div style="width:${(cnt/sessions.length*100).toFixed(0)}%;height:100%;background:linear-gradient(90deg,#00d4ff,#a855f7);border-radius:3px;"></div>
          </div>
          <span class="text-muted text-sm">${cnt}</span>
        </div>`
      ).join('') || '<p class="text-muted text-sm">No data</p>';
    }

  } catch(e) {
    toast('Failed to load reports', 'error');
  }
}

// ══════════════════════════════════════════════════════════════
// MODAL HELPERS
// ══════════════════════════════════════════════════════════════
function openModal(id)  { document.getElementById(id)?.classList.add('open'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('open'); }

// Click outside to close
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('open');
  }
});

// ══════════════════════════════════════════════════════════════
// TOAST
// ══════════════════════════════════════════════════════════════
function toast(msg, type = 'info') {
  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span class="toast-icon">${icons[type]||'ℹ️'}</span><span>${msg}</span>`;
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
  return `<div class="empty-state"><div class="icon">📭</div><p>${msg}</p></div>`;
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

// Year list helper
function getYears() {
  const current = new Date().getFullYear();
  const years = [];
  for (let y = 2020; y <= current; y++) years.push(y);
  return years;
}
