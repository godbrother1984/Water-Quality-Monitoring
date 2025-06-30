<?php
// Set headers for JSON response
header('Content-Type: application/json');
ini_set('display_errors', 0); // Don't display errors to the user

// Define file paths
$settings_file = __DIR__ . '/../data/settings.json';
$defaults_file = __DIR__ . '/../data/settings.defaults.json';
$upload_dir = __DIR__ . '/../'; // Base directory for uploads path

// Helper function for sending JSON responses
function send_json_response($data, $status_code = 200) {
    http_response_code($status_code);
    echo json_encode($data);
    exit;
}

/**
 * Recursively extracts all media URLs from a config array.
 */
function extract_media_urls($config) {
    $urls = [];
    if (!is_array($config)) return $urls;
    
    $iterator = new RecursiveIteratorIterator(new RecursiveArrayIterator($config));
    foreach ($iterator as $key => $value) {
        if (is_string($value) && strpos($value, 'uploads/') === 0) {
            $urls[] = $value;
        }
    }
    return array_unique($urls);
}

// Main logic based on request method
switch ($_SERVER['REQUEST_METHOD']) {
    case 'GET':
        handle_get_request($settings_file, $defaults_file);
        break;
    case 'POST':
        handle_post_request($settings_file, $defaults_file, $upload_dir);
        break;
    default:
        send_json_response(['error' => 'Method Not Allowed'], 405);
        break;
}

/**
 * Handles GET requests to load the settings.
 */
function handle_get_request($settings_path, $defaults_path) {
    if (!file_exists($settings_path)) {
        if (!file_exists($defaults_path)) {
            send_json_response(['error' => 'Critical Error: settings.defaults.json is missing from the /data/ folder.'], 500);
        }
        if (!is_writable(dirname($settings_path))) {
             send_json_response(['error' => 'Permission Error: The /data/ directory is not writable. Please check server permissions.'], 500);
        }
        if (!copy($defaults_path, $settings_path)) {
            send_json_response(['error' => 'File Creation Error: Could not create settings.json from defaults.'], 500);
        }
        clearstatcache();
    }

    if (!is_readable($settings_path)) {
         send_json_response(['error' => 'Permission Error: The settings.json file is not readable.'], 500);
    }
    
    $content = file_get_contents($settings_path);
    if ($content === false) {
        send_json_response(['error' => 'File Read Error: Failed to read the settings.json file.'], 500);
    }
    
    json_decode($content);
    if (json_last_error() !== JSON_ERROR_NONE) {
        if (file_exists($defaults_path) && copy($defaults_path, $settings_path)) {
            clearstatcache();
        } else {
            send_json_response(['error' => 'File Corrupted: settings.json is invalid and could not be restored. Check permissions.'], 500);
        }
    }
    
    readfile($settings_path);
    exit;
}

/**
 * Handles POST requests to save settings, including cleanup and validation.
 */
function handle_post_request($settings_filepath, $defaults_filepath, $upload_base_dir) {
    $input_data = file_get_contents('php://input');
    if (empty($input_data)) {
        send_json_response(['error' => 'No data received.'], 400);
    }
    $new_config = json_decode($input_data, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        send_json_response(['error' => 'Invalid JSON data provided.'], 400);
    }

    // **NEW**: Handle "restore defaults" action first.
    if (isset($new_config['action']) && $new_config['action'] === 'restore_defaults') {
        if (!file_exists($defaults_filepath)) {
            send_json_response(['error' => 'Default settings file not found.'], 500);
        }
        if (copy($defaults_filepath, $settings_filepath)) {
            send_json_response(['success' => true, 'message' => 'Defaults restored successfully.']);
        } else {
            send_json_response(['error' => 'Failed to restore defaults. Check file permissions.'], 500);
        }
        return; // Important: exit after handling restore
    }


    // **NEW**: Server-side validation for incoming config data
    if (!isset($new_config['interval']) || !is_numeric($new_config['interval'])) {
        send_json_response(['error' => 'Invalid or missing "interval" value.'], 400);
    }
    if (!isset($new_config['params']) || !is_array($new_config['params'])) {
        send_json_response(['error' => 'Invalid or missing "params" array.'], 400);
    }
    // You can add more validation rules here as needed.


    // --- Cleanup Logic for Orphaned Files ---
    if (file_exists($settings_filepath)) {
        $old_config_json = file_get_contents($settings_filepath);
        $old_config = json_decode($old_config_json, true);

        if ($old_config) {
            $old_urls = extract_media_urls($old_config);
            $new_urls = extract_media_urls($new_config);
            
            $orphaned_urls = array_diff($old_urls, $new_urls);

            foreach ($orphaned_urls as $url) {
                $file_path = $upload_base_dir . $url;
                $real_base_path = realpath($upload_base_dir . 'uploads/');
                $real_file_path = realpath($file_path);

                if ($real_file_path && $real_base_path && strpos($real_file_path, $real_base_path) === 0) {
                    if (is_file($real_file_path)) {
                        @unlink($real_file_path);
                    }
                }
            }
        }
    }
    // --- End Cleanup Logic ---

    // Save the new settings
    $encoded_data = json_encode($new_config, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    if (file_put_contents($settings_filepath, $encoded_data, LOCK_EX) === false) {
        send_json_response(['error' => 'Failed to write settings to file. Check folder permissions.'], 500);
    } else {
        send_json_response(['success' => true, 'message' => 'Settings saved successfully.']);
    }
}
