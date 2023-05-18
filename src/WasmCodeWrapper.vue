<script setup lang="ts">
import { ref, h } from 'vue'
import { NInput, NUpload, NUploadDragger, UploadFileInfo, useDialog, useMessage } from 'naive-ui'
import { StreamParser } from '@codemirror/language'
import WasmCodeCore from './WasmCodeCore.vue'

defineProps<{
  fs: ASYNC_FS
  height: string
  theme: 'light' | 'dark'
  langParserMap: {[key: string]: StreamParser<any>}
  extLangMap: {[key: string]: string}
}>()

const wcc = ref<InstanceType<typeof WasmCodeCore>>()

const dialog = useDialog()
const message = useMessage()

function onCloseUnsaved (path: string, save: () => Promise<void>, discard: () => void) {
  dialog.warning({
    title: `Do you want to save the changes you made to ${path}?`,
    content: "Your changes will be lost if you don't save them.",
    positiveText: 'Save',
    negativeText: "Don't save",
    onPositiveClick: save,
    onNegativeClick: discard
  })
}

function onErrorOpenFile (path: string) {
  message.error(`Cannot open ${path}`)
}

function onErrorNonText (path: string) {
  message.error(`Non UTF-8 file ${path} can't be opened`)
}

function onErrorSaveFile (path: string) {
  message.error(`Cannot save ${path}`)
}

function singleInputDialog (path: string, title: string, positiveText: string, action: (input: string) => void) {
  const input = ref<string>('')
  const dialogInstance = dialog.info({
    title,
    content: () => [path, h(NInput, {
      clearable: true,
      value: input.value,
      onKeyup: e => {
        if (e.key === 'Enter') {
          action(input.value)
          dialogInstance.destroy()
        }
      },
      'onUpdate:value': newValue => { input.value = newValue }
    })],
    positiveText,
    onPositiveClick: () => action(input.value)
  })
}

function onNewFileOrFolder (type: 'file' | 'folder') {
  return (path: string, create: (path: string) => Promise<void>) => {
    singleInputDialog(path, `Set ${type} name`, 'Create', (name: string) => create(path + name).catch(e => {
      if (e.name === 'PathExistsError') {
        message.error('Name already exists in the folder')
      } else {
        message.error(`Cannot create ${type}`)
      }
    }))
  }
}

const onNewFile = onNewFileOrFolder('file')
const onNewFolder = onNewFileOrFolder('folder')

function onErrorPaste (path: string) {
  message.error(`Cannot paste under ${path}`)
}

const fileList = ref<UploadFileInfo[]>([])

function onUpload (path: string, upload: (files: { name: string, content: Uint8Array}[]) => Promise<void>) {
  dialog.info({
    title: 'Select files to upload',
    content: () => [path, h(NUpload, {
      multiple: true,
      fileList: fileList.value,
      'onUpdate:fileList': newValue => { fileList.value = newValue }
    }, [h(NUploadDragger, ['Click, or drag files to this area'])])],
    positiveText: 'Upload',
    negativeText: 'Clear all',
    onPositiveClick: async () => {
      const files = await Promise.all(fileList.value.map(async fileInfo => ({
        name: fileInfo.name,
        content: new Uint8Array(await fileInfo.file!.arrayBuffer())
      })))
      try {
        await upload(files)
        fileList.value = []
      } catch (e) {
        message.error(`Cannot upload to ${path}`)
      }
    },
    onNegativeClick: () => {
      fileList.value = []
      return false
    }
  })
}

function onRename (path: string, rename: (path: string) => Promise<void>) {
  singleInputDialog(path, 'Set new name', 'Rename', (name: string) => rename(name).catch(() => message.error('Cannot rename')))
}

function onDeleteFileOrFolder (type: 'file' | 'folder') {
  return (path: string, remove: (path: string) => Promise<void>) => {
    const dialogInstance = dialog.warning({
      title: `Are you sure you want to delete ${path}?`,
      content: `The ${type} cannot be restored.`,
      positiveText: 'Delete',
      negativeText: 'Cancel',
      onPositiveClick: () => remove(path).catch(() => message.error(`Cannot remove ${type}`)),
      onNegativeClick: () => dialogInstance.destroy()
    })
  }
}

const onDeleteFile = onDeleteFileOrFolder('file')
const onDeleteFolder = onDeleteFileOrFolder('folder')

function onErrorDownload (path: string) {
  message.error(`Cannot download ${path}`)
}

defineExpose({
  expandFolder (path: string) {
    return wcc.value!.expandFolder(path)
  }
})
</script>

<template>
  <wasm-code-core
    ref="wcc"
    :fs="fs"
    :theme="theme"
    :height="height"
    :lang-parser-map="langParserMap"
    :ext-lang-map="extLangMap"
    :on-close-unsaved="onCloseUnsaved"
    :on-error-open-file="onErrorOpenFile"
    :on-error-non-text="onErrorNonText"
    :on-error-save-file="onErrorSaveFile"
    :on-new-file="onNewFile"
    :on-new-folder="onNewFolder"
    :on-error-paste="onErrorPaste"
    :on-upload="onUpload"
    :on-rename="onRename"
    :on-delete-file="onDeleteFile"
    :on-delete-folder="onDeleteFolder"
    :on-error-download="onErrorDownload"
  />
</template>
