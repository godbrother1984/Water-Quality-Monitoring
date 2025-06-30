<?php
header('Content-Type: application/json');
ini_set('display_errors', 0);

// --- File Path & Helper ---
$settings_file = __DIR__ . '/../data/settings.json';

function send_pin_response($data, $status_code = 200) {
    http_response_code($status_code);
    echo json_encode($data);
    exit;
}

// --- Main Logic ---
if (!file_exists($settings_file) || !is_writable($settings_file)) {
    send_pin_response(['success' => false, 'error' => 'Settings file not found or is not writable.'], 500);
}

// 1. Get input data
$input = json_decode(file_get_contents('php://input'), true);
$current_pin = $input['currentPin'] ?? '';
$new_pin = $input['newPin'] ?? '';

if (empty($current_pin) || empty($new_pin) || !preg_match('/^\d{6}$/', $new_pin)) {
    send_pin_response(['success' => false, 'error' => 'Invalid or missing data. New PIN must be 6 digits.'], 400);
}

// 2. Read current settings
$config_content = file_get_contents($settings_file);
$config = json_decode($config_content, true);
if (!$config) {
    send_pin_response(['success' => false, 'error' => 'Could not parse settings file.'], 500);
}

$stored_hash = $config['pinHash'] ?? '';
if (empty($stored_hash)) {
    send_pin_response(['success' => false, 'error' => 'No PIN is currently set. Cannot change.'], 400);
}

// 3. Verify the CURRENT PIN
if (!password_verify($current_pin, $stored_hash)) {
    send_pin_response(['success' => false, 'error' => 'Incorrect current PIN.']);
}

// 4. If current PIN is correct, hash and save the NEW PIN
$new_hash = password_hash($new_pin, PASSWORD_DEFAULT);
$config['pinHash'] = $new_hash;

$encoded_data = json_encode($config, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

if (file_put_contents($settings_file, $encoded_data) === false) {
    send_pin_response(['success' => false, 'error' => 'Could not save the new PIN. Check file permissions.'], 500);
}

send_pin_response(['success' => true, 'message' => 'PIN changed successfully.']);
