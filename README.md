# Water Quality Monitoring Dashboard (PHP Version)

แดชบอร์ดสำหรับเฝ้าระวังและแสดงผลข้อมูลคุณภาพน้ำ (หรือข้อมูล IoT อื่นๆ) แบบเรียลไทม์ สร้างขึ้นโดยใช้ PHP เป็น Backend และ JavaScript (Vanilla JS) แบบโมดูลเป็น Frontend สามารถปรับแต่งการแสดงผลและพารามิเตอร์ได้อย่างยืดหยุ่นผ่านหน้าตั้งค่า

---

## ✨ คุณสมบัติหลัก (Key Features)

* **Customizable Dashboard**: ปรับแต่ง Logo, ข้อความ, และภาพพื้นหลังของแดชบอร์ดได้
* **Multiple Views**: สลับการแสดงผลระหว่างหน้า Dashboard, Graph, Device Status, และ Settings
* **Real-time & Simulated Data**: เลือกโหมดการทำงานของแต่ละพารามิเตอร์ได้ระหว่างการดึงข้อมูลจริงจาก API หรือการจำลองข้อมูลเพื่อทดสอบ
* **Historical Data Graphing**: กราฟแสดงข้อมูลย้อนหลังที่สามารถซูมและเลือกช่วงเวลาที่ต้องการดูได้ (Zoom & Pan)
* **Data Summary & Log**: สรุปค่าสถิติ (Min, Max, Avg) และแสดงข้อมูลดิบในรูปแบบตารางในหน้ากราฟ
* **PIN-protected Settings**: หน้าตั้งค่ามีการป้องกันด้วยรหัส PIN 6 หลัก
* **Configuration Management**: สามารถนำเข้า (Import) และส่งออก (Export) ไฟล์การตั้งค่าทั้งหมดได้
* **Content Rotation**: หมุนเวียนการแสดงผลบนแดชบอร์ดระหว่างกราฟ, รูปภาพ, และวิดีโอ (จากไฟล์ที่อัปโหลดหรือ YouTube) ได้โดยอัตโนมัติ

---

## 🛠️ สิ่งที่ต้องมี (Prerequisites)

* เว็บเซิร์ฟเวอร์ที่รองรับ PHP (เช่น Apache, Nginx)
* PHP เวอร์ชั่น 7.0 ขึ้นไป (เนื่องจากใช้ฟังก์ชัน `password_hash`)
* เปิดใช้งาน PHP Extension: `cURL` (สำหรับ `fetch_data.php`) และ `fileinfo` (สำหรับ `upload_handler.php`)
* โฟลเดอร์ `/data/` และ `/uploads/` ต้องสามารถเขียนไฟล์ได้ (Writable permissions)

---

## 🚀 การติดตั้ง (Installation)

1.  คัดลอกไฟล์ทั้งหมดของโปรเจกต์ไปวางไว้บนเว็บเซิร์ฟเวอร์ของคุณ
2.  ตั้งค่า Permission ของโฟลเดอร์ `/data/` และ `/uploads/` ให้เว็บเซิร์ฟเวอร์สามารถเขียนไฟล์ได้ (เช่น `chmod 755` หรือ `775` ขึ้นอยู่กับการตั้งค่าของเซิร์ฟเวอร์)
3.  **(สำคัญมาก)** เพื่อความปลอดภัย ควรตั้งค่าไฟล์ `.htaccess` ในโฟลเดอร์ `/data/` เพื่อป้องกันการเข้าถึงไฟล์ข้อมูลโดยตรงจากเบราว์เซอร์ โดยสร้างไฟล์ `.htaccess` และใส่เนื้อหาดังนี้:
    ```
    Deny from all
    ```
4.  เข้าถึงไฟล์ `index.php` ผ่านทางเว็บเบราว์เซอร์
5.  เมื่อเข้าสู่หน้า "Settings" ครั้งแรก ระบบจะบังคับให้คุณตั้งรหัส PIN 6 หลักใหม่ ซึ่งจะใช้สำหรับการเข้าถึงหน้าตั้งค่าในครั้งต่อๆ ไป

---

## 📂 โครงสร้างไฟล์และโฟลเดอร์ (File Structure)


/water-dashboard/
|
|-- api/
|   |-- change_pin.php
|   |-- export.php
|   |-- fetch_data.php
|   |-- get_changelog.php
|   |-- graph_data.php
|   |-- image_proxy.php
|   |-- settings.php
|   |-- upload_handler.php
|   -- verify_pin.php | |-- assets/ |   |-- js/ |   |   |-- modules/ |   |   |   |-- config.js |   |   |   |-- dashboard.js |   |   |   |-- graph.js |   |   |   |-- helpers.js |   |   |   |-- mediaPicker.js |   |   |   |-- pinManager.js |   |   |   |-- settings.js |   |   |   |-- settingsUI.js |   |   |   |-- state.js |   |   |   -- status.js
|   |   |
|   |   -- app.js |   | |   -- style.css
|
|-- data/
|   |-- .htaccess
|   |-- settings.json
|   |-- settings.defaults.json
|   |-- changelog.json
|   -- graph_history_YYYY-MM.jsonl | |-- uploads/ |   |-- (ไฟล์ที่ผู้ใช้อัปโหลด) | -- index.php


### คำอธิบายแต่ละส่วน

* **`/api/`**: โฟลเดอร์สำหรับ PHP สคริปต์ทั้งหมดที่ทำหน้าที่เป็น Backend ของระบบ
    * `settings.php`: จัดการการอ่านและเขียนไฟล์ตั้งค่า `settings.json`
    * `fetch_data.php`: ทำหน้าที่เป็น Proxy ในการดึงข้อมูลจาก API ปลายทางเพื่อแก้ปัญหา CORS
    * `graph_data.php`: จัดการข้อมูลกราฟย้อนหลัง (อ่าน/เขียน/ล้างข้อมูล)
    * `upload_handler.php`: จัดการการอัปโหลดไฟล์มีเดีย
    * `verify_pin.php` & `change_pin.php`: จัดการความปลอดภัยของรหัส PIN

* **`/assets/`**: โฟลเดอร์เก็บไฟล์สำหรับฝั่ง Frontend ทั้งหมด
    * `/js/modules/`: เก็บโค้ด JavaScript ที่แยกเป็นส่วนๆ ตามหน้าที่ ทำให้ง่ายต่อการบำรุงรักษา
    * `app.js`: ไฟล์หลักที่นำเข้าและควบคุมการทำงานของโมดูลทั้งหมด
    * `style.css`: ไฟล์ CSS หลักสำหรับตกแต่งหน้าเว็บ

* **`/data/`**: โฟลเดอร์สำหรับเก็บไฟล์ข้อมูลสำคัญของระบบ **(ควรป้องกันการเข้าถึงจากภายนอก)**
    * `settings.json`: ไฟล์ที่เก็บการตั้งค่าปัจจุบันทั้งหมดของแดชบอร์ด
    * `settings.defaults.json`: ไฟล์ค่าเริ่มต้นสำหรับใช้เมื่อผู้ใช้กด "Restore Defaults"
    * `graph_history_YYYY-MM.jsonl`: ไฟล์เก็บข้อมูลย้อนหลังของกราฟในรูปแบบ JSONL (JSON per Line) ซึ่งจะถูกสร้างขึ้นใหม่ทุกเดือน

* **`/uploads/`**: โฟลเดอร์สำหรับเก็บไฟล์ที่ผู้ใช้อัปโหลดผ่านหน้าตั้งค่า เช่น โลโก้, ภาพพื้นหลัง

* **`index.php`**: ไฟล์หลักของแอปพลิเคชัน ทำหน้าที่เป็นโครงสร้าง HTML ทั้งหมดและเรียกใช้ `app.js` เพื่อเริ่มต้นการทำงานของ Frontend
