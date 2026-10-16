# 🖥️ Internet Cafe Diary — Dashboard & System Manager

A **complete Internet Cafe Management System** built with PHP, JavaScript, HTML, CSS, and a JSON-based database collection.

---

## 📁 Project Structure

```
InternetCafeDiary/
│
├── index.php                       ← Root entrypoint (redirects to .base)
├── run.bat                         ← One-click runner for Windows
├── README.md                       ← System documentation
├── .gitignore                      ← Ignores customer files & tracks code
│
├── .base/                          ← Core Application & Dashboard
│   ├── index.php                   ← Main Dashboard & System Manager UI
│   ├── .htaccess                   ← Apache security & directory protection
│   │
│   ├── Assets/
│   │   ├── css/
│   │   │   └── style.css           ← Modern dark theme & glassmorphism
│   │   └── js/
│   │       └── app.js              ← Frontend CRUD, settings & multi-dir logic
│   │
│   ├── php_files/
│   │   └── api.php                 ← REST API (CRUD, Dynamic Storage, SMTP test)
│   │
│   └── data/
│       ├── customers.json          ← Customers collection (JSON)
│       ├── sessions.json           ← Visits & Sessions collection (JSON)
│       └── settings.json           ← System Manager & Dynamic Locations config
│
├── CUSTOMER_NAME/                  ← Default customer folders (on primary storage)
└── [ANY_CUSTOM_DRIVE_OR_FOLDER]    ← Additional dynamic storage locations (D:\, E:\, etc.)
```

---

## 🚀 How to Run

### Method 1: One-Click Windows Runner (Easiest)
Simply double-click **`run.bat`** in the repository root. It will:
1. Start the PHP server at `localhost:8000`
2. Automatically launch your default browser to `http://localhost:8000`

### Method 2: Command Line (PHP Built-in Server)
```bash
php -S localhost:8000
```
Then visit: `http://localhost:8000`

### Method 3: XAMPP / WAMP
1. Place the `InternetCafeDiary` folder inside `htdocs`
2. Start Apache
3. Visit: `http://localhost/InternetCafeDiary/`

---

## 🌟 Key Features

### ⚙️ System Manager (Dynamic Settings)
- **🌐 Branding & Cafe Profile:**
  - Dynamic Cafe Name, Tagline, Owner Name, and Contact details
  - Custom Logo (Emoji/Icon or Custom Image URL)
  - Currency Symbol customization (₹, $, etc.)
- **📁 Dynamic Storage Directories:**
  - Add **unlimited custom storage directories** across any disk or drive (e.g. `D:\Customers`, `E:\CafeBackup`)
  - Set default storage directory for new customer folders
  - Active/Inactive toggle per directory
  - Real-time directory path validation & permission check
  - Documents tab automatically scans and organizes files across **all active storage locations**
- **📧 Email SMTP Setup:**
  - Configure SMTP Host, Port, Encryption (TLS/SSL/None)
  - SMTP Authentication (Username, App Password)
  - Built-in **"Test SMTP Connection"** socket tester
- **ℹ️ System & Disk Diagnostics:**
  - Live PHP version, Server OS, and Memory limit
  - Free & Total disk space for each configured storage drive

### 👥 Customer Management (CRUD)
- ➕ **Add** customer with custom or default storage location
- ✏️ **Edit** customer details (Phone, Aadhar, Address, Notes, Status)
- 🗑️ **Delete** customer record safely
- 🔍 **Search** by name, mobile number, or Aadhar
- 🔽 **Filter** by Year, Status (Active/Inactive), and Storage Location

### ⏱️ Sessions & Billing
- ➕ Log customer visits with service type, time duration, amount & payment mode (Cash, UPI, Credit, Free)
- 📊 Track daily and yearly revenue in real time

### 📁 Multi-Directory Document Browser
- Automatically scans physical files (`.pdf`, `.jpg`, `.docx`, etc.) across all dynamic storage paths
- Identifies registered vs unlinked customer folders
- Filter documents by storage drive

---

## 🗄️ JSON Database Collections

- **`customers.json`**: Customer records with assigned `storage_dir_id` and path.
- **`sessions.json`**: Timed internet and printing session logs.
- **`settings.json`**: Business info, dynamic directory paths, and SMTP configurations.

---

## 🎨 Technology Stack
- **Backend:** PHP 7.4+ (Native, zero external heavy dependencies)
- **Frontend:** Vanilla JavaScript (ES6+), HTML5, Vanilla CSS3 (Dark Glassmorphism)
- **Charts:** Chart.js
- **Database:** JSON Document Collections

---

*Internet Cafe Diary — 2026*
