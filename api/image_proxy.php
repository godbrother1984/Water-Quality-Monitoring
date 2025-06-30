<?php
// ปิดการแสดง error และการบัฟเฟอร์ข้อมูล เพื่อให้สามารถสตรีมได้
@ini_set('display_errors', 0);
@error_reporting(0);
@ini_set('output_buffering', 'off');
@ini_set('zlib.output_compression', false);

// หากมี output buffer อยู่ ให้ล้างทิ้ง
while (@ob_end_flush());

// รับ URL ของไฟล์จาก parameter
$url = $_GET['url'] ?? '';

// --- การตรวจสอบความปลอดภัยเบื้องต้น ---
if (empty($url) || !filter_var($url, FILTER_VALIDATE_URL)) {
    http_response_code(400);
    header('Content-Type: text/plain');
    die('Error: Invalid or no URL provided.');
}

$url_host = parse_url($url, PHP_URL_HOST);
$allowed_domains = [
    'drive.google.com',
    'doc-0s-0s-docs.googleusercontent.com', // โดเมนที่ Google Drive อาจ redirect ไป
    // สามารถเพิ่มโดเมนอื่นๆ ได้ที่นี่
];

// ตรวจสอบโดเมนอีกครั้งหลังการ redirect (cURL จะจัดการให้)
// แต่การตรวจสอบเบื้องต้นก็ยังดี
if (!in_array($url_host, $allowed_domains)) {
    http_response_code(403);
    header('Content-Type: text/plain');
    die('Error: Access to this domain is not allowed.');
}

// --- เริ่มกระบวนการสตรีมมิ่งด้วย cURL ---
$ch = curl_init();

curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true); // ติดตามการ redirect อัตโนมัติ
curl_setopt($ch, CURLOPT_RETURNTRANSFER, false); // **สำคัญ:** ตั้งเป็น false เพื่อให้ echo ข้อมูลออกไปทันที
curl_setopt($ch, CURLOPT_BINARYTRANSFER, true);
curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 15);
curl_setopt($ch, CURLOPT_TIMEOUT, 0); // ไม่จำกัดเวลาในการดาวน์โหลด
curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);

// ฟังก์ชันสำหรับจัดการ Header ที่ได้รับจากเซิร์ฟเวอร์ปลายทาง
// เราจะส่ง Header ส่วนใหญ่ต่อไปยังเบราว์เซอร์
curl_setopt($ch, CURLOPT_HEADERFUNCTION, function($curl, $header) {
    // ไม่ส่งต่อ Header บางตัวที่อาจก่อให้เกิดปัญหา
    $lower_header = strtolower($header);
    if (strpos($lower_header, 'transfer-encoding:') === false && 
        strpos($lower_header, 'content-disposition:') === false) {
        header($header);
    }
    return strlen($header);
});

// ฟังก์ชันสำหรับจัดการข้อมูลที่ได้รับ (ตัวไฟล์)
// เราจะ echo ข้อมูลที่ได้มาแต่ละส่วนออกไปทันที
curl_setopt($ch, CURLOPT_WRITEFUNCTION, function($curl, $data) {
    echo $data;
    // ส่งข้อมูลออกไปทันที
    @ob_flush();
    @flush();
    return strlen($data);
});

// เริ่มการทำงาน
$result = curl_exec($ch);

// หากเกิดข้อผิดพลาด ให้บันทึกลง log ของเซิร์ฟเวอร์ (ถ้าทำได้)
if (curl_errno($ch)) {
    // ไม่สามารถส่ง http_response_code ได้แล้วเพราะ header ถูกส่งไปแล้ว
    // แต่เราสามารถบันทึก error ไว้ดูได้
    error_log("cURL Error in image_proxy.php: " . curl_error($ch));
}

curl_close($ch);

exit;
?>
