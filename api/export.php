<?php
// ปิดการแสดง error โดยตรงกับผู้ใช้
ini_set('display_errors', 0);
error_reporting(0);

// กำหนด path ของไฟล์ settings
$settings_file = __DIR__ . '/../data/settings.json';

// ตรวจสอบว่าไฟล์มีอยู่จริงหรือไม่
if (!file_exists($settings_file) || !is_readable($settings_file)) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Settings file not found or is not readable.']);
    exit;
}

// อ่านข้อมูลจากไฟล์
$settings_content = file_get_contents($settings_file);

// ตั้งค่า HTTP Headers เพื่อให้เบราว์เซอร์ดาวน์โหลดไฟล์
header('Content-Type: application/json; charset=utf-8');
// ตั้งชื่อไฟล์ที่จะดาวน์โหลด
$filename = 'dashboard_settings_' . date('Y-m-d') . '.json';
header('Content-Disposition: attachment; filename="' . $filename . '"');
// ระบุขนาดของไฟล์
header('Content-Length: ' . strlen($settings_content));

// ส่งข้อมูลไฟล์ออกไป
echo $settings_content;
exit;
?>
