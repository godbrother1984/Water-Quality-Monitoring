<?php
// Set headers for JSON response
header('Content-Type: application/json');

// --- Configuration ---
$upload_directory = __DIR__ . '/../uploads/';
$max_file_size = 20 * 1024 * 1024; // 20 MB
$allowed_image_types = ['image/jpeg', 'image/png', 'image/gif', 'image/svg+xml'];
$allowed_video_types = ['video/mp4', 'video/webm', 'video/ogg'];
$allowed_mime_types = array_merge($allowed_image_types, $allowed_video_types);

// --- Helper Functions ---
function send_json_error($message, $status_code = 400) {
    http_response_code($status_code);
    echo json_encode(['success' => false, 'error' => $message]);
    exit;
}

// --- Main Logic ---

// 1. Check if the uploads directory exists and is writable
if (!file_exists($upload_directory)) {
    if (!mkdir($upload_directory, 0755, true)) {
        send_json_error('Uploads directory cannot be created. Check permissions.', 500);
    }
}
if (!is_writable($upload_directory)) {
    send_json_error('Uploads directory is not writable. Check permissions.', 500);
}

// 2. Check if a file was uploaded
if (!isset($_FILES['file']) || !is_uploaded_file($_FILES['file']['tmp_name'])) {
    send_json_error('No file was uploaded.');
}

$file = $_FILES['file'];

// 3. Check for upload errors
if ($file['error'] !== UPLOAD_ERR_OK) {
    $error_messages = [
        UPLOAD_ERR_INI_SIZE   => 'The uploaded file exceeds the upload_max_filesize directive in php.ini.',
        UPLOAD_ERR_FORM_SIZE  => 'The uploaded file exceeds the MAX_FILE_SIZE directive that was specified in the HTML form.',
        UPLOAD_ERR_PARTIAL    => 'The uploaded file was only partially uploaded.',
        UPLOAD_ERR_NO_FILE    => 'No file was uploaded.',
        UPLOAD_ERR_NO_TMP_DIR => 'Missing a temporary folder.',
        UPLOAD_ERR_CANT_WRITE => 'Failed to write file to disk.',
        UPLOAD_ERR_EXTENSION  => 'A PHP extension stopped the file upload.',
    ];
    $error_message = $error_messages[$file['error']] ?? 'Unknown upload error.';
    send_json_error($error_message);
}

// 4. Validate file size
if ($file['size'] > $max_file_size) {
    send_json_error('File is too large. Maximum size is ' . ($max_file_size / 1024 / 1024) . ' MB.');
}

// 5. Validate MIME type
$finfo = new finfo(FILEINFO_MIME_TYPE);
$mime_type = $finfo->file($file['tmp_name']);
if (!in_array($mime_type, $allowed_mime_types)) {
    send_json_error('Invalid file type. Allowed types: ' . implode(', ', $allowed_mime_types));
}

// 6. Generate a unique filename
$file_extension = pathinfo($file['name'], PATHINFO_EXTENSION);
$safe_extension = strtolower($file_extension);
$unique_filename = uniqid('media_', true) . '.' . $safe_extension;
$destination_path = $upload_directory . $unique_filename;

// 7. Move the file
if (move_uploaded_file($file['tmp_name'], $destination_path)) {
    // Return the relative URL to the file
    $url = 'uploads/' . $unique_filename;
    echo json_encode(['success' => true, 'url' => $url]);
} else {
    send_json_error('Failed to move uploaded file.', 500);
}
?>
