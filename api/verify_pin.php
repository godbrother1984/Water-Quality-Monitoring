<?php
header('Content-Type: application/json');
ini_set('display_errors', 0);

// Helper function for sending JSON responses
function send_pin_response($data, $status_code = 200) {
    http_response_code($status_code);
    echo json_encode($data);
    exit;
}

$settings_file = __DIR__ . '/../data/settings.json';

if (!file_exists($settings_file)) {
    send_pin_response(['success' => false, 'error' => 'Settings file not found.'], 500);
}

// Read the input from the request body
$input = json_decode(file_get_contents('php://input'), true);
$pin_to_check = $input['pin'] ?? '';

if (empty($pin_to_check) || !is_string($pin_to_check) || !preg_match('/^\d{1,6}$/', $pin_to_check)) {
    send_pin_response(['success' => false, 'error' => 'Invalid PIN format provided.'], 400);
}

// Read the entire settings file
$config_content = file_get_contents($settings_file);
$config = json_decode($config_content, true);
if (json_last_error() !== JSON_ERROR_NONE) {
    send_pin_response(['success' => false, 'error' => 'Could not parse settings file.'], 500);
}

// ใช้ pinHash แทน pin และเพิ่ม debug information
$stored_hash = $config['pinHash'] ?? '';

// Debug log (เปิดเมื่อต้องการ debug)
// error_log("PIN Check - Stored hash: " . $stored_hash);
// error_log("PIN Check - Input PIN: " . $pin_to_check);

// Check if a PIN has been set yet
if (empty($stored_hash)) {
    // No PIN is set, so create one
    if (strlen($pin_to_check) !== 6 || !preg_match('/^\d{6}$/', $pin_to_check)) {
        send_pin_response(['success' => false, 'error' => 'New PIN must be exactly 6 digits.'], 400);
    }
    
    $new_hash = password_hash($pin_to_check, PASSWORD_DEFAULT);
    $config['pinHash'] = $new_hash;
    
    // Save the updated config back to the file
    $encoded_data = json_encode($config, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    if (file_put_contents($settings_file, $encoded_data, LOCK_EX) === false) {
        send_pin_response(['success' => false, 'error' => 'Could not save new PIN. Check file permissions for /data/ folder.'], 500);
    }
    
    send_pin_response(['success' => true, 'action' => 'created', 'message' => 'PIN created successfully']);

} else {
    // A PIN exists, verify it
    if (password_verify($pin_to_check, $stored_hash)) {
        send_pin_response(['success' => true, 'action' => 'verified', 'message' => 'PIN verified successfully']);
    } else {
        send_pin_response(['success' => false, 'error' => 'Incorrect PIN. Please try again.']);
    }
}
?>