<script lang="ts">
import { computed, ref, toRaw, toRefs } from 'vue'
import { NConfigProvider, darkTheme, useOsTheme, NLayout, NSplit } from 'naive-ui'
import { StreamParser } from '@codemirror/language'
import FileManager from './FileManager.vue'
import CodeEditor from './CodeEditor.vue'

interface Props {
  height: string
  theme?: 'dark' | 'light' | undefined
  fs: ASYNC_FS
  langParserMap?: {[key: string]: StreamParser<any>}
  extLangMap?: {[key: string]: string}
  hidePath?: HidePath
  onCloseUnsaved: HandlerTwoActions
  onErrorOpenFile?: HandlerZeroAction
  onErrorNonText?: HandlerZeroAction
  onErrorSaveFile?: HandlerZeroAction
  onNewFile: HandlerOneAction
  onNewFolder: HandlerOneAction
  onErrorPaste?: HandlerZeroAction
  onUpload: HandlerUpload
  onRename: HandlerOneAction
  onDeleteFile?: HandlerOneAction
  onDeleteFolder?: HandlerOneAction
  onErrorDownload?: HandlerZeroAction
}
</script>

<script setup lang="ts">
const props = withDefaults(defineProps<Props>(), {
  theme: undefined,
  langParserMap: () => ({}),
  extLangMap: () => ({}),
  hidePath: undefined,
  onErrorOpenFile: undefined,
  onErrorNonText: undefined,
  onErrorSaveFile: undefined,
  onErrorPaste: undefined,
  onDeleteFile: (path: string, remove: (path: string) => Promise<void>) => remove(path),
  onDeleteFolder: (path: string, remove: (path: string) => Promise<void>) => remove(path),
  onErrorDownload: undefined
})

const {
  fs,
  hidePath,
  onCloseUnsaved,
  onErrorOpenFile,
  onErrorNonText,
  onErrorSaveFile,
  onNewFile,
  onNewFolder,
  onErrorPaste,
  onUpload,
  onRename,
  onDeleteFile,
  onDeleteFolder
} = toRaw(props)

const {
  height,
  theme
} = toRefs(props)

const fm = ref<InstanceType<typeof FileManager>>()
const ce = ref<InstanceType<typeof CodeEditor>>()

async function onOpenFile (path: string) {
  try {
    await ce.value!.openFile(path)
  } catch (e: any) {
    if (e.name === 'TypeError') {
      onErrorNonText && onErrorNonText(path)
    } else {
      onErrorOpenFile && onErrorOpenFile(path)
    }
  }
}

const osTheme = useOsTheme()
const _theme = computed(() => theme.value || osTheme.value)

defineExpose({
  expandFolder (path: string) {
    return fm.value!.expandFolder(path)
  }
})
</script>

<template>
  <n-config-provider
    :theme="_theme === 'dark' ? darkTheme : null"
  >
    <n-layout>
      <!-- Provide background color for theme -->
      <n-split
        direction="horizontal"
        :default-size="0.2"
      >
        <template #1>
          <div style="margin-top: 17px">
            <file-manager
              ref="fm"
              :fs="fs"
              :height="height"
              :hide-path="hidePath"
              :on-open-file="onOpenFile"
              :on-new-file="onNewFile"
              :on-new-folder="onNewFolder"
              :on-error-paste="onErrorPaste"
              :on-upload="onUpload"
              :on-rename="onRename"
              :on-delete-file="onDeleteFile"
              :on-delete-folder="onDeleteFolder"
              :on-error-download="onErrorDownload"
            />
          </div>
        </template>
        <template #2>
          <code-editor
            ref="ce"
            style="width: 80%"
            :fs="fs"
            :height="height"
            :theme="_theme!"
            :lang-parser-map="langParserMap"
            :ext-lang-map="extLangMap"
            :on-close-unsaved="onCloseUnsaved"
            :on-error-save-file="onErrorSaveFile"
          />
        </template>
      </n-split>
    </n-layout>
  </n-config-provider>
</template>
