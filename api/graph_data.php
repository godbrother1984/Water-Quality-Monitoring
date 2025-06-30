<?php
// ปิดการแสดง error โดยตรงกับผู้ใช้ แต่ให้บันทึกเป็น log แทน
ini_set('display_errors', 0);
error_reporting(E_ALL);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/../data/php_error.log');

// --- การตั้งค่าหลัก ---
$settings_file = __DIR__ . '/../data/settings.json';
$data_directory = __DIR__ . '/../data/';
$file_prefix = 'graph_history_';
$file_extension = '.jsonl';

// --- ฟังก์ชันช่วยเหลือ ---
function send_json_response($data, $status_code = 200) {
    http_response_code($status_code);
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
}

// --- การทำงานหลัก ---
switch ($_SERVER['REQUEST_METHOD']) {
    case 'GET':
        handle_get_request($data_directory, $settings_file, $file_prefix, $file_extension);
        break;
    case 'POST':
        handle_post_request($data_directory, $file_prefix, $file_extension);
        break;
    default:
        send_json_response(['error' => 'Method Not Allowed'], 405);
        break;
}

/**
 * จัดการการอ่านข้อมูลจากไฟล์รายเดือน
 */
function handle_get_request($data_dir, $settings_path, $prefix, $ext) {
    $retention_hours = 48; // ค่า default
    if (file_exists($settings_path)) {
        $config = json_decode(file_get_contents($settings_path), true);
        if ($config && isset($config['retentionHours'])) {
            $retention_hours = (int)$config['retentionHours'];
        }
    }
    
    $retention_seconds = $retention_hours * 3600;
    $now_timestamp = time();
    $cutoff_timestamp = $now_timestamp - $retention_seconds;
    
    $history_data = [];

    // หาไฟล์ที่ต้องอ่าน
    $files_to_read = [];
    for ($i = 0; $i <= ($retention_hours / 24 / 30) + 1; $i++) {
        $date_to_check = strtotime("-{$i} month", $now_timestamp);
        $filename = $data_dir . $prefix . date('Y-m', $date_to_check) . $ext;
        if (file_exists($filename)) {
            $files_to_read[] = $filename;
        }
    }
    $files_to_read = array_unique($files_to_read);

    // อ่านข้อมูลจากไฟล์ที่เกี่ยวข้อง
    foreach ($files_to_read as $filepath) {
        $handle = @fopen($filepath, 'r');
        if ($handle) {
            while (($line = fgets($handle)) !== false) {
                if (trim($line) === '') continue;

                $record = json_decode($line, true);
                if ($record && isset($record['data']['x'])) {
                    $point_timestamp_ms = strtotime($record['data']['x']) * 1000;
                    
                    if ($point_timestamp_ms >= ($cutoff_timestamp * 1000)) {
                        $key = $record['key'];
                        if (!isset($history_data[$key])) {
                            $history_data[$key] = [];
                        }
                        $history_data[$key][] = $record['data'];
                    }
                }
            }
            fclose($handle);
        }
    }

    send_json_response($history_data);
}

/**
 * จัดการการเขียนข้อมูลลงไฟล์รายเดือน
 */
function handle_post_request($data_dir, $prefix, $ext) {
    $input_json = file_get_contents('php://input');
    $input_data = json_decode($input_json, true);

    if (json_last_error() !== JSON_ERROR_NONE) {
         send_json_response(['error' => 'Invalid data format provided.'], 400);
    }

    // Action: ล้างข้อมูลประวัติทั้งหมด
    if (isset($input_data['action']) && $input_data['action'] === 'clear_history') {
        $files = glob($data_dir . $prefix . '*' . $ext);
        foreach ($files as $file) {
            if (is_file($file)) {
                unlink($file);
            }
        }
        send_json_response(['success' => true, 'message' => 'All graph history has been cleared.']);
        return;
    }
    
    // Action: เพิ่มข้อมูลใหม่
    if (isset($input_data['jsonKey']) && isset($input_data['dataPoint'])) {
        $current_file = $data_dir . $prefix . date('Y-m') . $ext;
        
        $json_key = $input_data['jsonKey'];
        $data_point = $input_data['dataPoint'];

        $record = ['key' => $json_key, 'data' => $data_point];
        $line_to_append = json_encode($record) . "\n";

        if (file_put_contents($current_file, $line_to_append, FILE_APPEND | LOCK_EX) !== false) {
            send_json_response(['success' => true]);
        } else {
            send_json_response(['error' => 'Could not write to history file. Check permissions for the /data/ folder.'], 500);
        }
        return;
    }
    
    send_json_response(['error' => 'Invalid action or data provided.'], 400);
}
