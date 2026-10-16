<?php
/**
 * Internet Cafe Diary - CRUD API
 * JSON-based Database API for Customer & Session Management
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// ──────────────────────────────────────────────
// PATH SETUP
// ──────────────────────────────────────────────
define('BASE_DIR',       dirname(__DIR__));           // InternetCafeDiary root
define('DATA_DIR',       __DIR__ . '/../data/');
define('CUSTOMERS_FILE', DATA_DIR . 'customers.json');
define('SESSIONS_FILE',  DATA_DIR . 'sessions.json');

// ──────────────────────────────────────────────
// HELPER FUNCTIONS
// ──────────────────────────────────────────────
function readJson($file) {
    if (!file_exists($file)) return [];
    $content = file_get_contents($file);
    return json_decode($content, true) ?? [];
}

function writeJson($file, $data) {
    $data['meta']['last_updated'] = date('c');
    return file_put_contents($file, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

function respond($data, $code = 200) {
    http_response_code($code);
    echo json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    exit();
}

function generateId($prefix, $year = null) {
    $year = $year ?? date('Y');
    return $prefix . '-' . $year . '-' . strtoupper(substr(md5(uniqid()), 0, 6));
}

function sanitizeFolderName($name) {
    $name = strtoupper(trim($name));
    $name = preg_replace('/\s+/', '_', $name);
    $name = preg_replace('/[^A-Z0-9_\-]/', '', $name);
    return $name;
}

// Scan physical folders in InternetCafeDiary root
function scanPhysicalFolders() {
    $rootDir  = BASE_DIR;
    $excluded = ['.base', '.', '..'];
    $folders  = [];
    if (is_dir($rootDir)) {
        foreach (scandir($rootDir) as $item) {
            if (!in_array($item, $excluded) && is_dir($rootDir . DIRECTORY_SEPARATOR . $item)) {
                $files = [];
                foreach (scandir($rootDir . DIRECTORY_SEPARATOR . $item) as $f) {
                    if ($f !== '.' && $f !== '..') $files[] = $f;
                }
                $folders[] = ['folder' => $item, 'files' => $files, 'count' => count($files)];
            }
        }
    }
    return $folders;
}

// ──────────────────────────────────────────────
// ROUTER
// ──────────────────────────────────────────────
$method   = $_SERVER['REQUEST_METHOD'];
$action   = $_GET['action']   ?? '';
$resource = $_GET['resource'] ?? 'customers';
$id       = $_GET['id']       ?? null;
$body     = json_decode(file_get_contents('php://input'), true) ?? [];

// ── CUSTOMERS ─────────────────────────────────
if ($resource === 'customers') {
    $db = readJson(CUSTOMERS_FILE);
    $customers = $db['customers'] ?? [];

    // GET ALL / SEARCH / FILTER
    if ($method === 'GET' && !$id) {
        $search = strtolower($_GET['search'] ?? '');
        $year   = $_GET['year']   ?? '';
        $status = $_GET['status'] ?? '';

        $filtered = array_filter($customers, function($c) use ($search, $year, $status) {
            $matchSearch = !$search ||
                str_contains(strtolower($c['name']), $search) ||
                str_contains(strtolower($c['phone'] ?? ''), $search) ||
                str_contains(strtolower($c['aadhar'] ?? ''), $search);
            $matchYear   = !$year   || ($c['created_year'] ?? '') === $year;
            $matchStatus = !$status || ($c['status'] ?? '') === $status;
            return $matchSearch && $matchYear && $matchStatus;
        });

        // Sort by name
        usort($filtered, fn($a,$b) => strcmp($a['name'], $b['name']));
        respond(['success' => true, 'data' => array_values($filtered), 'total' => count($filtered)]);
    }

    // GET SINGLE
    if ($method === 'GET' && $id) {
        $found = array_filter($customers, fn($c) => $c['id'] === $id);
        if (empty($found)) respond(['success' => false, 'message' => 'Customer not found'], 404);
        respond(['success' => true, 'data' => array_values($found)[0]]);
    }

    // CREATE
    if ($method === 'POST') {
        if (empty($body['name'])) respond(['success' => false, 'message' => 'Name is required'], 400);

        $year       = date('Y');
        $folderName = sanitizeFolderName($body['name']);
        $newId      = generateId('CUST', $year);

        // Create physical folder
        $folderPath = BASE_DIR . DIRECTORY_SEPARATOR . $folderName;
        if (!is_dir($folderPath)) mkdir($folderPath, 0755, true);

        $newCustomer = [
            'id'           => $newId,
            'name'         => strtoupper(trim($body['name'])),
            'folder_name'  => $folderName,
            'phone'        => $body['phone']   ?? '',
            'address'      => $body['address'] ?? '',
            'aadhar'       => $body['aadhar']  ?? '',
            'created_date' => date('Y-m-d'),
            'created_year' => $year,
            'status'       => 'active',
            'notes'        => $body['notes']   ?? '',
            'documents'    => [],
            'visits'       => []
        ];

        $db['customers'][] = $newCustomer;
        $db['meta']['total_customers'] = count($db['customers']);
        writeJson(CUSTOMERS_FILE, $db);

        respond(['success' => true, 'data' => $newCustomer, 'message' => 'Customer created successfully'], 201);
    }

    // UPDATE
    if ($method === 'PUT' && $id) {
        $updated = false;
        foreach ($db['customers'] as &$c) {
            if ($c['id'] === $id) {
                $c['name']    = strtoupper(trim($body['name']    ?? $c['name']));
                $c['phone']   = $body['phone']   ?? $c['phone'];
                $c['address'] = $body['address'] ?? $c['address'];
                $c['aadhar']  = $body['aadhar']  ?? $c['aadhar'];
                $c['status']  = $body['status']  ?? $c['status'];
                $c['notes']   = $body['notes']   ?? $c['notes'];
                $updated = true;
                $updatedCustomer = $c;
                break;
            }
        }
        if (!$updated) respond(['success' => false, 'message' => 'Customer not found'], 404);
        writeJson(CUSTOMERS_FILE, $db);
        respond(['success' => true, 'data' => $updatedCustomer, 'message' => 'Updated successfully']);
    }

    // DELETE
    if ($method === 'DELETE' && $id) {
        $newList = array_filter($customers, fn($c) => $c['id'] !== $id);
        if (count($newList) === count($customers)) respond(['success' => false, 'message' => 'Customer not found'], 404);
        $db['customers'] = array_values($newList);
        $db['meta']['total_customers'] = count($db['customers']);
        writeJson(CUSTOMERS_FILE, $db);
        respond(['success' => true, 'message' => 'Customer deleted']);
    }
}

// ── SESSIONS ──────────────────────────────────
if ($resource === 'sessions') {
    $db       = readJson(SESSIONS_FILE);
    $sessions = $db['sessions'] ?? [];

    // GET ALL / FILTER
    if ($method === 'GET' && !$id) {
        $cid    = $_GET['customer_id'] ?? '';
        $year   = $_GET['year']        ?? '';
        $date   = $_GET['date']        ?? '';
        $search = strtolower($_GET['search'] ?? '');

        $filtered = array_filter($sessions, function($s) use ($cid, $year, $date, $search) {
            $matchCid    = !$cid  || $s['customer_id'] === $cid;
            $matchYear   = !$year || $s['year'] === $year;
            $matchDate   = !$date || $s['date'] === $date;
            $matchSearch = !$search || str_contains(strtolower($s['customer_name'] ?? ''), $search);
            return $matchCid && $matchYear && $matchDate && $matchSearch;
        });

        usort($filtered, fn($a,$b) => strcmp($b['date'], $a['date']));
        respond(['success' => true, 'data' => array_values($filtered), 'total' => count($filtered)]);
    }

    // CREATE SESSION
    if ($method === 'POST') {
        if (empty($body['customer_id'])) respond(['success' => false, 'message' => 'customer_id required'], 400);

        $year      = date('Y');
        $newSes    = [
            'id'            => generateId('SES', $year),
            'customer_id'   => $body['customer_id'],
            'customer_name' => strtoupper($body['customer_name'] ?? ''),
            'date'          => $body['date']         ?? date('Y-m-d'),
            'year'          => $body['year']         ?? $year,
            'start_time'    => $body['start_time']   ?? date('H:i'),
            'end_time'      => $body['end_time']     ?? '',
            'duration_min'  => intval($body['duration_min'] ?? 0),
            'service'       => $body['service']      ?? '',
            'amount'        => floatval($body['amount'] ?? 0),
            'payment_mode'  => $body['payment_mode'] ?? 'cash',
            'notes'         => $body['notes']        ?? ''
        ];

        $db['sessions'][] = $newSes;
        $db['meta']['total_sessions'] = count($db['sessions']);
        writeJson(SESSIONS_FILE, $db);

        // Also add to customer visits
        $custDb = readJson(CUSTOMERS_FILE);
        foreach ($custDb['customers'] as &$c) {
            if ($c['id'] === $body['customer_id']) {
                $c['visits'][] = [
                    'date'     => $newSes['date'],
                    'service'  => $newSes['service'],
                    'amount'   => $newSes['amount'],
                    'duration' => $newSes['duration_min'] . 'min'
                ];
                break;
            }
        }
        writeJson(CUSTOMERS_FILE, $custDb);

        respond(['success' => true, 'data' => $newSes, 'message' => 'Session saved'], 201);
    }

    // DELETE
    if ($method === 'DELETE' && $id) {
        $newList = array_filter($sessions, fn($s) => $s['id'] !== $id);
        $db['sessions'] = array_values($newList);
        $db['meta']['total_sessions'] = count($db['sessions']);
        writeJson(SESSIONS_FILE, $db);
        respond(['success' => true, 'message' => 'Session deleted']);
    }
}

// ── FOLDERS (physical scan) ───────────────────
if ($resource === 'folders') {
    respond(['success' => true, 'data' => scanPhysicalFolders()]);
}

// ── STATS ─────────────────────────────────────
if ($resource === 'stats') {
    $custDb  = readJson(CUSTOMERS_FILE);
    $sesDb   = readJson(SESSIONS_FILE);
    $customers = $custDb['customers'] ?? [];
    $sessions  = $sesDb['sessions']  ?? [];
    $today     = date('Y-m-d');
    $year      = date('Y');

    $totalRevenue  = array_sum(array_column($sessions, 'amount'));
    $todayRevenue  = array_sum(array_column(
        array_filter($sessions, fn($s) => $s['date'] === $today), 'amount'
    ));
    $yearRevenue   = array_sum(array_column(
        array_filter($sessions, fn($s) => $s['year'] === $year), 'amount'
    ));
    $todaySessions = count(array_filter($sessions, fn($s) => $s['date'] === $today));

    // Group by year
    $byYear = [];
    foreach ($customers as $c) {
        $yr = $c['created_year'] ?? 'Unknown';
        $byYear[$yr] = ($byYear[$yr] ?? 0) + 1;
    }
    ksort($byYear);

    // Monthly breakdown for current year
    $monthly = [];
    for ($m = 1; $m <= 12; $m++) {
        $mStr = $year . '-' . str_pad($m, 2, '0', STR_PAD_LEFT);
        $monthly[date('M', mktime(0,0,0,$m,1))] = array_sum(array_column(
            array_filter($sessions, fn($s) => str_starts_with($s['date'], $mStr)), 'amount'
        ));
    }

    respond([
        'success'         => true,
        'total_customers' => count($customers),
        'active_customers'=> count(array_filter($customers, fn($c) => ($c['status'] ?? '') === 'active')),
        'total_sessions'  => count($sessions),
        'today_sessions'  => $todaySessions,
        'total_revenue'   => $totalRevenue,
        'today_revenue'   => $todayRevenue,
        'year_revenue'    => $yearRevenue,
        'by_year'         => $byYear,
        'monthly_revenue' => $monthly
    ]);
}

respond(['success' => false, 'message' => 'Invalid resource or method'], 400);
