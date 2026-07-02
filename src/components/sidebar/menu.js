export const sidebarMenus = [
    {
    title: 'Menu',
    icon: 'fas fa-utensils',
    children: [
      {
        title: 'Daily Menu',
        icon: 'fas fa-calendar-alt',
        path: '/dailyMenu'
      },
      {
        title: 'Import Menu',
        icon: 'fas fa-file-excel',
        path: '/importExcel'
      }
    ]
  }
  ,
  {
    title: 'Domain',
    icon: 'fas fa-network-wired',
    children: [
      {
        title: 'Import Domain',
        icon: 'fas fa-file-excel',
        path: '/domain'
      }
    ]
  },
  {
        title: 'Internet',
        icon: 'fas fa-globe',
        children: [
      {
        title: 'Import Internet',
        icon: 'fas fa-file-excel',
        path: '/internet'
      }
    ]
  }
]
