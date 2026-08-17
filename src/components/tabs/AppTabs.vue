<template>
  <div class="workspace-tab-shell" :class="{ 'has-overflow': hasOverflow }">
    <button
      v-if="hasOverflow"
      type="button"
      class="tab-scroll-button"
      :disabled="!canScrollLeft"
      title="Cuộn tab sang trái"
      aria-label="Cuộn tab sang trái"
      @click="scrollTabs('left')"
    >
      <i class="fas fa-chevron-left" aria-hidden="true"></i>
    </button>

    <div ref="tabListRef" class="workspace-tabs" role="tablist" aria-label="Màn hình đang mở" @scroll.passive="updateScrollState">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        type="button"
        class="workspace-tab"
        :class="{
          active: tab.key === activeKey,
          dragging: tab.key === draggingKey,
          locked: !tab.movable,
          'drag-over': tab.key === dragOverKey && tab.key !== draggingKey
        }"
        :draggable="tab.movable"
        role="tab"
        :aria-selected="tab.key === activeKey"
        :title="tab.title"
        @dragstart="startDrag(tab, $event)"
        @dragenter.prevent="setDragOver(tab)"
        @dragover.prevent="setDragOver(tab)"
        @drop.prevent="dropTab(tab)"
        @dragend="clearDragState"
        @click="selectTab(tab)"
      >
        <i :class="tab.icon" aria-hidden="true"></i>
        <span>{{ tab.title }}</span>
        <span
          v-if="tab.closable"
          class="tab-close"
          role="button"
          tabindex="0"
          title="Đóng tab"
          aria-label="Đóng tab"
          @click.stop="closeTab(tab)"
          @keydown.enter.stop.prevent="closeTab(tab)"
          @keydown.space.stop.prevent="closeTab(tab)"
        >
          <i class="fas fa-times" aria-hidden="true"></i>
        </span>
      </button>
    </div>

    <button
      v-if="hasOverflow"
      type="button"
      class="tab-scroll-button"
      :disabled="!canScrollRight"
      title="Cuộn tab sang phải"
      aria-label="Cuộn tab sang phải"
      @click="scrollTabs('right')"
    >
      <i class="fas fa-chevron-right" aria-hidden="true"></i>
    </button>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const TAB_STORAGE_KEY = 'mms_workspace_tabs'
const HOME_TAB = {
  key: '/home',
  fullPath: '/home',
  title: 'Trang chủ',
  icon: 'fas fa-home',
  closable: false,
  movable: false
}

const route = useRoute()
const router = useRouter()
const tabs = ref(readSavedTabs())
const draggingKey = ref('')
const dragOverKey = ref('')
const tabListRef = ref(null)
const canScrollLeft = ref(false)
const canScrollRight = ref(false)
const activeKey = computed(() => routeTabKey(route))
const hasOverflow = computed(() => canScrollLeft.value || canScrollRight.value)
let resizeObserver = null

watch(
  () => route.fullPath,
  () => {
    addRouteTab(route)
    scrollActiveTabIntoView()
  },
  { immediate: true }
)

watch(
  () => tabs.value.length,
  () => {
    nextTick(updateScrollState)
  }
)

onMounted(() => {
  nextTick(() => {
    updateScrollState()
    scrollActiveTabIntoView(false)

    if (typeof ResizeObserver !== 'undefined' && tabListRef.value) {
      resizeObserver = new ResizeObserver(updateScrollState)
      resizeObserver.observe(tabListRef.value)
    }
  })

  window.addEventListener('resize', updateScrollState)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateScrollState)
  resizeObserver?.disconnect()
})

function readSavedTabs() {
  if (typeof window === 'undefined') {
    return [{ ...HOME_TAB }]
  }

  try {
    const savedTabs = JSON.parse(window.sessionStorage.getItem(TAB_STORAGE_KEY) || '[]')
    const normalizedTabs = savedTabs
      .filter((tab) => tab?.key && tab?.fullPath && tab?.title)
      .filter((tab) => savedTabIsValid(tab))
      .map((tab) => {
        const key = savedTabKey(tab)

        return {
          key,
          fullPath: String(tab.fullPath),
          title: String(tab.title),
          icon: tab.icon || 'fas fa-window-maximize',
          closable: key !== HOME_TAB.key && tab.closable !== false,
          movable: key !== HOME_TAB.key
        }
      })

    return ensureHomeTab(normalizedTabs)
  } catch {
    return [{ ...HOME_TAB }]
  }
}

function saveTabs() {
  if (typeof window === 'undefined') {
    return
  }

  window.sessionStorage.setItem(TAB_STORAGE_KEY, JSON.stringify(tabs.value))
}

function ensureHomeTab(nextTabs) {
  const uniqueTabs = new Map()

  nextTabs.forEach((tab) => {
    const key = savedTabKey(tab)

    if (!key) {
      return
    }

    uniqueTabs.set(key, {
      ...tab,
      key,
      closable: key !== HOME_TAB.key && tab.closable !== false,
      movable: key !== HOME_TAB.key
    })
  })

  const tabsWithoutHome = [...uniqueTabs.values()].filter((tab) => tab.key !== HOME_TAB.key)

  return [{ ...HOME_TAB }, ...tabsWithoutHome]
}

function savedTabKey(tab) {
  const fullPath = String(tab.fullPath || '')
  const resolved = router.resolve(fullPath)

  if (resolved.matched.some((record) => !record.redirect)) {
    return routeTabKey(resolved)
  }

  if (/^\/machines\/[^/]+\/status-history(?:[?#].*)?$/.test(fullPath)) {
    return 'machine-status-history'
  }

  if (/^\/machines\/[^/]+(?:[?#].*)?$/.test(fullPath)) {
    return 'machine-detail'
  }

  return String(tab.key)
}

function savedTabIsValid(tab) {
  const fullPath = String(tab.fullPath || '')

  if (!fullPath || fullPath === '/') {
    return false
  }

  const resolved = router.resolve(fullPath)

  return resolved.matched.some((record) => !record.redirect)
}

function routeTab(nextRoute) {
  if (nextRoute.path === '/' || nextRoute.meta?.tab === false) {
    return null
  }

  return {
    key: routeTabKey(nextRoute),
    fullPath: nextRoute.fullPath,
    title: nextRoute.meta?.tabTitle || nextRoute.name || nextRoute.path,
    icon: nextRoute.meta?.icon || 'fas fa-window-maximize',
    closable: nextRoute.meta?.fixedTab !== true && routeTabKey(nextRoute) !== HOME_TAB.key,
    movable: routeTabKey(nextRoute) !== HOME_TAB.key
  }
}

function routeTabKey(nextRoute) {
  return nextRoute.meta?.tabKey || nextRoute.path
}

function addRouteTab(nextRoute) {
  const tab = routeTab(nextRoute)

  if (!tab) {
    return
  }

  const index = tabs.value.findIndex((item) => item.key === tab.key)

  if (index >= 0) {
    tabs.value[index] = {
      ...tabs.value[index],
      ...tab
    }
  } else {
    tabs.value.push(tab)
  }

  tabs.value = ensureHomeTab(tabs.value)
  saveTabs()
}

function selectTab(tab) {
  if (tab.fullPath === route.fullPath) {
    return
  }

  router.push(tab.fullPath)
}

function closeTab(tab) {
  if (!tab.closable) {
    return
  }

  const index = tabs.value.findIndex((item) => item.key === tab.key)

  if (index < 0) {
    return
  }

  const wasActive = tab.key === activeKey.value
  const nextTabs = tabs.value.filter((item) => item.key !== tab.key)
  const fallbackTab = nextTabs[index] || nextTabs[index - 1] || HOME_TAB

  tabs.value = ensureHomeTab(nextTabs)
  saveTabs()
  nextTick(updateScrollState)

  if (wasActive) {
    router.push(fallbackTab.fullPath)
  }
}

function startDrag(tab, event) {
  if (!tab.movable) {
    event.preventDefault()
    return
  }

  draggingKey.value = tab.key
  dragOverKey.value = tab.key

  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', tab.key)
  }
}

function setDragOver(tab) {
  if (!draggingKey.value || !tab.movable || tab.key === dragOverKey.value) {
    return
  }

  dragOverKey.value = tab.key
}

function dropTab(targetTab) {
  if (!draggingKey.value || !targetTab.movable || draggingKey.value === targetTab.key) {
    clearDragState()
    return
  }

  const fromIndex = tabs.value.findIndex((tab) => tab.key === draggingKey.value)
  const toIndex = tabs.value.findIndex((tab) => tab.key === targetTab.key)

  if (fromIndex < 0 || toIndex < 0) {
    clearDragState()
    return
  }

  const nextTabs = [...tabs.value]
  const [draggedTab] = nextTabs.splice(fromIndex, 1)
  nextTabs.splice(toIndex, 0, draggedTab)

  tabs.value = nextTabs
  saveTabs()
  nextTick(updateScrollState)
  clearDragState()
}

function clearDragState() {
  draggingKey.value = ''
  dragOverKey.value = ''
}

function updateScrollState() {
  const tabList = tabListRef.value

  if (!tabList) {
    canScrollLeft.value = false
    canScrollRight.value = false
    return
  }

  const maxScrollLeft = tabList.scrollWidth - tabList.clientWidth
  const tolerance = 2

  canScrollLeft.value = tabList.scrollLeft > tolerance
  canScrollRight.value = tabList.scrollLeft < maxScrollLeft - tolerance
}

function scrollTabs(direction) {
  const tabList = tabListRef.value

  if (!tabList) {
    return
  }

  const distance = Math.max(180, Math.floor(tabList.clientWidth * 0.7))

  tabList.scrollBy({
    left: direction === 'left' ? -distance : distance,
    behavior: 'smooth'
  })

  window.setTimeout(updateScrollState, 260)
}

function scrollActiveTabIntoView(smooth = true) {
  nextTick(() => {
    const activeTab = tabListRef.value?.querySelector('.workspace-tab.active')

    if (activeTab) {
      activeTab.scrollIntoView({
        block: 'nearest',
        inline: 'nearest',
        behavior: smooth ? 'smooth' : 'auto'
      })
    }

    updateScrollState()
    window.setTimeout(updateScrollState, smooth ? 260 : 0)
  })
}
</script>

<style scoped>
.workspace-tab-shell {
  min-height: 44px;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: flex-end;
  gap: 4px;
  padding: 6px 28px 0;
  border-bottom: 1px solid var(--border-color);
  background: var(--surface-muted);
}

.workspace-tabs {
  min-width: 0;
  display: flex;
  align-items: flex-end;
  gap: 4px;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
  scrollbar-gutter: stable;
}

.workspace-tabs::-webkit-scrollbar {
  display: none;
}

.tab-scroll-button {
  width: 34px;
  height: 34px;
  margin-bottom: 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--surface-bg);
  color: var(--primary-color);
  cursor: pointer;
  transition: 0.18s ease;
}

.tab-scroll-button:hover:not(:disabled) {
  border-color: var(--primary-color);
  background: color-mix(in srgb, var(--primary-color) 10%, var(--surface-bg));
}

.tab-scroll-button:disabled {
  cursor: not-allowed;
  opacity: 0.42;
}

.workspace-tab {
  max-width: 220px;
  min-width: 118px;
  height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex: 0 0 auto;
  border: 1px solid var(--border-color);
  border-bottom: 0;
  border-radius: 7px 7px 0 0;
  padding: 0 10px;
  background: color-mix(in srgb, var(--surface-muted) 78%, var(--surface-bg));
  color: var(--muted-color);
  cursor: grab;
  transition: 0.18s ease;
}

.workspace-tab:active {
  cursor: grabbing;
}

.workspace-tab.locked {
  cursor: pointer;
}

.workspace-tab.locked:active {
  cursor: pointer;
}

.workspace-tab:hover {
  color: var(--text-color);
  background: var(--surface-bg);
}

.workspace-tab.active {
  position: relative;
  background: var(--surface-bg);
  color: var(--primary-color);
  box-shadow: inset 0 3px 0 var(--primary-color);
}

.workspace-tab.dragging {
  opacity: 0.48;
}

.workspace-tab.drag-over {
  border-color: var(--primary-color);
  box-shadow: inset 3px 0 0 var(--primary-color);
}

.workspace-tab i {
  width: 15px;
  min-width: 15px;
  font-size: 13px;
  text-align: center;
}

.workspace-tab span:not(.tab-close) {
  min-width: 0;
  overflow: hidden;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tab-close {
  width: 22px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  border-radius: 5px;
  color: var(--muted-color);
}

.tab-close:hover {
  background: color-mix(in srgb, var(--error-text) 10%, transparent);
  color: var(--error-text);
}

@media (max-width: 760px) {
  .workspace-tab-shell {
    padding-right: 16px;
    padding-left: 16px;
  }

  .workspace-tab {
    min-width: 104px;
    max-width: 180px;
  }
}
</style>
