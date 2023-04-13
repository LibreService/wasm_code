<script lang="ts">
import { computed, toRefs } from 'vue'
import { NDialogProvider, NMessageProvider, NConfigProvider, useOsTheme, darkTheme } from 'naive-ui'
import { StreamParser } from '@codemirror/language'
import WasmCodeWrapper from './WasmCodeWrapper.vue'

interface Props {
  fs: ASYNC_FS
  height: string
  theme?: 'light' | 'dark' | undefined
  langParserMap?: {[key: string]: StreamParser<any>}
  extLangMap?: {[key: string]: string}
}
</script>

<script setup lang="ts">
const props = withDefaults(defineProps<Props>(), {
  theme: undefined,
  langParserMap: () => ({}),
  extLangMap: () => ({})
})

const { theme } = toRefs(props)

const osTheme = useOsTheme()
const _theme = computed(() => theme.value || osTheme.value!)
</script>

<template>
  <n-config-provider
    :theme="_theme === 'dark' ? darkTheme : null"
  >
    <n-dialog-provider>
      <n-message-provider>
        <wasm-code-wrapper
          :fs="fs"
          :theme="_theme"
          :height="height"
          :lang-parser-map="langParserMap"
          :ext-lang-map="extLangMap"
        />
      </n-message-provider>
    </n-dialog-provider>
  </n-config-provider>
</template>
