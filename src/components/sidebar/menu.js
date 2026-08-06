// Cấu trúc menu sidebar; mục có "children" sẽ hiện submenu khi click.
export const sidebarMenus = [
  {
    title: 'Home',
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
        title: 'Giám sát',
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
    title: 'Setting',
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
