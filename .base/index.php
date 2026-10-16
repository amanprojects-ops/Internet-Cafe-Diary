<?php
/**
 * Internet Cafe Diary — Main Dashboard & System Manager
 * Place this file in: InternetCafeDiary/.base/index.php
 * Fully Offline Capable with Local Vendor Assets
 */

$shopName    = 'Internet Cafe Diary';
$ownerName   = 'Admin';
$currentYear = date('Y');
$today       = date('Y-m-d');

// Generate year options
$years = [];
for ($y = 2020; $y <= $currentYear; $y++) $years[] = $y;
?>
<!DOCTYPE html>
<html lang="hi" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="Internet Cafe Diary – Customer, Session, Documents & System Management">
  <meta name="theme-color" content="#070b14">
  <title><?= htmlspecialchars($shopName) ?> — Dashboard</title>

  <!-- Offline Local Vendor Styles -->
  <link rel="stylesheet" href="Assets/vendor/fontawesome/css/all.min.css">
  <link rel="stylesheet" href="Assets/vendor/datatables/datatables.min.css">

  <!-- Offline Local Vendor Scripts (jQuery first, then DataTables & ChartJS) -->
  <script src="Assets/vendor/jquery/jquery.min.js"></script>
  <script src="Assets/vendor/datatables/datatables.min.js"></script>
  <script src="Assets/vendor/chartjs/chart.umd.min.js"></script>

  <!-- Core Dashboard CSS -->
  <link rel="stylesheet" href="Assets/css/style.css">
</head>
<body>

<!-- ══════════════════════════════════════════════════════════════
     APP SHELL
     ══════════════════════════════════════════════════════════════ -->
<div class="app-shell">

  <!-- ── SIDEBAR ─────────────────────────────────────────────── -->
  <aside class="sidebar" id="sidebar">
    <div class="sidebar-logo">
      <div class="logo-icon" id="sidebarLogoIcon"><i class="fa-solid fa-desktop"></i></div>
      <div class="logo-text">
        <span id="sidebarShopTitle" style="font-size:13px;font-weight:700;display:block;color:var(--text-primary);letter-spacing:0;">Internet Cafe</span>
        <span id="sidebarTagline">Diary System</span>
      </div>
    </div>

    <nav class="sidebar-nav">
      <div class="nav-section-label">Main Menu</div>

      <div class="nav-item active" data-page="dashboard" id="nav-dashboard">
        <span class="nav-icon"><i class="fa-solid fa-gauge-high"></i></span>
        <span>Dashboard</span>
      </div>

      <div class="nav-item" data-page="customers" id="nav-customers">
        <span class="nav-icon"><i class="fa-solid fa-users"></i></span>
        <span>Customers</span>
        <span class="nav-badge" id="badge-customers">0</span>
      </div>

      <div class="nav-item" data-page="sessions" id="nav-sessions">
        <span class="nav-icon"><i class="fa-solid fa-clock"></i></span>
        <span>Sessions</span>
      </div>

      <div class="nav-section-label" style="margin-top:12px;">Files & Reports</div>

      <div class="nav-item" data-page="documents" id="nav-documents">
        <span class="nav-icon"><i class="fa-solid fa-folder-open"></i></span>
        <span>Documents</span>
        <span class="nav-badge" id="badge-documents">0</span>
      </div>

      <div class="nav-item" data-page="reports" id="nav-reports">
        <span class="nav-icon"><i class="fa-solid fa-chart-line"></i></span>
        <span>Reports</span>
      </div>

      <div class="nav-section-label" style="margin-top:12px;">Administration</div>

      <div class="nav-item" data-page="settings" id="nav-settings">
        <span class="nav-icon"><i class="fa-solid fa-gear"></i></span>
        <span>System Manager</span>
      </div>
    </nav>

    <div class="sidebar-footer">
      <div class="sidebar-user">
        <div class="avatar" id="sidebarUserAvatar">A</div>
        <div class="user-info">
          <div class="name" id="sidebarOwnerName"><?= htmlspecialchars($ownerName) ?></div>
          <div class="role">Administrator</div>
        </div>
      </div>
    </div>
  </aside>

  <!-- ── MAIN CONTENT ─────────────────────────────────────────── -->
  <div class="main-content">

    <!-- TOP HEADER -->
    <header class="top-header">
      <button class="btn-icon" id="menuToggle" style="display:none;" aria-label="Menu"><i class="fa-solid fa-bars"></i></button>
      <div class="header-title" id="topHeaderTitle"><i class="fa-solid fa-desktop"></i> Internet Cafe Diary</div>

      <div class="header-search">
        <span class="search-icon"><i class="fa-solid fa-magnifying-glass"></i></span>
        <input type="text" id="headerSearch" placeholder="Search customers..." autocomplete="off">
      </div>

      <div class="header-actions">
        <span class="date-display" id="dateDisplay"><?= date('D, d M Y  H:i:s') ?></span>
        <button class="btn btn-primary btn-sm" onclick="openCustomerModal()"><i class="fa-solid fa-user-plus"></i> New Customer</button>
      </div>
    </header>

    <!-- PAGE CONTENT -->
    <main class="page-content">

      <!-- ════════════════════════════════════════════════════════
           PAGE: DASHBOARD
           ════════════════════════════════════════════════════════ -->
      <section class="page active" id="page-dashboard">
        <div class="page-header">
          <h2><i class="fa-solid fa-gauge-high"></i> Dashboard <span>Overview</span></h2>
          <button class="btn btn-secondary btn-sm" onclick="loadDashboard()"><i class="fa-solid fa-arrows-rotate"></i> Refresh</button>
        </div>

        <!-- Stats -->
        <div class="stats-grid" id="dash-stats">
          <div class="loading-overlay"><div class="spinner"></div></div>
        </div>

        <!-- Two column layout -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px;">
          <!-- Recent Customers -->
          <div class="card">
            <div class="card-header">
              <h3><i class="fa-solid fa-users"></i> Recent Customers</h3>
              <button class="btn btn-secondary btn-sm" onclick="navigateTo('customers')">View All <i class="fa-solid fa-arrow-right"></i></button>
            </div>
            <div id="dash-recent-customers">
              <div class="loading-overlay"><div class="spinner"></div></div>
            </div>
          </div>

          <!-- Customers by Year Chart -->
          <div class="card">
            <div class="card-header">
              <h3><i class="fa-solid fa-calendar-days"></i> Customers by Year</h3>
            </div>
            <div class="card-body">
              <div class="chart-container">
                <canvas id="yearChart"></canvas>
              </div>
            </div>
          </div>
        </div>

        <!-- Recent Sessions -->
        <div class="card">
          <div class="card-header">
            <h3><i class="fa-solid fa-clock-rotate-left"></i> Recent Sessions</h3>
            <button class="btn btn-secondary btn-sm" onclick="navigateTo('sessions')">View All <i class="fa-solid fa-arrow-right"></i></button>
          </div>
          <div id="dash-recent-sessions">
            <div class="loading-overlay"><div class="spinner"></div></div>
          </div>
        </div>
      </section>

      <!-- ════════════════════════════════════════════════════════
           PAGE: CUSTOMERS
           ════════════════════════════════════════════════════════ -->
      <section class="page" id="page-customers">

        <!-- List View -->
        <div id="customers-list-view">
          <div class="page-header">
            <h2><i class="fa-solid fa-users"></i> Customers <span id="cust-count">(0)</span></h2>
            <button class="btn btn-primary" onclick="openCustomerModal()"><i class="fa-solid fa-user-plus"></i> Add Customer</button>
          </div>

          <!-- Filters -->
          <div class="filters-bar">
            <div class="search-wrap">
              <span class="si"><i class="fa-solid fa-magnifying-glass"></i></span>
              <input type="text" class="search-input-bar" id="custSearch" placeholder="Search by name, phone, aadhar...">
            </div>
            <select class="filter-select" id="filterYear">
              <option value="">All Years</option>
              <?php foreach($years as $y): ?>
              <option value="<?= $y ?>"><?= $y ?></option>
              <?php endforeach; ?>
            </select>
            <select class="filter-select" id="filterStatus">
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <select class="filter-select" id="filterCustomerDir">
              <option value="">All Locations</option>
            </select>
            <button class="btn btn-secondary btn-sm" onclick="loadCustomers()"><i class="fa-solid fa-arrows-rotate"></i> Refresh</button>
          </div>

          <div class="card">
            <div id="customers-table">
              <div class="loading-overlay"><div class="spinner"></div></div>
            </div>
          </div>
        </div>

        <!-- Detail View (hidden by default) -->
        <div id="customers-detail-view" class="hidden">
          <div class="page-header">
            <h2><i class="fa-solid fa-id-card"></i> Customer Detail</h2>
            <button class="btn btn-secondary btn-sm" onclick="backToCustomers()"><i class="fa-solid fa-arrow-left"></i> Back to List</button>
          </div>
          <div id="customer-detail-content"></div>
        </div>
      </section>

      <!-- ════════════════════════════════════════════════════════
           PAGE: SESSIONS
           ════════════════════════════════════════════════════════ -->
      <section class="page" id="page-sessions">
        <div class="page-header">
          <h2><i class="fa-solid fa-clock"></i> Sessions</h2>
          <button class="btn btn-primary" onclick="openSessionModal()"><i class="fa-solid fa-plus"></i> New Session</button>
        </div>

        <div class="filters-bar">
          <div class="search-wrap">
            <span class="si"><i class="fa-solid fa-magnifying-glass"></i></span>
            <input type="text" class="search-input-bar" id="sesSearch" placeholder="Search by customer name...">
          </div>
          <select class="filter-select" id="sesFilterYear">
            <option value="">All Years</option>
            <?php foreach($years as $y): ?>
            <option value="<?= $y ?>"><?= $y ?></option>
            <?php endforeach; ?>
          </select>
          <input type="date" class="filter-select" id="sesFilterDate" value="" style="cursor:pointer;">
          <button class="btn btn-secondary btn-sm" onclick="loadSessions()"><i class="fa-solid fa-arrows-rotate"></i> Refresh</button>
        </div>

        <div class="card">
          <div id="sessions-table">
            <div class="loading-overlay"><div class="spinner"></div></div>
          </div>
        </div>
      </section>

      <!-- ════════════════════════════════════════════════════════
           PAGE: DOCUMENTS (DATATABLES + CRUD)
           ════════════════════════════════════════════════════════ -->
      <section class="page" id="page-documents">
        <div class="page-header">
          <h2><i class="fa-solid fa-folder-open"></i> Documents Manager <span id="docs-total-count">(0)</span></h2>
          <div class="flex gap-2">
            <button class="btn btn-primary" onclick="openUploadDocModal()"><i class="fa-solid fa-cloud-arrow-up"></i> Upload Document</button>
            <button class="btn btn-secondary" onclick="openNewSubfolderModal()"><i class="fa-solid fa-folder-plus"></i> New Sub-Folder</button>
            <button class="btn btn-secondary btn-sm" onclick="loadDocuments()"><i class="fa-solid fa-arrows-rotate"></i> Rescan</button>
          </div>
        </div>

        <!-- View mode tabs & Location filter -->
        <div class="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div class="flex gap-2">
            <button class="btn btn-sm btn-secondary active-view" id="viewModeTableBtn" onclick="switchDocViewMode('table')">
              <i class="fa-solid fa-table-list"></i> Searchable DataTable
            </button>
            <button class="btn btn-sm btn-secondary" id="viewModeGridBtn" onclick="switchDocViewMode('grid')">
              <i class="fa-solid fa-folder-tree"></i> Customer & Sub-Folder Explorer
            </button>
          </div>
          <div class="flex gap-2">
            <select class="filter-select" id="filterDocLocation" onchange="filterDocumentsByLocation()">
              <option value="">All Storage Locations</option>
            </select>
          </div>
        </div>

        <!-- 1. DataTable View (Instant Search, Sort, Pagination with Sub-Folders) -->
        <div id="documents-table-container" class="card">
          <div class="card-body">
            <div class="table-wrap">
              <table id="documentsDataTable" class="display" style="width:100%">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Document Name</th>
                    <th>Customer / Folder</th>
                    <th>Sub-Folder</th>
                    <th>Storage Location</th>
                    <th>File Size</th>
                    <th>Modified Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody></tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- 2. Customer & Nested Sub-Folder Explorer View -->
        <div id="documents-grid-container" class="hidden">
          <!-- Interactive Breadcrumb Navigation -->
          <div class="card mb-4" style="padding:12px 18px;">
            <div class="flex items-center justify-between flex-wrap gap-2">
              <div id="folderBreadcrumbs" class="folder-breadcrumbs flex items-center gap-2 flex-wrap">
                <!-- Breadcrumb items populated by app.js -->
              </div>
              <div class="flex items-center gap-2">
                <button class="btn btn-secondary btn-xs" id="folderUpBtn" onclick="folderNavigateUp()" style="display:none;">
                  <i class="fa-solid fa-arrow-up"></i> Level Up
                </button>
                <button class="btn btn-secondary btn-xs" id="newFolderInViewBtn" onclick="openNewSubfolderModal()">
                  <i class="fa-solid fa-folder-plus"></i> New Sub-Folder
                </button>
                <button class="btn btn-primary btn-xs" id="uploadInViewBtn" onclick="openUploadDocModal()">
                  <i class="fa-solid fa-cloud-arrow-up"></i> Upload Here
                </button>
              </div>
            </div>
          </div>

          <div id="documents-grid">
            <div class="loading-overlay"><div class="spinner"></div></div>
          </div>
        </div>
      </section>

      <!-- ════════════════════════════════════════════════════════
           PAGE: REPORTS
           ════════════════════════════════════════════════════════ -->
      <section class="page" id="page-reports">
        <div class="page-header">
          <h2><i class="fa-solid fa-chart-line"></i> Reports — <?= $currentYear ?></h2>
          <button class="btn btn-secondary btn-sm" onclick="loadReports()"><i class="fa-solid fa-arrows-rotate"></i> Refresh</button>
        </div>

        <div style="display:grid;grid-template-columns:2fr 1fr;gap:20px;">
          <div class="card">
            <div class="card-header"><h3><i class="fa-solid fa-chart-column"></i> Monthly Revenue (<?= $currentYear ?>)</h3></div>
            <div class="card-body">
              <div class="chart-container" id="monthly-chart-container">
                <div class="loading-overlay"><div class="spinner"></div></div>
              </div>
            </div>
          </div>

          <div class="card">
            <div class="card-header"><h3><i class="fa-solid fa-chart-pie"></i> Services Breakdown</h3></div>
            <div class="card-body" id="service-breakdown">
              <div class="spinner"></div>
            </div>
          </div>
        </div>
      </section>

      <!-- ════════════════════════════════════════════════════════
           PAGE: SYSTEM MANAGER & SETTINGS
           ════════════════════════════════════════════════════════ -->
      <section class="page" id="page-settings">
        <div class="page-header">
          <h2><i class="fa-solid fa-gear"></i> System Manager <span>Branding, Dynamic Storage & SMTP</span></h2>
          <button class="btn btn-secondary btn-sm" onclick="loadSettings()"><i class="fa-solid fa-arrows-rotate"></i> Refresh Settings</button>
        </div>

        <div class="settings-tabs">
          <div class="settings-tab active" data-tab="general"><i class="fa-solid fa-globe"></i> Branding & Shop Info</div>
          <div class="settings-tab" data-tab="storage"><i class="fa-solid fa-hard-drive"></i> Dynamic Storage Locations</div>
          <div class="settings-tab" data-tab="smtp"><i class="fa-solid fa-envelope"></i> Email SMTP Setup</div>
          <div class="settings-tab" data-tab="system"><i class="fa-solid fa-circle-info"></i> System Status</div>
        </div>

        <!-- ── TAB 1: General Branding ────────────────────────── -->
        <div class="settings-section active" id="tab-general">
          <div class="card">
            <div class="card-header">
              <h3><i class="fa-solid fa-globe"></i> Website Branding & Cafe Profile</h3>
            </div>
            <div class="card-body">
              <form id="generalSettingsForm">
                <div class="form-row">
                  <div class="form-group">
                    <label class="form-label">Cafe / Website Name <span>*</span></label>
                    <input class="form-control" type="text" name="site_title" required placeholder="Internet Cafe Diary">
                  </div>
                  <div class="form-group">
                    <label class="form-label">Tagline / Subtitle</label>
                    <input class="form-control" type="text" name="tagline" placeholder="Customer & Cafe Management">
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label class="form-label">Owner / Admin Name</label>
                    <input class="form-control" type="text" name="owner_name" placeholder="Admin Name">
                  </div>
                  <div class="form-group">
                    <label class="form-label">Currency Symbol</label>
                    <input class="form-control" type="text" name="currency_symbol" placeholder="₹" maxlength="5">
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label class="form-label">Contact Phone</label>
                    <input class="form-control" type="tel" name="phone" placeholder="9876543210">
                  </div>
                  <div class="form-group">
                    <label class="form-label">Contact Email</label>
                    <input class="form-control" type="email" name="email" placeholder="cafe@example.com">
                  </div>
                </div>
                <div class="form-group">
                  <label class="form-label">Shop Address</label>
                  <input class="form-control" type="text" name="address" placeholder="Main Market Road...">
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label class="form-label">Logo Type</label>
                    <select class="form-control" name="logo_type" id="logoTypeSelect">
                      <option value="icon">Font Awesome Icon Class</option>
                      <option value="image">Custom Image URL</option>
                    </select>
                  </div>
                  <div class="form-group" id="logoIconGroup">
                    <label class="form-label">Icon Class (Font Awesome)</label>
                    <input class="form-control font-mono" type="text" name="logo_icon" placeholder="fa-solid fa-desktop">
                  </div>
                  <div class="form-group hidden" id="logoUrlGroup">
                    <label class="form-label">Logo Image URL</label>
                    <input class="form-control" type="url" name="logo_url" placeholder="https://.../logo.png">
                  </div>
                </div>
                <div class="mt-4">
                  <button type="submit" class="btn btn-primary"><i class="fa-solid fa-floppy-disk"></i> Save Branding Settings</button>
                </div>
              </form>
            </div>
          </div>
        </div>

        <!-- ── TAB 2: Dynamic Storage Locations ────────────────── -->
        <div class="settings-section" id="tab-storage">
          <div class="card mb-4">
            <div class="card-header">
              <div>
                <h3><i class="fa-solid fa-hard-drive"></i> Dynamic Storage Directories</h3>
                <p class="text-muted text-sm mt-4">Add and manage multiple drive locations or folders where customer files are stored.</p>
              </div>
              <button class="btn btn-primary btn-sm" onclick="openDirectoryModal()"><i class="fa-solid fa-folder-plus"></i> Add Storage Location</button>
            </div>
            <div class="card-body">
              <div id="storage-directories-list">
                <div class="loading-overlay"><div class="spinner"></div></div>
              </div>
            </div>
          </div>
        </div>

        <!-- ── TAB 3: Email SMTP Setup ──────────────────────────── -->
        <div class="settings-section" id="tab-smtp">
          <div class="card">
            <div class="card-header">
              <h3><i class="fa-solid fa-envelope"></i> Email SMTP Configuration</h3>
              <span class="badge badge-cyan"><i class="fa-solid fa-bell"></i> Notifications</span>
            </div>
            <div class="card-body">
              <form id="smtpSettingsForm">
                <div class="form-row">
                  <div class="form-group">
                    <label class="form-label">SMTP Host <span>*</span></label>
                    <input class="form-control font-mono" type="text" name="host" required placeholder="smtp.gmail.com">
                  </div>
                  <div class="form-group">
                    <label class="form-label">SMTP Port <span>*</span></label>
                    <input class="form-control font-mono" type="number" name="port" required placeholder="587">
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label class="form-label">Encryption</label>
                    <select class="form-control" name="encryption">
                      <option value="tls">TLS (Port 587)</option>
                      <option value="ssl">SSL (Port 465)</option>
                      <option value="none">None (Port 25)</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label class="form-label">SMTP Status</label>
                    <select class="form-control" name="enabled">
                      <option value="true">Enabled</option>
                      <option value="false">Disabled</option>
                    </select>
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label class="form-label">SMTP Username / Email</label>
                    <input class="form-control" type="text" name="username" placeholder="your-email@gmail.com">
                  </div>
                  <div class="form-group">
                    <label class="form-label">SMTP Password / App Password</label>
                    <input class="form-control font-mono" type="password" name="password" placeholder="••••••••••••">
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label class="form-label">From Email Address</label>
                    <input class="form-control" type="email" name="from_email" placeholder="no-reply@yourdomain.com">
                  </div>
                  <div class="form-group">
                    <label class="form-label">From Name</label>
                    <input class="form-control" type="text" name="from_name" placeholder="Internet Cafe Diary">
                  </div>
                </div>
                <div class="flex gap-2 mt-4">
                  <button type="submit" class="btn btn-primary"><i class="fa-solid fa-floppy-disk"></i> Save SMTP Settings</button>
                  <button type="button" class="btn btn-secondary" onclick="testSmtpConnection()"><i class="fa-solid fa-network-wired"></i> Test SMTP Connection</button>
                </div>
              </form>
            </div>
          </div>
        </div>

        <!-- ── TAB 4: System Information ───────────────────────── -->
        <div class="settings-section" id="tab-system">
          <div class="card mb-4">
            <div class="card-header"><h3><i class="fa-solid fa-circle-info"></i> System & Server Diagnostics</h3></div>
            <div class="card-body">
              <div id="system-info-content">
                <div class="loading-overlay"><div class="spinner"></div></div>
              </div>
            </div>
          </div>
        </div>
      </section>

    </main><!-- /page-content -->
  </div><!-- /main-content -->
</div><!-- /app-shell -->

<!-- ══════════════════════════════════════════════════════════════
     MODAL: ADD / EDIT CUSTOMER
     ══════════════════════════════════════════════════════════════ -->
<div class="modal-overlay" id="customerModal">
  <div class="modal">
    <div class="modal-header">
      <h3 id="customerModalTitle"><i class="fa-solid fa-user-plus"></i> Add New Customer</h3>
      <button class="modal-close" onclick="closeModal('customerModal')" aria-label="Close"><i class="fa-solid fa-xmark"></i></button>
    </div>
    <form id="customerForm" novalidate>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label" for="inp-name">Full Name <span>*</span></label>
          <input id="inp-name" class="form-control" type="text" name="name" placeholder="e.g. RAM KUMAR" required autocomplete="off">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="inp-phone">Phone Number</label>
            <input id="inp-phone" class="form-control" type="tel" name="phone" placeholder="10-digit number" maxlength="15">
          </div>
          <div class="form-group">
            <label class="form-label" for="inp-aadhar">Aadhar Number</label>
            <input id="inp-aadhar" class="form-control" type="text" name="aadhar" placeholder="XXXX-XXXX-XXXX" maxlength="20">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label" for="inp-address">Address</label>
          <input id="inp-address" class="form-control" type="text" name="address" placeholder="Village, Block, District...">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="inp-status">Status</label>
            <select id="inp-status" class="form-control" name="status">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="inp-storage-dir">Storage Location <span>*</span></label>
            <select id="inp-storage-dir" class="form-control" name="storage_dir_id">
              <!-- Dynamically populated from settings -->
            </select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label" for="inp-notes">Notes</label>
          <textarea id="inp-notes" class="form-control" name="notes" rows="2" placeholder="Any additional notes..."></textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="closeModal('customerModal')">Cancel</button>
        <button type="submit" class="btn btn-primary"><i class="fa-solid fa-floppy-disk"></i> Save Customer</button>
      </div>
    </form>
  </div>
</div>

<!-- ══════════════════════════════════════════════════════════════
     MODAL: UPLOAD DOCUMENT (CREATE)
     ══════════════════════════════════════════════════════════════ -->
<div class="modal-overlay" id="uploadDocModal">
  <div class="modal">
    <div class="modal-header">
      <h3><i class="fa-solid fa-cloud-arrow-up"></i> Upload New Document</h3>
      <button class="modal-close" onclick="closeModal('uploadDocModal')" aria-label="Close"><i class="fa-solid fa-xmark"></i></button>
    </div>
    <form id="uploadDocForm" enctype="multipart/form-data">
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">Assign To Customer / Folder <span>*</span></label>
          <select class="form-control" name="customer_id" id="uploadDocCustomerSelect" required onchange="onUploadCustomerChanged()">
            <option value="">— Select Customer —</option>
          </select>
        </div>
        <div class="form-group" id="uploadCustomFolderGroup" style="display:none;">
          <label class="form-label">Custom Customer Folder Name</label>
          <input class="form-control font-mono" type="text" name="folder_name" id="uploadDocCustomFolderInput" placeholder="CUSTOMER_FOLDER">
        </div>
        <div class="form-group">
          <label class="form-label">Destination Sub-Folder</label>
          <select class="form-control" id="uploadDocSubfolderSelect" onchange="onUploadSubfolderSelectChanged()">
            <option value="">📁 Root (Main Customer Directory)</option>
            <option value="__NEW__">+ Create / Enter New Sub-Folder...</option>
          </select>
          <input class="form-control font-mono mt-2" type="text" id="uploadDocCustomSubfolderInput" placeholder="e.g. 2024-2025, Aadhaar, Forms" style="display:none;margin-top:6px;">
          <input type="hidden" name="subfolder" id="uploadDocFinalSubfolder" value="">
          <small class="text-muted" style="display:block;margin-top:4px;">Upload directly into customer's sub-folder or create a new subfolder.</small>
        </div>
        <div class="form-group">
          <label class="form-label">Select File to Upload <span>*</span></label>
          <input class="form-control" type="file" name="document" required style="padding:8px;">
          <small class="text-muted" style="display:block;margin-top:4px;">Supported: PDF, JPG, PNG, DOCX, XLSX, PSD, ZIP, etc.</small>
        </div>
        <div class="form-group">
          <label class="form-label">Custom File Name (Optional)</label>
          <input class="form-control" type="text" name="custom_name" placeholder="Leave empty to use original filename">
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="closeModal('uploadDocModal')">Cancel</button>
        <button type="submit" class="btn btn-primary"><i class="fa-solid fa-cloud-arrow-up"></i> Upload File</button>
      </div>
    </form>
  </div>
</div>

<!-- ══════════════════════════════════════════════════════════════
     MODAL: CREATE NEW SUB-FOLDER
     ══════════════════════════════════════════════════════════════ -->
<div class="modal-overlay" id="newSubfolderModal">
  <div class="modal">
    <div class="modal-header">
      <h3><i class="fa-solid fa-folder-plus"></i> Create New Sub-Folder</h3>
      <button class="modal-close" onclick="closeModal('newSubfolderModal')" aria-label="Close"><i class="fa-solid fa-xmark"></i></button>
    </div>
    <form id="newSubfolderForm">
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">Customer / Base Folder <span>*</span></label>
          <select class="form-control" id="newSubfolderCustomerSelect" required onchange="onNewSubfolderCustomerChanged()">
            <option value="">— Select Customer / Folder —</option>
          </select>
          <input type="hidden" name="customer_folder" id="newSubfolderCustomerFolder">
          <input type="hidden" name="storage_id" id="newSubfolderStorageId">
          <input type="hidden" name="customer_id" id="newSubfolderCustomerId">
        </div>
        <div class="form-group">
          <label class="form-label">Parent Directory (For Nested Sub-Folders)</label>
          <select class="form-control" name="parent_subfolder" id="newSubfolderParentSelect">
            <option value="">📁 Root Customer Folder</option>
          </select>
          <small class="text-muted" style="display:block;margin-top:4px;">Choose an existing sub-folder to nest inside it, or keep Root.</small>
        </div>
        <div class="form-group">
          <label class="form-label">New Sub-Folder Name <span>*</span></label>
          <input class="form-control font-mono" type="text" name="subfolder_name" id="newSubfolderNameInput" required placeholder="e.g. 2024-2025, Aadhaar_Cards, Certificates, Forms">
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="closeModal('newSubfolderModal')">Cancel</button>
        <button type="submit" class="btn btn-primary"><i class="fa-solid fa-folder-plus"></i> Create Sub-Folder</button>
      </div>
    </form>
  </div>
</div>

<!-- ══════════════════════════════════════════════════════════════
     MODAL: RENAME SUB-FOLDER
     ══════════════════════════════════════════════════════════════ -->
<div class="modal-overlay" id="renameSubfolderModal">
  <div class="modal">
    <div class="modal-header">
      <h3><i class="fa-solid fa-pen-to-square"></i> Rename Sub-Folder</h3>
      <button class="modal-close" onclick="closeModal('renameSubfolderModal')" aria-label="Close"><i class="fa-solid fa-xmark"></i></button>
    </div>
    <form id="renameSubfolderForm">
      <div class="modal-body">
        <input type="hidden" name="path" id="renameSubfolderPath">
        <div class="form-group">
          <label class="form-label">Current Folder Name</label>
          <input class="form-control font-mono" type="text" id="renameSubfolderOldName" readonly style="opacity:0.7;">
        </div>
        <div class="form-group">
          <label class="form-label">New Folder Name <span>*</span></label>
          <input class="form-control font-mono" type="text" name="new_name" id="renameSubfolderNewName" required placeholder="e.g. 2024-2025">
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="closeModal('renameSubfolderModal')">Cancel</button>
        <button type="submit" class="btn btn-primary"><i class="fa-solid fa-check"></i> Save Rename</button>
      </div>
    </form>
  </div>
</div>

<!-- ══════════════════════════════════════════════════════════════
     MODAL: RENAME DOCUMENT (UPDATE)
     ══════════════════════════════════════════════════════════════ -->
<div class="modal-overlay" id="renameDocModal">
  <div class="modal">
    <div class="modal-header">
      <h3><i class="fa-solid fa-pen-to-square"></i> Rename Document</h3>
      <button class="modal-close" onclick="closeModal('renameDocModal')" aria-label="Close"><i class="fa-solid fa-xmark"></i></button>
    </div>
    <form id="renameDocForm">
      <div class="modal-body">
        <input type="hidden" name="path" id="renameDocPath">
        <div class="form-group">
          <label class="form-label">Current File Name</label>
          <input class="form-control font-mono" type="text" id="renameDocOldName" readonly style="opacity:0.7;">
        </div>
        <div class="form-group">
          <label class="form-label">New File Name <span>*</span></label>
          <input class="form-control font-mono" type="text" name="new_name" id="renameDocNewName" required placeholder="e.g. Aadhar_Card_Final.pdf">
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="closeModal('renameDocModal')">Cancel</button>
        <button type="submit" class="btn btn-primary"><i class="fa-solid fa-check"></i> Save Rename</button>
      </div>
    </form>
  </div>
</div>

<!-- ══════════════════════════════════════════════════════════════
     MODAL: DOCUMENT PREVIEW (VIEW)
     ══════════════════════════════════════════════════════════════ -->
<div class="modal-overlay" id="docPreviewModal">
  <div class="modal" style="max-width:850px;width:95%;">
    <div class="modal-header">
      <h3 id="docPreviewTitle"><i class="fa-solid fa-file"></i> Document Preview</h3>
      <div class="flex items-center gap-2">
        <a id="docPreviewDownloadBtn" class="btn btn-xs btn-secondary" download><i class="fa-solid fa-download"></i> Download</a>
        <a id="docPreviewExternalBtn" class="btn btn-xs btn-secondary" target="_blank"><i class="fa-solid fa-arrow-up-right-from-square"></i> Open Tab</a>
        <button class="modal-close" onclick="closeModal('docPreviewModal')" aria-label="Close"><i class="fa-solid fa-xmark"></i></button>
      </div>
    </div>
    <div class="modal-body" style="padding:10px;">
      <div class="preview-modal-body" id="docPreviewContent">
        <div class="spinner"></div>
      </div>
    </div>
  </div>
</div>

<!-- ══════════════════════════════════════════════════════════════
     MODAL: ADD STORAGE DIRECTORY
     ══════════════════════════════════════════════════════════════ -->
<div class="modal-overlay" id="directoryModal">
  <div class="modal">
    <div class="modal-header">
      <h3><i class="fa-solid fa-folder-plus"></i> Add Dynamic Storage Location</h3>
      <button class="modal-close" onclick="closeModal('directoryModal')" aria-label="Close"><i class="fa-solid fa-xmark"></i></button>
    </div>
    <form id="directoryForm" novalidate>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">Location Label / Name <span>*</span></label>
          <input class="form-control" type="text" name="name" required placeholder="e.g. Drive D Customers, External Drive 2026...">
        </div>
        <div class="form-group">
          <label class="form-label">Absolute Folder Path <span>*</span></label>
          <input class="form-control font-mono" type="text" name="path" id="dirPathInput" required placeholder="e.g. D:\InternetCafeCustomers">
          <small class="text-muted" style="display:block;margin-top:4px;">Enter a valid folder path on any disk or drive.</small>
        </div>
        <div class="form-group">
          <button type="button" class="btn btn-secondary btn-sm" onclick="testDirectoryPath()"><i class="fa-solid fa-magnifying-glass"></i> Check Path</button>
          <span id="dirTestResult" class="text-sm" style="margin-left:10px;"></span>
        </div>
        <div class="form-group">
          <label class="flex items-center gap-2" style="cursor:pointer;">
            <input type="checkbox" name="is_default" value="1">
            <span>Set as Default Customer Storage Location</span>
          </label>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="closeModal('directoryModal')">Cancel</button>
        <button type="submit" class="btn btn-primary"><i class="fa-solid fa-plus"></i> Add Location</button>
      </div>
    </form>
  </div>
</div>

<!-- ══════════════════════════════════════════════════════════════
     MODAL: ADD SESSION
     ══════════════════════════════════════════════════════════════ -->
<div class="modal-overlay" id="sessionModal">
  <div class="modal">
    <div class="modal-header">
      <h3><i class="fa-solid fa-clock"></i> Add New Session</h3>
      <button class="modal-close" onclick="closeModal('sessionModal')" aria-label="Close"><i class="fa-solid fa-xmark"></i></button>
    </div>
    <form id="sessionForm" novalidate>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label" for="ses-customer">Customer <span>*</span></label>
          <select id="ses-customer" class="form-control" name="customer_id" required>
            <option value="">— Select Customer —</option>
          </select>
          <input type="hidden" name="customer_name" value="">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="ses-date">Date <span>*</span></label>
            <input id="ses-date" class="form-control" type="date" name="date" required value="<?= $today ?>">
          </div>
          <div class="form-group">
            <label class="form-label" for="ses-year">Year</label>
            <select id="ses-year" class="form-control" name="year">
              <?php foreach(array_reverse($years) as $y): ?>
              <option value="<?= $y ?>" <?= $y==$currentYear?'selected':'' ?>><?= $y ?></option>
              <?php endforeach; ?>
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="ses-start">Start Time</label>
            <input id="ses-start" class="form-control" type="time" name="start_time" value="<?= date('H:i') ?>">
          </div>
          <div class="form-group">
            <label class="form-label" for="ses-end">End Time</label>
            <input id="ses-end" class="form-control" type="time" name="end_time">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="ses-dur">Duration (minutes)</label>
            <input id="ses-dur" class="form-control" type="number" name="duration_min" placeholder="30" min="1">
          </div>
          <div class="form-group">
            <label class="form-label" for="ses-amount">Amount (<span class="currency-symbol">₹</span>) <span>*</span></label>
            <input id="ses-amount" class="form-control" type="number" name="amount" placeholder="0" min="0" step="0.50" required>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="ses-service">Service Type</label>
            <select id="ses-service" class="form-control" name="service">
              <option value="">— Select Service —</option>
              <?php
              $services = ['Document Print','Form Fill','Browsing','Photo Print','Scanning','PDF Convert','Online Work','Government Form','Scholarship','Job Application','Aadhar Work','PAN Card','Other'];
              foreach($services as $svc): ?>
              <option value="<?= htmlspecialchars($svc) ?>"><?= htmlspecialchars($svc) ?></option>
              <?php endforeach; ?>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="ses-payment">Payment Mode</label>
            <select id="ses-payment" class="form-control" name="payment_mode">
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="credit">Credit</option>
              <option value="free">Free</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label" for="ses-notes">Notes</label>
          <textarea id="ses-notes" class="form-control" name="notes" rows="2" placeholder="What work was done..."></textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="closeModal('sessionModal')">Cancel</button>
        <button type="submit" class="btn btn-primary"><i class="fa-solid fa-floppy-disk"></i> Save Session</button>
      </div>
    </form>
  </div>
</div>

<!-- Toast Container -->
<div id="toast-container"></div>

<!-- Main Application JS -->
<script src="Assets/js/app.js"></script>

</body>
</html>
