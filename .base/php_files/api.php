<?php
/**
 * Internet Cafe Diary - System API
 * Handles:
 *  - Customer & Session CRUD
 *  - System Settings (Branding, Logo, Dynamic Storage Directories, SMTP)
 *  - Multi-Directory Document Scanning & Management
 *  - SMTP Connection Testing
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// ──────────────────────────────────────────────
// PATH SETUP
// ──────────────────────────────────────────────
define('BASE_DIR',       dirname(dirname(__DIR__))); // InternetCafeDiary root
define('DATA_DIR',       __DIR__ . '/../data/');
define('CUSTOMERS_FILE', DATA_DIR . 'customers.json');
define('SESSIONS_FILE',  DATA_DIR . 'sessions.json');
define('SETTINGS_FILE',  DATA_DIR . 'settings.json');

// ──────────────────────────────────────────────
// HELPER FUNCTIONS
// ──────────────────────────────────────────────
function readJson($file) {
    if (!file_exists($file)) return [];
    $content = file_get_contents($file);
    return json_decode($content, true) ?? [];
}

function writeJson($file, $data) {
    if (!isset($data['meta'])) $data['meta'] = [];
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

function getMimeType($filename) {
    $ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
    $mimes = [
        'pdf'  => 'application/pdf',
        'jpg'  => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'png'  => 'image/png',
        'gif'  => 'image/gif',
        'webp' => 'image/webp',
        'txt'  => 'text/plain',
        'doc'  => 'application/msword',
        'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'xls'  => 'application/vnd.ms-excel',
        'xlsx' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'psd'  => 'image/vnd.adobe.photoshop'
    ];
    return $mimes[$ext] ?? 'application/octet-stream';
}

function isPathWithinStorage($path) {
    $real = realpath($path);
    if (!$real) return false;
    $dirs = getStorageDirectories();
    foreach ($dirs as $d) {
        $realStorage = realpath($d['path']);
        if ($realStorage && str_starts_with($real, $realStorage)) {
            return true;
        }
    }
    return false;
}

function formatBytes($bytes, $precision = 1) {
    $units = ['B', 'KB', 'MB', 'GB', 'TB'];
    $bytes = max($bytes, 0);
    $pow = floor(($bytes ? log($bytes) : 0) / log(1024));
    $pow = min($pow, count($units) - 1);
    $bytes /= pow(1024, $pow);
    return round($bytes, $precision) . ' ' . $units[$pow];
}

// ── SETTINGS HELPERS ──────────────────────────
function getSettings() {
    $settings = readJson(SETTINGS_FILE);
    if (empty($settings['general'])) {
        $settings['general'] = [
            'site_title'      => 'Internet Cafe Diary',
            'tagline'         => 'Customer & Cafe Management System',
            'owner_name'      => 'Admin',
            'phone'           => '9876543210',
            'email'           => 'cafe@example.com',
            'address'         => 'Main Market Road',
            'currency_symbol' => '₹',
            'logo_type'       => 'icon',
            'logo_icon'       => 'fa-solid fa-desktop',
            'logo_url'        => ''
        ];
    }
    if (empty($settings['storage']['directories'])) {
        $settings['storage'] = [
            'default_directory_id' => 'dir_root',
            'directories' => [
                [
                    'id'         => 'dir_root',
                    'name'       => 'Default Root Directory',
                    'path'       => BASE_DIR,
                    'is_active'  => true,
                    'is_default' => true,
                    'created_at' => date('Y-m-d')
                ]
            ]
        ];
    }
    if (empty($settings['smtp'])) {
        $settings['smtp'] = [
            'host'       => 'smtp.gmail.com',
            'port'       => 587,
            'username'   => '',
            'password'   => '',
            'encryption' => 'tls',
            'from_email' => '',
            'from_name'  => 'Internet Cafe Diary',
            'enabled'    => false
        ];
    }
    return $settings;
}

function getStorageDirectories() {
    $settings = getSettings();
    return $settings['storage']['directories'] ?? [];
}

function getDefaultStorageDirectory() {
    $settings = getSettings();
    $defId = $settings['storage']['default_directory_id'] ?? 'dir_root';
    foreach ($settings['storage']['directories'] ?? [] as $dir) {
        if ($dir['id'] === $defId && ($dir['is_active'] ?? true)) {
            return $dir;
        }
    }
    // Fallback to first active directory or BASE_DIR
    foreach ($settings['storage']['directories'] ?? [] as $dir) {
        if ($dir['is_active'] ?? true) return $dir;
    }
    return [
        'id'         => 'dir_root',
        'name'       => 'Default Root Directory',
        'path'       => BASE_DIR,
        'is_active'  => true,
        'is_default' => true
    ];
}

// Scan physical folders across all active storage directories
function scanAllDirectories() {
    $dirs = getStorageDirectories();
    $excluded = ['.base', '.', '..', '.git', 'desktop.ini'];
    $results = [];

    foreach ($dirs as $dirConfig) {
        if (!($dirConfig['is_active'] ?? true)) continue;
        $dirPath = rtrim($dirConfig['path'], '\\/');
        if (!is_dir($dirPath)) continue;

        $items = @scandir($dirPath) ?: [];
        foreach ($items as $item) {
            if (in_array($item, $excluded)) continue;
            $fullPath = $dirPath . DIRECTORY_SEPARATOR . $item;
            if (is_dir($fullPath)) {
                $files = [];
                $fileItems = @scandir($fullPath) ?: [];
                foreach ($fileItems as $f) {
                    if (!in_array($f, ['.', '..', 'desktop.ini'])) {
                        $files[] = $f;
                    }
                }
                $results[] = [
                    'folder'       => $item,
                    'files'        => $files,
                    'count'        => count($files),
                    'storage_id'   => $dirConfig['id'],
                    'storage_name' => $dirConfig['name'],
                    'full_path'    => $fullPath
                ];
            }
        }
    }
    return $results;
}

// ──────────────────────────────────────────────
// ROUTER
// ──────────────────────────────────────────────
$method   = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$action   = $_GET['action']   ?? '';
$resource = $_GET['resource'] ?? 'customers';
$id       = $_GET['id']       ?? null;
$body     = json_decode(file_get_contents('php://input'), true) ?? [];

// ── SETTINGS RESOURCE ─────────────────────────
if ($resource === 'settings') {
    $settings = getSettings();

    // GET settings
    if ($method === 'GET') {
        respond(['success' => true, 'data' => $settings]);
    }

    // UPDATE general or smtp settings
    if ($method === 'POST' || $method === 'PUT') {
        if ($action === 'test_directory') {
            $testPath = trim($body['path'] ?? '');
            if (!$testPath) respond(['success' => false, 'message' => 'Path is required'], 400);

            $exists   = is_dir($testPath);
            $writable = is_writable($testPath);
            $canCreate = false;

            if (!$exists) {
                // Check if parent directory is writable to create it safely
                $parent = dirname($testPath);
                $canCreate = is_dir($parent) && is_writable($parent);
            }

            respond([
                'success'    => $exists || $canCreate,
                'exists'     => $exists,
                'writable'   => $writable,
                'can_create' => $canCreate,
                'message'    => $exists ? 'Directory exists and is ready' : ($canCreate ? 'Directory does not exist but can be created' : 'Directory does not exist and cannot be created (check permissions)')
            ]);
        }

        if ($action === 'add_directory') {
            $name = trim($body['name'] ?? '');
            $path = trim($body['path'] ?? '');
            $setDef = !empty($body['is_default']);

            if (!$name || !$path) respond(['success' => false, 'message' => 'Name and Path are required'], 400);

            // Create directory if it does not exist
            if (!is_dir($path)) {
                if (!@mkdir($path, 0755, true)) {
                    respond(['success' => false, 'message' => 'Directory path could not be created. Please verify disk/folder permissions.'], 400);
                }
            }

            $newDirId = 'dir_' . substr(md5(uniqid()), 0, 8);
            $newDir = [
                'id'         => $newDirId,
                'name'       => $name,
                'path'       => $path,
                'is_active'  => true,
                'is_default' => $setDef,
                'created_at' => date('Y-m-d')
            ];

            if ($setDef) {
                foreach ($settings['storage']['directories'] as &$d) {
                    $d['is_default'] = false;
                }
                $settings['storage']['default_directory_id'] = $newDirId;
            }

            $settings['storage']['directories'][] = $newDir;
            writeJson(SETTINGS_FILE, $settings);
            respond(['success' => true, 'data' => $newDir, 'message' => 'Storage location added successfully!']);
        }

        if ($action === 'remove_directory') {
            $removeId = $body['id'] ?? $id;
            if (!$removeId) respond(['success' => false, 'message' => 'Directory ID required'], 400);

            if ($removeId === ($settings['storage']['default_directory_id'] ?? '')) {
                respond(['success' => false, 'message' => 'Cannot delete the default storage location. Please set another location as default first.'], 400);
            }

            $settings['storage']['directories'] = array_values(array_filter(
                $settings['storage']['directories'], fn($d) => $d['id'] !== $removeId
            ));
            writeJson(SETTINGS_FILE, $settings);
            respond(['success' => true, 'message' => 'Storage directory removed']);
        }

        if ($action === 'set_default_directory') {
            $defId = $body['id'] ?? $id;
            if (!$defId) respond(['success' => false, 'message' => 'Directory ID required'], 400);

            $found = false;
            foreach ($settings['storage']['directories'] as &$d) {
                if ($d['id'] === $defId) {
                    $d['is_default'] = true;
                    $d['is_active']  = true;
                    $found = true;
                } else {
                    $d['is_default'] = false;
                }
            }
            if (!$found) respond(['success' => false, 'message' => 'Directory not found'], 404);

            $settings['storage']['default_directory_id'] = $defId;
            writeJson(SETTINGS_FILE, $settings);
            respond(['success' => true, 'message' => 'Default storage location updated!']);
        }

        if ($action === 'toggle_directory_status') {
            $toggleId = $body['id'] ?? $id;
            foreach ($settings['storage']['directories'] as &$d) {
                if ($d['id'] === $toggleId) {
                    if ($d['is_default'] && ($d['is_active'] ?? true)) {
                        respond(['success' => false, 'message' => 'Cannot deactivate the default storage directory.'], 400);
                    }
                    $d['is_active'] = !($d['is_active'] ?? true);
                    writeJson(SETTINGS_FILE, $settings);
                    respond(['success' => true, 'is_active' => $d['is_active'], 'message' => 'Status updated']);
                }
            }
            respond(['success' => false, 'message' => 'Directory not found'], 404);
        }

        if ($action === 'test_smtp') {
            $host = trim($body['host'] ?? $settings['smtp']['host'] ?? '');
            $port = intval($body['port'] ?? $settings['smtp']['port'] ?? 587);
            $enc  = strtolower($body['encryption'] ?? $settings['smtp']['encryption'] ?? 'tls');

            if (!$host || !$port) {
                respond(['success' => false, 'message' => 'SMTP Host and Port are required'], 400);
            }

            $protocol = ($enc === 'ssl') ? 'ssl://' : '';
            $target   = $protocol . $host;
            $timeout  = 5;

            $fp = @fsockopen($target, $port, $errno, $errstr, $timeout);
            if (!$fp) {
                respond([
                    'success' => false,
                    'message' => "SMTP Connection failed: $errstr (Code: $errno)"
                ], 400);
            }

            // Read banner
            $response = fgets($fp, 515);
            fclose($fp);

            respond([
                'success' => true,
                'message' => "Connection successful! Server response: " . trim($response)
            ]);
        }

        // Generic settings save (general, smtp)
        if (isset($body['general'])) {
            $settings['general'] = array_merge($settings['general'] ?? [], $body['general']);
        }
        if (isset($body['smtp'])) {
            $settings['smtp'] = array_merge($settings['smtp'] ?? [], $body['smtp']);
        }
        writeJson(SETTINGS_FILE, $settings);
        respond(['success' => true, 'data' => $settings, 'message' => 'Settings updated successfully!']);
    }
}

// ── SYSTEM INFO RESOURCE ──────────────────────
if ($resource === 'system_info') {
    $settings = getSettings();
    $diskInfo = [];
    foreach ($settings['storage']['directories'] ?? [] as $dir) {
        $p = $dir['path'];
        if (is_dir($p)) {
            $free  = @disk_free_space($p);
            $total = @disk_total_space($p);
            $diskInfo[] = [
                'id'       => $dir['id'],
                'name'     => $dir['name'],
                'path'     => $p,
                'free_gb'  => $free ? round($free / (1024 * 1024 * 1024), 2) : 'N/A',
                'total_gb' => $total ? round($total / (1024 * 1024 * 1024), 2) : 'N/A',
                'exists'   => true
            ];
        } else {
            $diskInfo[] = [
                'id'     => $dir['id'],
                'name'   => $dir['name'],
                'path'   => $p,
                'exists' => false
            ];
        }
    }

    respond([
        'success'      => true,
        'php_version'  => PHP_VERSION,
        'server_os'    => PHP_OS_FAMILY,
        'server_soft'  => $_SERVER['SERVER_SOFTWARE'] ?? 'PHP CLI Server',
        'upload_max'   => ini_get('upload_max_filesize'),
        'post_max'     => ini_get('post_max_size'),
        'memory_limit' => ini_get('memory_limit'),
        'storage_disks'=> $diskInfo
    ]);
}

// ── CUSTOMERS ─────────────────────────────────
if ($resource === 'customers') {
    $db = readJson(CUSTOMERS_FILE);
    $customers = $db['customers'] ?? [];

    // GET ALL / SEARCH / FILTER
    if ($method === 'GET' && !$id) {
        $search = strtolower($_GET['search'] ?? '');
        $year   = $_GET['year']   ?? '';
        $status = $_GET['status'] ?? '';
        $dirId  = $_GET['directory_id'] ?? '';

        $filtered = array_filter($customers, function($c) use ($search, $year, $status, $dirId) {
            $matchSearch = !$search ||
                str_contains(strtolower($c['name']), $search) ||
                str_contains(strtolower($c['phone'] ?? ''), $search) ||
                str_contains(strtolower($c['aadhar'] ?? ''), $search);
            $matchYear   = !$year   || ($c['created_year'] ?? '') === $year;
            $matchStatus = !$status || ($c['status'] ?? '') === $status;
            $matchDir    = !$dirId  || ($c['storage_dir_id'] ?? 'dir_root') === $dirId;
            return $matchSearch && $matchYear && $matchStatus && $matchDir;
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

        // Determine destination storage directory
        $reqDirId   = $body['storage_dir_id'] ?? null;
        $targetDir  = null;
        $dirs       = getStorageDirectories();

        if ($reqDirId) {
            foreach ($dirs as $d) {
                if ($d['id'] === $reqDirId && ($d['is_active'] ?? true)) {
                    $targetDir = $d;
                    break;
                }
            }
        }
        if (!$targetDir) {
            $targetDir = getDefaultStorageDirectory();
        }

        $baseStoragePath = rtrim($targetDir['path'], '\\/');
        $folderPath      = $baseStoragePath . DIRECTORY_SEPARATOR . $folderName;

        // Create physical customer folder in selected storage location
        if (!is_dir($folderPath)) {
            @mkdir($folderPath, 0755, true);
        }

        $newCustomer = [
            'id'               => $newId,
            'name'             => strtoupper(trim($body['name'])),
            'folder_name'      => $folderName,
            'storage_dir_id'   => $targetDir['id'],
            'storage_dir_name' => $targetDir['name'],
            'storage_path'     => $folderPath,
            'phone'            => $body['phone']   ?? '',
            'address'          => $body['address'] ?? '',
            'aadhar'           => $body['aadhar']  ?? '',
            'created_date'     => date('Y-m-d'),
            'created_year'     => $year,
            'status'           => 'active',
            'notes'            => $body['notes']   ?? '',
            'documents'        => [],
            'visits'           => []
        ];

        $db['customers'][] = $newCustomer;
        $db['meta']['total_customers'] = count($db['customers']);
        writeJson(CUSTOMERS_FILE, $db);

        respond(['success' => true, 'data' => $newCustomer, 'message' => "Customer created in {$targetDir['name']}"], 201);
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

// ── FOLDERS (Multi-Directory Physical Scan) ───
if ($resource === 'folders') {
    respond(['success' => true, 'data' => scanAllDirectories()]);
}

// ── DOCUMENTS (CRUD, VIEW, STREAM, DOWNLOAD) ───
if ($resource === 'documents') {
    // 1. INLINE PREVIEW / STREAM
    if ($action === 'view') {
        $path = $_GET['path'] ?? '';
        if (!$path || !file_exists($path) || !isPathWithinStorage($path)) {
            http_response_code(404);
            echo "Document not found or access denied";
            exit();
        }
        $mime = getMimeType($path);
        header('Content-Type: ' . $mime);
        header('Content-Disposition: inline; filename="' . basename($path) . '"');
        header('Content-Length: ' . filesize($path));
        readfile($path);
        exit();
    }

    // 2. ATTACHMENT DOWNLOAD
    if ($action === 'download') {
        $path = $_GET['path'] ?? '';
        if (!$path || !file_exists($path) || !isPathWithinStorage($path)) {
            http_response_code(404);
            echo "Document not found or access denied";
            exit();
        }
        $mime = getMimeType($path);
        header('Content-Type: ' . $mime);
        header('Content-Disposition: attachment; filename="' . basename($path) . '"');
        header('Content-Length: ' . filesize($path));
        readfile($path);
        exit();
    }

    // 3. LIST ALL DOCUMENTS (DATATABLE FEED)
    if ($method === 'GET') {
        $custDb = readJson(CUSTOMERS_FILE);
        $customers = $custDb['customers'] ?? [];
        $folders = scanAllDirectories();
        $docsList = [];

        foreach ($folders as $f) {
            $folderName  = $f['folder'];
            $storageId   = $f['storage_id'];
            $storageName = $f['storage_name'];
            $folderPath  = $f['full_path'];

            $matchedCust = null;
            foreach ($customers as $c) {
                if (($c['folder_name'] ?? '') === $folderName) {
                    $matchedCust = $c;
                    break;
                }
            }

            foreach ($f['files'] as $fileName) {
                $filePath = $folderPath . DIRECTORY_SEPARATOR . $fileName;
                $sizeBytes = @filesize($filePath) ?: 0;
                $mtime = @filemtime($filePath) ?: time();
                $ext = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));

                $docsList[] = [
                    'name'          => $fileName,
                    'folder'        => $folderName,
                    'customer_id'   => $matchedCust['id'] ?? null,
                    'customer_name' => $matchedCust['name'] ?? $folderName,
                    'storage_id'    => $storageId,
                    'storage_name'  => $storageName,
                    'full_path'     => $filePath,
                    'size_bytes'    => $sizeBytes,
                    'size_formatted'=> formatBytes($sizeBytes),
                    'modified_date' => date('Y-m-d H:i', $mtime),
                    'ext'           => $ext
                ];
            }
        }

        respond(['success' => true, 'data' => $docsList, 'total' => count($docsList)]);
    }

    // 4. UPLOAD DOCUMENT (CREATE)
    if ($method === 'POST' && $action === 'upload') {
        if (empty($_FILES['document'])) {
            respond(['success' => false, 'message' => 'No file uploaded'], 400);
        }

        $file = $_FILES['document'];
        if ($file['error'] !== UPLOAD_ERR_OK) {
            respond(['success' => false, 'message' => 'File upload error code: ' . $file['error']], 400);
        }

        $targetFolder = trim($_POST['folder_name'] ?? '');
        $customerId   = trim($_POST['customer_id'] ?? '');
        $targetDirId  = trim($_POST['storage_dir_id'] ?? '');
        $customName   = trim($_POST['custom_name'] ?? '');

        $custDb = readJson(CUSTOMERS_FILE);
        $matchedCustIndex = -1;
        if ($customerId) {
            foreach ($custDb['customers'] as $idx => $c) {
                if ($c['id'] === $customerId) {
                    $matchedCustIndex = $idx;
                    $targetFolder = $c['folder_name'];
                    $targetDirId  = $c['storage_dir_id'] ?? $targetDirId;
                    break;
                }
            }
        }

        if (!$targetFolder) {
            respond(['success' => false, 'message' => 'Customer or folder name is required'], 400);
        }

        $dirs = getStorageDirectories();
        $targetDir = null;
        if ($targetDirId) {
            foreach ($dirs as $d) {
                if ($d['id'] === $targetDirId) { $targetDir = $d; break; }
            }
        }
        if (!$targetDir) $targetDir = getDefaultStorageDirectory();

        $destDir = rtrim($targetDir['path'], '\\/') . DIRECTORY_SEPARATOR . $targetFolder;
        if (!is_dir($destDir)) {
            @mkdir($destDir, 0755, true);
        }

        $originalExt = pathinfo($file['name'], PATHINFO_EXTENSION);
        if ($customName) {
            $destFileName = sanitizeFolderName(pathinfo($customName, PATHINFO_FILENAME)) . '.' . ($originalExt ?: 'pdf');
        } else {
            $destFileName = $file['name'];
        }

        $destFilePath = $destDir . DIRECTORY_SEPARATOR . $destFileName;
        if (!move_uploaded_file($file['tmp_name'], $destFilePath)) {
            respond(['success' => false, 'message' => 'Failed to save uploaded file to destination folder'], 500);
        }

        // Update customer JSON documents list if matched
        if ($matchedCustIndex >= 0) {
            if (!in_array($destFileName, $custDb['customers'][$matchedCustIndex]['documents'] ?? [])) {
                $custDb['customers'][$matchedCustIndex]['documents'][] = $destFileName;
                writeJson(CUSTOMERS_FILE, $custDb);
            }
        }

        respond([
            'success'   => true,
            'message'   => "Document '$destFileName' uploaded successfully!",
            'file_name' => $destFileName,
            'path'      => $destFilePath
        ]);
    }

    // 5. RENAME DOCUMENT (UPDATE)
    if ($method === 'POST' && $action === 'rename') {
        $oldPath = trim($body['path'] ?? '');
        $newName = trim($body['new_name'] ?? '');

        if (!$oldPath || !$newName) respond(['success' => false, 'message' => 'Old path and new name required'], 400);
        if (!file_exists($oldPath) || !isPathWithinStorage($oldPath)) {
            respond(['success' => false, 'message' => 'Document not found or access denied'], 404);
        }

        $oldExt = pathinfo($oldPath, PATHINFO_EXTENSION);
        if (!pathinfo($newName, PATHINFO_EXTENSION) && $oldExt) {
            $newName .= '.' . $oldExt;
        }

        $dir = dirname($oldPath);
        $newPath = $dir . DIRECTORY_SEPARATOR . $newName;

        if (file_exists($newPath) && strtolower($newPath) !== strtolower($oldPath)) {
            respond(['success' => false, 'message' => 'A file with this name already exists in this folder'], 400);
        }

        if (!@rename($oldPath, $newPath)) {
            respond(['success' => false, 'message' => 'Failed to rename file on disk'], 500);
        }

        $oldBaseName = basename($oldPath);
        $custDb = readJson(CUSTOMERS_FILE);
        $custUpdated = false;
        foreach ($custDb['customers'] as &$c) {
            if (!empty($c['documents']) && in_array($oldBaseName, $c['documents'])) {
                $c['documents'] = array_map(fn($d) => $d === $oldBaseName ? $newName : $d, $c['documents']);
                $custUpdated = true;
            }
        }
        if ($custUpdated) writeJson(CUSTOMERS_FILE, $custDb);

        respond(['success' => true, 'message' => "Document renamed to '$newName'", 'new_name' => $newName, 'new_path' => $newPath]);
    }

    // 6. DELETE DOCUMENT
    if ($method === 'POST' && $action === 'delete') {
        $filePath = trim($body['path'] ?? '');
        if (!$filePath || !file_exists($filePath) || !isPathWithinStorage($filePath)) {
            respond(['success' => false, 'message' => 'Document not found or access denied'], 404);
        }

        $baseName = basename($filePath);
        if (!@unlink($filePath)) {
            respond(['success' => false, 'message' => 'Failed to delete file from disk'], 500);
        }

        $custDb = readJson(CUSTOMERS_FILE);
        $custUpdated = false;
        foreach ($custDb['customers'] as &$c) {
            if (!empty($c['documents']) && in_array($baseName, $c['documents'])) {
                $c['documents'] = array_values(array_filter($c['documents'], fn($d) => $d !== $baseName));
                $custUpdated = true;
            }
        }
        if ($custUpdated) writeJson(CUSTOMERS_FILE, $custDb);

        respond(['success' => true, 'message' => "Document '$baseName' deleted successfully!"]);
    }
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
