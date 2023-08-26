<script setup lang="ts">
import { computed, ref, toRefs, toRaw, onMounted, onUnmounted } from 'vue'
import { NButtonGroup, NButton, NIcon, NTree, TreeOption, NScrollbar, NDropdown, TreeDropInfo } from 'naive-ui'
import { InsertDriveFileRound, CreateNewFolderRound, RefreshRound } from '@vicons/material'
import { downloadZip } from 'client-zip'
import {
  lsDir,
  traverseFS
} from './async-fs'

const props = defineProps<{
  fs: ASYNC_FS
  height: string
  onOpenFile: HandlerZeroAction
  onNewFile: HandlerOneAction
  onNewFolder: HandlerOneAction
  onUpload: HandlerUpload
  onErrorPaste?: HandlerZeroAction
  onRename: HandlerOneAction
  onDeleteFile: HandlerOneAction
  onDeleteFolder: HandlerOneAction
  onErrorDownload?: HandlerZeroAction
}>()

const {
  fs,
  onOpenFile,
  onNewFile,
  onNewFolder,
  onErrorPaste,
  onUpload,
  onRename,
  onDeleteFile,
  onDeleteFolder,
  onErrorDownload
} = toRaw(props)

const {
  height
} = toRefs(props)

function newRoot (): TreeOption {
  return {
    key: '/',
    label: '/',
    isLeaf: false
  }
}

const data = ref<TreeOption[]>([newRoot()])
const expandedKeys = ref<string[]>([])
const selectedKeys = ref<string[]>([])

const showDropdown = ref<boolean>(false)
const dropdownPath = ref<string>('')
const dropdownIsFile = ref<boolean>(false)
const x = ref<number>(0)
const y = ref<number>(0)
const cutPath = ref<string>('')
const copiedPath = ref<string>('')

const dropdownOptions = computed(() => {
  const paste = cutPath.value || copiedPath.value
    ? [{
        label: 'Paste',
        key: 'paste'
      }]
    : []
  return [
    {
      label: 'Download',
      key: 'download'
    },
    {
      label: 'Upload',
      key: 'upload'
    },
    {
      label: 'Cut',
      key: 'cut'
    },
    {
      label: 'Copy',
      key: 'copy'
    },
    ...paste,
    {
      label: 'Rename',
      key: 'rename'
    },
    {
      label: 'Delete',
      key: 'delete'
    }
  ]
})

function hideDropdown () {
  showDropdown.value = false
}

function getNewPath () {
  if (selectedKeys.value.length) {
    const selectedKey = selectedKeys.value[0]
    return getFolder(selectedKey)
  }
  return '/'
}

function refresh () {
  data.value = [newRoot()]
}

async function pathExists (path: string) {
  try {
    await fs.lstat(path)
    return true
  } catch {
    return false
  }
}

async function rejectExistingPath (path: string) {
  if (await pathExists(path)) {
    const error = Error()
    error.name = 'PathExistsError'
    throw error
  }
}

function newFile () {
  const path = getNewPath()
  onNewFile(path, async (path: string) => {
    await rejectExistingPath(path)
    return fs.writeFile(path, '').finally(refresh)
  })
}

function newFolder () {
  const path = getNewPath()
  onNewFolder(path, async (path: string) => {
    await rejectExistingPath(path)
    return fs.mkdir(path).finally(refresh)
  })
}

function nodeProps ({ option }: { option: TreeOption }) {
  return {
    async onClick () {
      if (!option.isFile) {
        return
      }
      onOpenFile(option.key as string)
    },
    onContextmenu (e: MouseEvent) {
      showDropdown.value = true
      dropdownPath.value = option.key as string
      dropdownIsFile.value = option.isFile as boolean
      x.value = e.clientX
      y.value = e.clientY
      e.preventDefault()
    }
  }
}

const rmr = traverseFS(fs, undefined, fs.unlink, fs.rmdir)

function getName (path: string) {
  if (path.endsWith('/')) {
    path = path.slice(0, path.length - 1)
  }
  return path.slice(path.lastIndexOf('/') + 1)
}

function getFolder (path: string) {
  return path.slice(0, path.lastIndexOf('/') + 1)
}

function cpr (srcPath: string, dstPath: string) {
  if (srcPath.endsWith('/') && dstPath.startsWith(srcPath)) {
    // Avoid copying to subdirectory
    return Promise.reject(new Error())
  }
  const name = getName(srcPath)

  function getPath (path: string) {
    return dstPath + name + '/' + path.slice(srcPath.length)
  }

  return traverseFS(fs, path => fs.mkdir(getPath(path)), async path => fs.writeFile(getPath(path), await fs.readFile(path)), undefined)(srcPath)
}

function downloadBlob (blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

async function downloadFile (path: string) {
  const content = await fs.readFile(path)
  const name = path.slice(path.lastIndexOf('/') + 1)
  const blob = new Blob([content], { type: 'application/octet-stream' })
  downloadBlob(blob, name)
}

async function downloadFolder (path: string) {
  const name = path === '/' ? 'root' : getName(path)
  const manifest: { name: string, input?: Uint8Array}[] = []

  function strip (subpath: string) {
    return name + '/' + subpath.slice(path.length)
  }

  async function addFileToZip (subpath: string) {
    manifest.push({ name: strip(subpath), input: await fs.readFile(subpath) })
  }

  function addFolderToZip (subpath: string) {
    manifest.push({ name: strip(subpath) })
  }

  await traverseFS(fs, undefined, addFileToZip, addFolderToZip)(path)
  const blob = await downloadZip(manifest).blob()
  downloadBlob(blob, name + '.zip')
}

function upload (path: string) {
  const dstFolder = getFolder(path)
  onUpload(dstFolder, async files => {
    try {
      for (const { name, content } of files) {
        await fs.writeFile(dstFolder + name, content)
      }
    } finally {
      refresh()
    }
  })
}

function cut (path: string) {
  cutPath.value = path
  copiedPath.value = ''
}

function copy (path: string) {
  cutPath.value = ''
  copiedPath.value = path
}

async function paste (path: string) {
  const dstFolder = getFolder(path)
  try {
    if (cutPath.value) {
      const srcName = getName(cutPath.value)
      const dstPath = dstFolder + srcName
      await fs.rename(cutPath.value, dstPath)
      cutPath.value = ''
    } else {
      await cpr(copiedPath.value, dstFolder)
      copiedPath.value = ''
    }
  } catch (e) {
    onErrorPaste && onErrorPaste(dstFolder)
  } finally {
    refresh()
  }
}

function deleteHelper (path: string, isDir: boolean) {
  return (isDir ? onDeleteFolder : onDeleteFile)(path, path => rmr(path).finally(refresh))
}

function handleSelect (key: string) {
  const path = dropdownPath.value
  switch (key) {
    case 'download':
      (dropdownIsFile.value ? downloadFile : downloadFolder)(path).catch(() => onErrorDownload && onErrorDownload(path))
      break
    case 'upload':
      upload(path)
      break
    case 'cut':
      cut(path)
      break
    case 'copy':
      copy(path)
      break
    case 'paste':
      paste(path)
      break
    case 'rename':
      onRename(path, async name => {
        const newPath = path === '/' ? name : path.slice(0, path.lastIndexOf('/', path.length - 2)) + '/' + name
        return fs.rename(path, newPath).finally(refresh)
      })
      break
    case 'delete':
      deleteHelper(path, !dropdownIsFile.value)
      break
  }
  showDropdown.value = false
}

async function handleLoad (node: TreeOption) {
  const path = node.key as string
  const children: TreeOption[] = []
  const names = await lsDir(fs, path)
  for (const name of names) {
    const subPath = path + name
    const option: TreeOption = {
      label: name
    }
    const { mode } = await fs.lstat(subPath)
    if (await fs.isDir(mode)) {
      option.key = subPath + '/'
      option.isLeaf = false
    } else {
      option.key = subPath
      option.isLeaf = true
      if (await fs.isFile(mode)) {
        option.isFile = true
      } else {
        option.disabled = true
      }
    }
    children.push(option)
  }
  children.sort((a, b) => (a.key as string).localeCompare(b.key as string))
  node.children = children
}

async function handleKeydown (e: KeyboardEvent) {
  const { key, ctrlKey, metaKey, altKey, shiftKey } = e
  const isMac = /Macintosh/.test(navigator.userAgent)
  const isMod = !altKey && !shiftKey && ((isMac && !ctrlKey && metaKey) || (!isMac && ctrlKey && !metaKey))
  const path = selectedKeys.value[0]
  const { mode } = await fs.lstat(path)
  switch (key) {
    case 'Delete':
      deleteHelper(path, await fs.isDir(mode))
      break
    case 'c':
    case 'C':
      isMod && copy(path)
      break
    case 'v':
    case 'V':
      isMod && paste(path)
      break
    case 'x':
    case 'X':
      isMod && cut(path)
      break
  }
}

async function handleDrop ({ node, dragNode }: TreeDropInfo) {
  const srcPath = dragNode.key as string
  const name = getName(srcPath)
  const dstFolder = getFolder(node.key as string)
  const dstPath = dstFolder + name
  try {
    await fs.rename(srcPath, dstPath)
  } catch (e) {
    onErrorPaste && onErrorPaste(dstFolder)
  } finally {
    refresh()
  }
}

function onKeyup (e: KeyboardEvent) {
  if (e.key === 'Escape') {
    hideDropdown()
  }
}

onMounted(() => document.addEventListener('keyup', onKeyup))
onUnmounted(() => document.removeEventListener('keyup', onKeyup))

function expandFolder (path: string) {
  if (!expandedKeys.value.includes(path)) {
    expandedKeys.value.push(path)
  }
}

defineExpose({
  expandFolder
})
</script>

<template>
  <n-button-group style="gap: 5px">
    <n-button
      text
      title="New File"
      @click="newFile"
    >
      <n-icon :component="InsertDriveFileRound" />
    </n-button>
    <n-button
      text
      title="New Folder"
      @click="newFolder"
    >
      <n-icon :component="CreateNewFolderRound" />
    </n-button>
    <n-button
      text
      title="Refresh Explorer"
      @click="refresh"
    >
      <n-icon :component="RefreshRound" />
    </n-button>
  </n-button-group>
  <n-scrollbar
    x-scrollable
    :style="{ height }"
  >
    <n-scrollbar>
      <n-tree
        v-model:expanded-keys="expandedKeys"
        v-model:selected-keys="selectedKeys"
        :animated="false"
        :cancelable="false"
        draggable
        expand-on-click
        :data="data"
        :node-props="nodeProps"
        @load="handleLoad"
        @keydown="handleKeydown"
        @drop="handleDrop"
      />
      <n-dropdown
        trigger="manual"
        placement="bottom-start"
        :show="showDropdown"
        :options="dropdownOptions"
        :x="x"
        :y="y"
        @select="handleSelect"
        @clickoutside="hideDropdown"
      />
    </n-scrollbar>
  </n-scrollbar>
</template>
