export const THEME_STORAGE_KEY = 'mms-theme-settings'

const BASE_THEME_VALUES = {
  appBg: '#F8FAFC',
  surfaceBg: '#FFFFFF',
  surfaceMuted: '#F8FAFC',
  textColor: '#111827',
  mutedColor: '#64748B',
  primaryColor: '#0F62B4',
  primaryHover: '#0B559F',
  borderColor: '#D1D5DB',
  sidebarBg: '#1F7A4D',
  sidebarHover: '#2F9E63',
  sidebarActive: '#145C38',
  tableHeaderBg: '#F8FAFC',
  successBg: '#DCFCE7',
  successText: '#166534',
  errorBg: '#FEE2E2',
  errorText: '#991B1B',
  mode: 'light'
}

// Danh sách theme dựng sẵn để chọn nhanh ở trang Setting > Theme.
export const THEME_PRESETS = [
  {
    id: 'mms-green',
    name: 'MMS Green',
    values: {
      ...BASE_THEME_VALUES
    }
  },
  {
    id: 'factory-blue',
    name: 'Factory Blue',
    values: {
      ...BASE_THEME_VALUES,
      primaryColor: '#2563EB',
      primaryHover: '#1D4ED8',
      sidebarBg: '#1E3A8A',
      sidebarHover: '#2563EB',
      sidebarActive: '#172554'
    }
  },
  {
    id: 'steel-dark',
    name: 'Steel Dark',
    values: {
      appBg: '#0F172A',
      surfaceBg: '#111827',
      surfaceMuted: '#1F2937',
      textColor: '#E5E7EB',
      mutedColor: '#94A3B8',
      primaryColor: '#38BDF8',
      primaryHover: '#0284C7',
      borderColor: '#334155',
      sidebarBg: '#020617',
      sidebarHover: '#1E293B',
      sidebarActive: '#0F766E',
      tableHeaderBg: '#1E293B',
      successBg: '#064E3B',
      successText: '#A7F3D0',
      errorBg: '#7F1D1D',
      errorText: '#FECACA',
      mode: 'dark'
    }
  },
  {
    id: 'galaxy',
    name: 'Galaxy',
    values: {
      appBg: '#111827',
      surfaceBg: '#182033',
      surfaceMuted: '#20283C',
      textColor: '#EEF2FF',
      mutedColor: '#AAB4CC',
      primaryColor: '#6D7DF2',
      primaryHover: '#38BDF8',
      borderColor: '#30384F',
      sidebarBg: '#151A2D',
      sidebarHover: '#252D4A',
      sidebarActive: '#3B5BDB',
      tableHeaderBg: '#20283C',
      successBg: '#0B3B35',
      successText: '#8DEBD3',
      errorBg: '#3A1725',
      errorText: '#FDA4AF',
      mode: 'dark'
    }
  }
]

// Danh sách field màu hiển thị cho form tùy chỉnh theme (key khớp với values).
export const THEME_FIELDS = [
  { key: 'primaryColor', label: 'Màu chính' },
  { key: 'primaryHover', label: 'Màu hover' },
  { key: 'appBg', label: 'Nền trang' },
  { key: 'surfaceBg', label: 'Nền panel' },
  { key: 'surfaceMuted', label: 'Nền phụ' },
  { key: 'tableHeaderBg', label: 'Header bảng' },
  { key: 'textColor', label: 'Chữ chính' },
  { key: 'mutedColor', label: 'Chữ phụ' },
  { key: 'borderColor', label: 'Màu viền' },
  { key: 'sidebarBg', label: 'Sidebar' },
  { key: 'sidebarHover', label: 'Sidebar hover' },
  { key: 'sidebarActive', label: 'Sidebar active' },
  { key: 'successBg', label: 'Nền thành công' },
  { key: 'successText', label: 'Chữ thành công' },
  { key: 'errorBg', label: 'Nền lỗi' },
  { key: 'errorText', label: 'Chữ lỗi' }
]

// Map key trong theme values sang tên CSS variable thực tế ở :root (App.vue).
const CSS_VARIABLES = {
  appBg: '--app-bg',
  surfaceBg: '--surface-bg',
  surfaceMuted: '--surface-muted',
  textColor: '--text-color',
  mutedColor: '--muted-color',
  primaryColor: '--primary-color',
  primaryHover: '--primary-hover-color',
  borderColor: '--border-color',
  sidebarBg: '--sidebar-bg-color',
  sidebarHover: '--sidebar-item-hover',
  sidebarActive: '--sidebar-item-active',
  tableHeaderBg: '--table-header-bg',
  successBg: '--success-bg',
  successText: '--success-text',
  errorBg: '--error-bg',
  errorText: '--error-text'
}

export function defaultThemeSettings() {
  return {
    id: THEME_PRESETS[0].id,
    name: THEME_PRESETS[0].name,
    values: { ...THEME_PRESETS[0].values }
  }
}

// Đảm bảo settings luôn đủ field: thiếu key nào thì lấy từ preset gốc,
// preset không hợp lệ thì rơi về preset đầu tiên.
export function normalizeThemeSettings(settings = {}) {
  const preset = THEME_PRESETS.find((item) => item.id === settings.id)
  const fallback = preset || THEME_PRESETS[0]

  return {
    id: settings.id || fallback.id,
    name: settings.name || fallback.name || 'Custom',
    values: {
      ...BASE_THEME_VALUES,
      ...fallback.values,
      ...(settings.values || {})
    }
  }
}

export function readThemeSettings() {
  if (typeof window === 'undefined') {
    return defaultThemeSettings()
  }

  try {
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY)

    return saved ? normalizeThemeSettings(JSON.parse(saved)) : defaultThemeSettings()
  } catch {
    return defaultThemeSettings()
  }
}

// Ghi các màu của theme vào CSS variable ở :root để toàn bộ giao diện đổi theo.
export function applyTheme(settings = readThemeSettings()) {
  if (typeof document === 'undefined') {
    return settings
  }

  const normalized = normalizeThemeSettings(settings)
  const root = document.documentElement

  Object.entries(CSS_VARIABLES).forEach(([key, variable]) => {
    root.style.setProperty(variable, normalized.values[key])
  })

  root.dataset.theme = normalized.id
  root.style.colorScheme = normalized.values.mode === 'dark' ? 'dark' : 'light'

  return normalized
}

export function saveThemeSettings(settings) {
  const normalized = normalizeThemeSettings(settings)

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(normalized))
  }

  applyTheme(normalized)

  return normalized
}

export function resetThemeSettings() {
  const defaults = defaultThemeSettings()

  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(THEME_STORAGE_KEY)
  }

  applyTheme(defaults)

  return defaults
}

export function initTheme() {
  return applyTheme(readThemeSettings())
}
