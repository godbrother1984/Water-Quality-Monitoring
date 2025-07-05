<?php
/**
 * สคริปต์สำหรับรีเซ็ต PIN โดยการลบ pinHash ออกจาก settings.json
 * ใช้เมื่อต้องการให้ระบบถาม PIN ใหม่อีกครั้ง
 * 
 * วิธีใช้: เรียกไฟล์นี้ผ่านเบราว์เซอร์หรือรัน PHP CLI
 */

// กำหนด path ของไฟล์ settings
$settings_file = __DIR__ . '/data/settings.json';

echo "<h2>PIN Reset Tool</h2>\n";

// ตรวจสอบว่าไฟล์มีอยู่หรือไม่
if (!file_exists($settings_file)) {
    echo "<p style='color: red;'>❌ ไฟล์ settings.json ไม่พบ!</p>\n";
    echo "<p>Path: " . $settings_file . "</p>\n";
    exit;
}

// อ่านไฟล์ settings.json
$settings_content = file_get_contents($settings_file);
$settings = json_decode($settings_content, true);

if (!$settings) {
    echo "<p style='color: red;'>❌ ไฟล์ settings.json เสียหาย หรือไม่ใช่ JSON ที่ถูกต้อง!</p>\n";
    exit;
}

// ตรวจสอบว่ามี pinHash หรือไม่
if (isset($settings['pinHash'])) {
    echo "<p style='color: orange;'>🔍 พบ pinHash ในไฟล์: " . substr($settings['pinHash'], 0, 20) . "...</p>\n";
    
    // ลบ pinHash ออก
    unset($settings['pinHash']);
    
    // เขียนข้อมูลกลับ
    $new_content = json_encode($settings, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    
    if (file_put_contents($settings_file, $new_content) !== false) {
        echo "<p style='color: green;'>✅ รีเซ็ต PIN สำเร็จ!</p>\n";
        echo "<p>ตอนนี้เมื่อเข้าหน้า Settings จะถาม PIN ใหม่</p>\n";
    } else {
        echo "<p style='color: red;'>❌ ไม่สามารถเขียนไฟล์ได้! ตรวจสอบ permissions</p>\n";
    }
} else {
    echo "<p style='color: blue;'>ℹ️ ไม่พบ pinHash ในไฟล์ (ยังไม่มี PIN ตั้งไว้)</p>\n";
    echo "<p>เมื่อเข้าหน้า Settings ควรถาม PIN ใหม่อยู่แล้ว</p>\n";
}

echo "\n<hr>\n";
echo "<h3>ข้อมูลปัจจุบันในไฟล์ settings.json:</h3>\n";
echo "<pre>" . htmlspecialchars($settings_content) . "</pre>\n";

// แสดงข้อมูล Debug
echo "\n<h3>ข้อมูล Debug:</h3>\n";
echo "<ul>\n";
echo "<li>ไฟล์ path: " . $settings_file . "</li>\n";
echo "<li>ไฟล์มีอยู่: " . (file_exists($settings_file) ? 'Yes' : 'No') . "</li>\n";
echo "<li>สามารถอ่านได้: " . (is_readable($settings_file) ? 'Yes' : 'No') . "</li>\n";
echo "<li>สามารถเขียนได้: " . (is_writable($settings_file) ? 'Yes' : 'No') . "</li>\n";
echo "<li>ขนาดไฟล์: " . filesize($settings_file) . " bytes</li>\n";
echo "</ul>\n";
?>