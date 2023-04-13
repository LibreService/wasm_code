<script lang="ts">
import { computed, ref, toRaw, toRefs } from 'vue'
import { NConfigProvider, darkTheme, useOsTheme, NLayout } from 'naive-ui'
import { StreamParser } from '@codemirror/language'
import FileManager from './FileManager.vue'
import CodeEditor from './CodeEditor.vue'

interface Props {
  height: string
  theme?: 'dark' | 'light' | undefined
  fs: ASYNC_FS
  langParserMap?: {[key: string]: StreamParser<any>}
  extLangMap?: {[key: string]: string}
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
</script>

<template>
  <n-config-provider
    :theme="_theme === 'dark' ? darkTheme : null"
  >
    <n-layout>
      <!-- Provide background color for theme -->
      <div style="display: flex">
        <div style="width: 20%; margin-top: 17px">
          <file-manager
            :fs="fs"
            :height="height"
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
      </div>
    </n-layout>
  </n-config-provider>
</template>
