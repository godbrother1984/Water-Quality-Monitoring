<?php
// settings.php

// Disable direct error output for production, but enable logging
ini_set('display_errors', 0);
ini_set('log_errors', 1);
// You might want to specify a writable log file path:
// ini_set('error_log', '/path/to/your/php-error.log');


header('Content-Type: application/json');

// Define file paths
$data_dir = __DIR__ . '/../data';
$settings_file = $data_dir . '/settings.json';
$defaults_file = $data_dir . '/settings.defaults.json';

// Function to send a JSON response and exit
function send_json_response($data, $status_code = 200) {
    http_response_code($status_code);
    echo json_encode($data);
    exit;
}

// Function to get current settings or defaults
function get_settings($settings_file, $defaults_file) {
    if (file_exists($settings_file)) {
        $content = file_get_contents($settings_file);
        // Check if file is empty or corrupted
        $data = json_decode($content, true);
        if (json_last_error() === JSON_ERROR_NONE) {
            return $data;
        }
    }
    // Fallback to defaults if settings.json doesn't exist or is invalid
    if (file_exists($defaults_file)) {
        return json_decode(file_get_contents($defaults_file), true);
    }
    return []; // Return empty array if no file found
}


// --- Main Logic ---

$action = $_GET['action'] ?? null;
$method = $_SERVER['REQUEST_METHOD'];


// Handle POST request (Save settings)
if ($method === 'POST') {
    $input_data = file_get_contents('php://input');
    $newSettings = json_decode($input_data, true);

    if (json_last_error() !== JSON_ERROR_NONE) {
        send_json_response(['success' => false, 'error' => 'Invalid JSON data received.'], 400);
    }

    // Preserve the existing PIN Hash (critical for security)
    $currentSettings = get_settings($settings_file, $defaults_file);
    if (isset($currentSettings['pinHash']) && !empty($currentSettings['pinHash'])) {
        $newSettings['pinHash'] = $currentSettings['pinHash'];
    }
    
    // Also preserve legacy PIN if exists (for backward compatibility)
    if (isset($currentSettings['pin']) && !empty($currentSettings['pin'])) {
        $newSettings['pin'] = $currentSettings['pin'];
    }

    // Write the updated settings object back to the file
    $encoded_data = json_encode($newSettings, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    
    // file_put_contents can fail due to permissions
    if (file_put_contents($settings_file, $encoded_data, LOCK_EX) === false) {
        send_json_response(['success' => false, 'error' => 'Failed to write settings to file. Check server permissions for the /data folder.'], 500);
    } else {
        send_json_response(['success' => true, 'message' => 'Settings saved successfully.']);
    }
}


// Handle GET request (Fetch settings or Reset)
if ($method === 'GET') {
    if ($action === 'reset') {
        if (!file_exists($defaults_file)) {
            send_json_response(['success' => false, 'error' => 'Defaults file not found.'], 404);
        }
        if (!is_writable($settings_file) && (file_exists($settings_file) || !is_writable(dirname($settings_file)))) {
            send_json_response(['success' => false, 'error' => 'Cannot restore defaults. Check server permissions for the /data folder.'], 500);
        }
        
        // Read current settings to preserve PIN
        $currentSettings = get_settings($settings_file, $defaults_file);
        $savedPinHash = $currentSettings['pinHash'] ?? '';
        $savedPin = $currentSettings['pin'] ?? '';
        
        // Copy defaults and restore PIN
        $defaultsContent = file_get_contents($defaults_file);
        $defaults = json_decode($defaultsContent, true);
        
        if ($savedPinHash) {
            $defaults['pinHash'] = $savedPinHash;
        }
        if ($savedPin) {
            $defaults['pin'] = $savedPin;
        }
        
        $encoded_data = json_encode($defaults, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        
        if (file_put_contents($settings_file, $encoded_data, LOCK_EX)) {
             send_json_response(['success' => true, 'message' => 'Settings reset to defaults. PIN preserved.']);
        } else {
             send_json_response(['success' => false, 'error' => 'An error occurred while restoring defaults.'], 500);
        }
    } else {
        // Fetch current settings
        $settings = get_settings($settings_file, $defaults_file);
        
        // Create a copy for client-side that includes pinHash info but not the actual hash
        $clientSettings = $settings;
        
        // Keep a boolean flag to indicate if PIN is set (for frontend logic)
        $clientSettings['hasPinSet'] = isset($settings['pinHash']) && !empty($settings['pinHash']);
        
        // For security, never send the actual PIN hash or plaintext PIN to the client-side
        unset($clientSettings['pin']);
        unset($clientSettings['pinHash']);
        
        send_json_response($clientSettings);
    }
}

// If the request method is not supported
send_json_response(['success' => false, 'error' => 'Method Not Allowed'], 405);
?>