<?php
/**
 * แก้ปัญหา PIN ถาม PIN ทุกครั้งเมื่อเข้าหน้า Settings
 * สคริปต์นี้จะตรวจสอบและแก้ไขปัญหาโดยตรง
 */

echo "<h1>🔧 แก้ปัญหา PIN ถาม PIN ทุกครั้ง</h1>\n";

$settings_file = __DIR__ . '/data/settings.json';
$data_dir = __DIR__ . '/data';

// Step 1: ตรวจสอบสถานะปัจจุบัน
echo "<h2>📊 ตรวจสอบสถานะปัจจุบัน</h2>\n";

if (!file_exists($settings_file)) {
    echo "<p style='color: red;'>❌ ไฟล์ settings.json ไม่พบ - จะสร้างใหม่</p>\n";
    
    // สร้างไฟล์ settings.json ขั้นพื้นฐาน
    $basic_settings = [
        "dashboardTitle" => "Water Quality Monitoring",
        "retentionHours" => 48,
        "parameters" => []
    ];
    
    if (!is_dir($data_dir)) {
        mkdir($data_dir, 0755, true);
        echo "<p>✅ สร้างโฟลเดอร์ /data/</p>\n";
    }
    
    file_put_contents($settings_file, json_encode($basic_settings, JSON_PRETTY_PRINT));
    echo "<p>✅ สร้างไฟล์ settings.json ใหม่</p>\n";
} else {
    echo "<p>✅ ไฟล์ settings.json มีอยู่</p>\n";
}

// อ่านไฟล์และแสดงข้อมูล
$content = file_get_contents($settings_file);
$settings = json_decode($content, true);

echo "<h3>🔍 เนื้อหาไฟล์ settings.json:</h3>\n";
echo "<pre style='background: #f5f5f5; padding: 10px; border-radius: 5px; max-height: 300px; overflow-y: auto;'>" . htmlspecialchars($content) . "</pre>\n";

if ($settings === null) {
    echo "<p style='color: red;'>❌ ไฟล์ JSON เสียหาย</p>\n";
    exit;
}

// Step 2: วิเคราะห์ปัญหา
echo "<h2>🔍 วิเคราะห์ปัญหา</h2>\n";

$has_pin_hash = isset($settings['pinHash']) && !empty($settings['pinHash']);
$has_old_pin = isset($settings['pin']) && !empty($settings['pin']);

echo "<ul>\n";
echo "<li><strong>pinHash มีอยู่:</strong> " . ($has_pin_hash ? '✅ Yes' : '❌ No') . "</li>\n";
echo "<li><strong>pin เก่ามีอยู่:</strong> " . ($has_old_pin ? '⚠️ Yes' : '✅ No') . "</li>\n";

if ($has_pin_hash) {
    echo "<li><strong>pinHash value:</strong> " . substr($settings['pinHash'], 0, 30) . "...</li>\n";
    echo "<li><strong>pinHash length:</strong> " . strlen($settings['pinHash']) . " characters</li>\n";
    
    // ตรวจสอบว่า hash ดูถูกต้องหรือไม่
    $hash_info = password_get_info($settings['pinHash']);
    if ($hash_info['algo'] !== 0) {
        echo "<li>✅ pinHash format ถูกต้อง (Algorithm: " . $hash_info['algoName'] . ")</li>\n";
    } else {
        echo "<li>❌ pinHash format ไม่ถูกต้อง</li>\n";
    }
}

if ($has_old_pin) {
    echo "<li><strong>pin เก่า:</strong> " . htmlspecialchars($settings['pin']) . "</li>\n";
}
echo "</ul>\n";

// Step 3: แสดงแผนการแก้ไข
echo "<h2>🛠️ แผนการแก้ไข</h2>\n";

if (!$has_pin_hash && !$has_old_pin) {
    echo "<div style='background: #d1ecf1; padding: 15px; border-radius: 5px;'>\n";
    echo "<strong>สถานะ:</strong> ยังไม่มี PIN ใดๆ ตั้งไว้<br>\n";
    echo "<strong>คาดหวัง:</strong> ระบบควรถาม PIN ใหม่เมื่อเข้าหน้า Settings<br>\n";
    echo "<strong>หากยังมีปัญหา:</strong> ปัญหาอาจอยู่ที่ JavaScript Browser Cache\n";
    echo "</div>\n";
} elseif ($has_old_pin && !$has_pin_hash) {
    echo "<div style='background: #fff3cd; padding: 15px; border-radius: 5px;'>\n";
    echo "<strong>ปัญหา:</strong> มี PIN เก่า (plaintext) แต่ไม่มี pinHash<br>\n";
    echo "<strong>แก้ไข:</strong> จะแปลง PIN เก่าให้เป็น pinHash ใหม่\n";
    echo "</div>\n";
} elseif ($has_pin_hash) {
    echo "<div style='background: #d4edda; padding: 15px; border-radius: 5px;'>\n";
    echo "<strong>สถานะ:</strong> มี pinHash อยู่แล้ว<br>\n";
    echo "<strong>หากยังมีปัญหา:</strong> อาจเป็นปัญหาการอ่าน config ใน JavaScript\n";
    echo "</div>\n";
}

// Step 4: แก้ไขอัตโนมัติ
echo "<h2>🔧 การแก้ไขอัตโนมัติ</h2>\n";

$needs_save = false;

// กรณีที่ 1: มี PIN เก่าแต่ไม่มี pinHash
if ($has_old_pin && !$has_pin_hash) {
    echo "<p>🔄 แปลง PIN เก่าเป็น pinHash...</p>\n";
    $settings['pinHash'] = password_hash($settings['pin'], PASSWORD_DEFAULT);
    unset($settings['pin']); // ลบ PIN เก่า
    $needs_save = true;
    echo "<p>✅ แปลง PIN เป็น pinHash สำเร็จ</p>\n";
}

// กรณีที่ 2: ลบ PIN เก่าถ้ามีอยู่พร้อม pinHash
if ($has_old_pin && $has_pin_hash) {
    echo "<p>🗑️ ลบ PIN เก่าที่ซ้ำซ้อน...</p>\n";
    unset($settings['pin']);
    $needs_save = true;
    echo "<p>✅ ลบ PIN เก่าสำเร็จ</p>\n";
}

// บันทึกการเปลี่ยนแปลง
if ($needs_save) {
    $new_content = json_encode($settings, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    if (file_put_contents($settings_file, $new_content, LOCK_EX)) {
        echo "<p style='color: green;'>✅ บันทึกการเปลี่ยนแปลงสำเร็จ</p>\n";
    } else {
        echo "<p style='color: red;'>❌ ไม่สามารถบันทึกไฟล์ได้</p>\n";
    }
}

// Step 5: ทดสอบ API
echo "<h2>🧪 ทดสอบ API</h2>\n";

echo "<h3>ทดสอบการโหลด Settings</h3>\n";
$api_response = @file_get_contents('http://' . $_SERVER['HTTP_HOST'] . dirname($_SERVER['REQUEST_URI']) . '/api/settings.php');
if ($api_response) {
    $api_data = json_decode($api_response, true);
    if ($api_data && isset($api_data['pinHash'])) {
        echo "<p>✅ API settings.php ตอบกลับ pinHash สำเร็จ</p>\n";
        echo "<p><strong>pinHash จาก API:</strong> " . substr($api_data['pinHash'], 0, 30) . "...</p>\n";
    } else {
        echo "<p>⚠️ API settings.php ไม่มี pinHash</p>\n";
    }
} else {
    echo "<p>❌ ไม่สามารถเรียก API settings.php ได้</p>\n";
}

// Step 6: คำแนะนำขั้นตอนต่อไป
echo "<h2>📋 ขั้นตอนต่อไป</h2>\n";

echo "<ol>\n";
echo "<li><strong>ล้าง Browser Cache:</strong> กด Ctrl+F5 หรือ Cmd+Shift+R</li>\n";
echo "<li><strong>เปิด Developer Tools:</strong> กด F12 และดู Console มีข้อผิดพลาดหรือไม่</li>\n";
echo "<li><strong>ทดสอบ API โดยตรง:</strong> เปิด <a href='api/settings.php' target='_blank'>api/settings.php</a> และตรวจสอบว่ามี pinHash หรือไม่</li>\n";
echo "<li><strong>ถ้ายังไม่หาย:</strong> ใช้สคริปต์ temporary_bypass.php ข้างล่าง</li>\n";
echo "</ol>\n";

// สถิติสรุป
echo "<h2>📊 สรุปสถานะ</h2>\n";
echo "<table border='1' style='border-collapse: collapse; width: 100%;'>\n";
echo "<tr><th>รายการ</th><th>สถานะ</th></tr>\n";
echo "<tr><td>ไฟล์ settings.json</td><td>" . (file_exists($settings_file) ? '✅ มี' : '❌ ไม่มี') . "</td></tr>\n";
echo "<tr><td>pinHash</td><td>" . ($has_pin_hash ? '✅ มี' : '❌ ไม่มี') . "</td></tr>\n";
echo "<tr><td>PIN เก่า</td><td>" . ($has_old_pin ? '⚠️ มี' : '✅ ไม่มี') . "</td></tr>\n";
echo "<tr><td>สิทธิ์เขียนไฟล์</td><td>" . (is_writable($settings_file) ? '✅ ได้' : '❌ ไม่ได้') . "</td></tr>\n";
echo "</table>\n";

if (file_exists($settings_file)) {
    $final_content = file_get_contents($settings_file);
    $final_settings = json_decode($final_content, true);
    
    echo "<h3>เนื้อหาไฟล์หลังแก้ไข:</h3>\n";
    echo "<pre style='background: #e7f3ff; padding: 10px; border-radius: 5px; max-height: 200px; overflow-y: auto;'>" . htmlspecialchars($final_content) . "</pre>\n";
}
?>