// Cấu trúc menu header; mục có "children" sẽ hiện dropdown khi hover/click.
export const sidebarMenus = [
  {
    title: 'Trang chủ',
    icon: 'fas fa-home',
    path: '/home',
  },
  {
    title: 'Thiết bị máy',
    icon: 'fas fa-cogs',
    children: [
      {
        title: 'Đăng ký máy',
        icon: 'fas fa-industry',
        path: '/machines',
      },
      {
        title: 'Giám sát máy',
        icon: 'fas fa-chart-line',
        path: '/machines/monitoring',
      },
      {
        title: 'Timeline',
        icon: 'fas fa-history',
        path: '/machines/status-timeline',
      }
    ]
  },
  {
    title: 'Kế hoạch sản xuất',
    icon: 'fas fa-calendar-check',
    children: [
      {
        title: 'Kế hoạch sản xuất',
        icon: 'fas fa-calendar-check',
        path: '/khsx',
      },
      {
        title: 'Cấu hình',
        icon: 'fas fa-clock',
        path: '/khsx/service',
      }
    ]
  },
  {
    title: 'Cài đặt',
    icon: 'fas fa-sliders-h',
    children: [
      {
        title: 'Location',
        icon: 'fas fa-map-marker-alt',
        path: '/settings/locations',
      },
      {
        title: 'Trạng thái',
        icon: 'fas fa-tags',
        path: '/settings/statuses',
      },
      {
        title: 'Theme',
        icon: 'fas fa-palette',
        path: '/settings/theme',
      }
    ]
  }
]
