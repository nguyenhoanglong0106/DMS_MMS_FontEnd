# DMS/MMS Frontend

Frontend Vue 3 + Vite cho hệ thống **DMS/MMS Monitoring**. Giao diện dùng REST API để lấy dữ liệu và Socket.IO để cập nhật realtime.

## Công nghệ

- Vue 3
- Vite
- Vue Router
- Pinia
- Axios
- Socket.IO Client

## Chức năng chính

- Trang Home tổng quan trạng thái máy theo khu vực.
- Trang Giám sát máy dạng command center cho ca trực.
- Quản lý máy, khu vực và trạng thái.
- Cấu hình màu trạng thái bằng `color_code`.
- Cấu hình theme giao diện.
- Xem chi tiết máy, log tín hiệu và lịch sử trạng thái.
- Xem timeline trạng thái theo ngày.

## Cài đặt

```bash
npm install
copy .env.example .env
```

`.env`:

```env
VITE_API_BASE_URL=http://localhost:3000/api
VITE_SOCKET_URL=http://localhost:3000
```

## Chạy dev

```bash
npm run dev
```

Mở trình duyệt:

```text
http://localhost:5173
```

## Build

```bash
npm run build
```

## Màn hình chính

```text
/home
  Tổng quan máy theo khu vực.

/machines/monitoring
  Màn hình giám sát realtime cho ca trực.

/machines
  Đăng ký, sửa, xóa và lọc máy.

/machines/:id
  Chi tiết máy.

/machines/:id/status-history
  Lịch sử đổi trạng thái.

/machines/status-timeline
  Timeline trạng thái theo ngày.

/settings/locations
  Master data khu vực.

/settings/statuses
  Master data trạng thái và màu hiển thị.

/settings/theme
  Cấu hình theme.
```

## Ghi chú giao diện

- Màu trạng thái lấy từ `status.color_code` của backend.
- Máy không có tín hiệu mới sẽ giữ trạng thái cuối cùng; timeline chỉ vẽ tới log cuối.
- Trang Giám sát ưu tiên hiển thị máy bất thường ở trên.
- Lưới trạng thái phía dưới giúp xem nhanh nhiều máy trong cùng khu vực.
- Timeline chỉ vẽ tới mốc dữ liệu thật, không kéo trạng thái sang tương lai khi chưa có log mới.

## File quan trọng

```text
src/stores/machine.store.js
  Store máy, filter, count và realtime update.

src/services/socket.service.js
  Kết nối Socket.IO namespace /machines.

src/api/machines.api.js
  API máy, log, history, timeline và overview.

src/views/HomeDashboardView.vue
  Trang Home tổng quan theo khu vực.

src/views/machines/MachineMonitoringView.vue
  Trang giám sát realtime.

src/views/machines/MachineStatusTimelineView.vue
  Timeline trạng thái theo ngày.

src/views/settings/SettingsMasterDataView.vue
  CRUD khu vực và trạng thái.
```
