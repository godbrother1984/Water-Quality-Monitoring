<?php
header('Content-Type: application/json');
$changelog_file = __DIR__ . '/../data/changelog.json';

if (file_exists($changelog_file)) {
    readfile($changelog_file);
} else {
    http_response_code(404);
    echo json_encode(['error' => 'Changelog file not found.']);
}
