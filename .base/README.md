# 🖥️ Internet Cafe Diary — Dashboard

A **complete Internet Cafe Management System** built with PHP, JavaScript, HTML, CSS and JSON database.

---

## 📁 Project Structure

```
InternetCafeDiary/
│
├── .base/                          ← Dashboard files (this folder)
│   ├── index.php                   ← Main Dashboard (open this)
│   ├── .htaccess                   ← Apache security config
│   │
│   ├── Assets/
│   │   ├── css/
│   │   │   └── style.css           ← Full dark-theme stylesheet
│   │   └── js/
│   │       └── app.js              ← Frontend logic (CRUD, Charts, etc.)
│   │
│   ├── php_files/
│   │   └── api.php                 ← CRUD REST API (JSON database)
│   │
│   └── data/
│       ├── customers.json          ← Customer database (JSON)
│       └── sessions.json           ← Sessions/Visits database (JSON)
│
├── CUSTOMER_NAME/                  ← Each customer's physical folder
│   ├── document1.pdf
│   ├── photo.jpg
│   └── ...
│
└── ANOTHER_CUSTOMER/
```

---

## 🚀 How to Run

### Option 1: XAMPP / WAMP (Recommended)
1. Copy the **entire `InternetCafeDiary`** folder to `C:\xampp\htdocs\`
2. Start XAMPP → Apache
3. Open browser: `http://localhost/InternetCafeDiary/.base/`

### Option 2: PHP Built-in Server
```bash
cd "C:\Users\Technical Aman\Desktop\InternetCafeDiary\.base"
php -S localhost:8080
```
Then open: `http://localhost:8080/`

---

## 🌟 Features

### 👥 Customers (CRUD)
- ➕ **Add** new customer (auto-creates folder)
- ✏️ **Edit** customer info
- 🗑️ **Delete** customer
- 🔍 **Search** by name, phone, Aadhar
- 🔽 **Filter** by year & status (Active/Inactive)
- 📋 **View** full customer detail with documents & visit history

### ⏱️ Sessions
- ➕ **Log** a new customer session/visit
- 📅 **Filter** by date, year, customer
- 💰 Track **service type, amount, payment mode**
- 🗑️ Delete sessions

### 📁 Documents
- **Auto-scans** all physical folders in `InternetCafeDiary/`
- Shows files per customer folder with icons by type
- Matches physical folders to database records

### 📈 Reports
- 📊 **Monthly Revenue Chart** (bar chart)
- 🛠️ **Services Breakdown** (which service is most used)
- 📅 **Customers by Year** chart

---

## 🗄️ JSON Database Schema

### customers.json
```json
{
  "customers": [
    {
      "id": "CUST-2024-XXXXXX",
      "name": "CUSTOMER NAME",
      "folder_name": "CUSTOMER_NAME",
      "phone": "9876543210",
      "address": "Village - ...",
      "aadhar": "XXXX-XXXX-XXXX",
      "created_date": "2024-01-15",
      "created_year": "2024",
      "status": "active",
      "notes": "",
      "documents": ["file1.pdf", "photo.jpg"],
      "visits": [
        { "date": "2024-01-15", "service": "Document Print", "amount": 20, "duration": "30min" }
      ]
    }
  ]
}
```

### sessions.json
```json
{
  "sessions": [
    {
      "id": "SES-2024-XXXXXX",
      "customer_id": "CUST-2024-XXXXXX",
      "customer_name": "CUSTOMER NAME",
      "date": "2024-01-15",
      "year": "2024",
      "start_time": "10:30",
      "end_time": "11:00",
      "duration_min": 30,
      "service": "Document Print",
      "amount": 20,
      "payment_mode": "cash",
      "notes": "Printed Aadhar"
    }
  ]
}
```

---

## 🔌 API Endpoints

All calls go to: `php_files/api.php?resource=X`

| Method | Resource    | Description              |
|--------|-------------|--------------------------|
| GET    | customers   | List all / search        |
| GET    | customers&id=X | Get single customer   |
| POST   | customers   | Create new customer      |
| PUT    | customers&id=X | Update customer       |
| DELETE | customers&id=X | Delete customer       |
| GET    | sessions    | List all sessions        |
| POST   | sessions    | Create session           |
| DELETE | sessions&id=X | Delete session        |
| GET    | folders     | Scan physical folders    |
| GET    | stats       | Dashboard statistics     |

---

## 📦 Services Available
Document Print, Form Fill, Browsing, Photo Print, Scanning,
PDF Convert, Online Work, Government Form, Scholarship,
Job Application, Aadhar Work, PAN Card, Other

---

## 🎨 Tech Stack
- **PHP 7.4+** — Backend & API
- **Vanilla JavaScript** — Frontend logic
- **HTML5** — Structure
- **CSS3** — Dark theme with glassmorphism
- **Chart.js** — Interactive charts
- **Google Fonts** — Inter + JetBrains Mono
- **JSON** — Lightweight file database

---

*Made for Internet Cafe Management — 2026*
