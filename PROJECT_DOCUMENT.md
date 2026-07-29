# DMS/MMS Monitoring - Project Document

## 1. Tổng quan

DMS/MMS Monitoring là hệ thống theo dõi trạng thái máy theo thời gian thực. Hệ thống nhận tín hiệu từ thiết bị qua MQTT, lưu dữ liệu vào MongoDB, tính trạng thái máy và hiển thị trên giao diện web.

Mục tiêu chính:

- Theo dõi trạng thái máy theo master data và trạng thái hệ thống Chưa có dữ liệu.
- Máy mới tạo mặc định là Chưa có dữ liệu.
- Hiển thị dashboard tổng quan theo khu vực.
- Cung cấp màn hình giám sát cho ca trực.
- Lưu lịch sử tín hiệu và lịch sử đổi trạng thái.
- Cho phép cấu hình master data khu vực, trạng thái, màu trạng thái và theme.

## 2. Kiến trúc hệ thống

```text
Thiết bị máy
  -> MQTT / EMQX
  -> Backend Node.js
  -> MongoDB
  -> REST API + Socket.IO
  -> Frontend Vue/Vite
```

Vai trò từng phần:

- **MQTT/EMQX**: nhận tín hiệu từ thiết bị.
- **Backend**: xử lý tín hiệu, tính trạng thái, lưu log và phát realtime event.
- **MongoDB**: lưu master data, log tín hiệu và lịch sử trạng thái.
- **Frontend**: hiển thị dashboard, giám sát, timeline và trang cấu hình.

## 3. Luồng dữ liệu chính

```text
MQTT message
  -> normalize payload
  -> tìm máy theo signal key
  -> lưu machines_log
  -> tính status_id
  -> cập nhật machines.status_id nếu đổi trạng thái
  -> lưu machines_status_log
  -> phát Socket.IO event
  -> frontend cập nhật realtime
```

## 4. Quy tắc trạng thái

```text
I1 = 0                 -> status_id 3
I2 = 1 hoặc I3 = 0     -> status_id 2
I4 = 1                 -> status_id 1
Trường hợp còn lại     -> status_id 0 (Chưa có dữ liệu)
```

`status_id = 0` là trạng thái hệ thống **Chưa có dữ liệu**, không nằm trong master data. Các `status_id >= 1` lấy tên và màu từ collection `status`.

Nếu máy không có tín hiệu mới, backend giữ trạng thái cuối cùng đã nhận.

Máy mới luôn tạo với `status_id = 0`. `status_id = 0` là trạng thái hệ thống cố định **Chưa có dữ liệu**, còn `status_id >= 1` lấy từ master data.

## 5. Cấu trúc dữ liệu

```text
machines
  Danh sách máy.

locations
  Master data khu vực.

status
  Master data trạng thái và color_code.

machines_log
  Log tín hiệu thô từ MQTT.

machines_status_log
  Lịch sử các lần đổi trạng thái.

machines_count
  Số lần máy đi vào từng trạng thái.
```

## 6. Chức năng backend

- API CRUD máy.
- API CRUD khu vực.
- API danh sách trạng thái và cập nhật tên/màu trạng thái.
- API dashboard tổng quan theo khu vực.
- API count trạng thái.
- API log tín hiệu.
- API lịch sử trạng thái.
- API timeline trạng thái theo ngày.
- MQTT listener.
- Socket.IO realtime.
- Lưu thời điểm tín hiệu cuối để người dùng biết máy đã dừng gửi log từ khi nào.

## 7. Chức năng frontend

- **Home**: tổng quan trạng thái máy theo khu vực.
- **Giám sát máy**: màn hình ca trực, ưu tiên máy bất thường.
- **Đăng ký máy**: CRUD máy và filter.
- **Chi tiết máy**: thông tin máy, log mới nhất, lịch sử trạng thái.
- **Timeline**: xem trạng thái máy theo ngày.
- **Setting / Location**: quản lý khu vực.
- **Setting / Trạng thái**: chỉnh sửa tên trạng thái và màu.
- **Setting / Theme**: đổi theme giao diện.

## 8. Điểm đã xử lý

- Máy không có tín hiệu mới sẽ giữ trạng thái cuối cùng, không tự chuyển trạng thái sau 2 phút.
- Timeline không kéo trạng thái Online qua khoảng không có dữ liệu.
- Màu trạng thái lấy từ master data `status.color_code`.
- Quy ước `status_id = 0` là "Chưa có dữ liệu" cho toàn bộ project.
- Thêm trang Home tổng quan theo khu vực.
- Cải tiến trang Giám sát thành command center.
- Thêm CRUD master data khu vực và chỉnh sửa tên/màu trạng thái.
- Thêm cấu hình theme và preset Galaxy.

## 9. Cách chạy

Backend:

```bash
cd DMS_MMS_Backend
npm install
copy .env.example .env
npm run seed
npm run dev
```

Frontend:

```bash
cd DMS_MMS_FontEnd
npm install
copy .env.example .env
npm run dev
```

Địa chỉ mặc định:

```text
Backend:  http://localhost:3000/api
Frontend: http://localhost:5173
```

## 10. Kiểm thử

Backend:

```bash
npm test
```

Frontend:

```bash
npm run build
```

## 11. Hướng phát triển tiếp

- Thêm phân quyền người dùng.
- Thêm cảnh báo âm thanh hoặc notification cho máy lỗi.
- Thêm báo cáo downtime theo ngày/tuần/tháng.
- Thêm export Excel/PDF.
- Tối ưu dashboard cho màn hình TV trong xưởng.
