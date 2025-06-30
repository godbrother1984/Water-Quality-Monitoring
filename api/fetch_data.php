<?php
ini_set('display_errors', 0); // Don't display errors to the user

// Define settings file path
$settings_file = __DIR__ . '/../data/settings.json';

// Check if settings file exists
if (!file_exists($settings_file)) {
    http_response_code(500);
    die('Error: Configuration file not found.');
}

// Read settings file content
$config_content = file_get_contents($settings_file);
$config = json_decode($config_content, true);

// Check for JSON decoding errors
if (json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(500);
    die('Error: Could not parse configuration file.');
}

// Get the API URL from the configuration
$apiUrl = $config['apiUrl'] ?? '';

if (empty($apiUrl) || !filter_var($apiUrl, FILTER_VALIDATE_URL)) {
    http_response_code(500);
    die('Error: API URL is not configured or is invalid in settings.');
}

// Use cURL to fetch data from the target API
$ch = curl_init();

// Set cURL options
curl_setopt($ch, CURLOPT_URL, $apiUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1); // Return the transfer as a string
curl_setopt($ch, CURLOPT_TIMEOUT, 15);        // Set a 15-second timeout
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true); // Follow redirects
curl_setopt($ch, CURLOPT_USERAGENT, 'WaterQualityDashboard/1.0'); // Set a user agent

// Execute the cURL request
$data = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);

// Close the cURL handle
curl_close($ch);

// Check the result of the cURL request
if ($data === false) {
    http_response_code(500);
    echo "cURL Error: " . $error;
} elseif ($http_code != 200) {
    http_response_code($http_code);
    echo "Error from source API - HTTP Status: " . $http_code;
} else {
    // Forward the content type from the source if possible, otherwise default
    // Note: For simplicity, we assume text/plain. For a robust solution, you'd parse curl_getinfo($ch, CURLINFO_CONTENT_TYPE)
    header('Content-Type: text/plain');
    echo $data;
}
?>
