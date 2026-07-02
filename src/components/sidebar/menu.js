export const sidebarMenus = [
  {
    title: 'Home',
    icon: 'fas fa-home',
    children: [
      {
        title: 'Trang Chủ',
        icon: 'fas fa-file-alt',
        path: '/homepage'
      },
    ],
  },
  {
    title: 'Dashboard',
    icon: 'fas fa-columns',
    children: [
      {
        title: 'Tổng quan',
        icon: 'fas fa-file-alt',
        path: '/dashboard'
      },
      {
        title: 'Thống kê lớp',
        icon: 'fas fa-file-alt',
        path: '/dashboard/class'
      }
    ]
  },
  {
    title: 'SqlConnectPage',
    icon: 'fas fa-chart-bar',
    path: '/SqlConnectPage'
  },
  {
    title: 'Friends',
    icon: 'fas fa-users',
    path: '/friends'
  },
  {
    title: 'Images',
    icon: 'fas fa-image',
    path: '/image'
  }
]