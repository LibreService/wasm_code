<script setup lang="ts">
import { ref, Ref, toRefs, toRaw, watch, onMounted } from 'vue'
import { NTabs, NTab } from 'naive-ui'
import { basicSetup } from 'codemirror'
import { StreamLanguage, StreamParser } from '@codemirror/language'
import { EditorView, KeyBinding, keymap } from '@codemirror/view'
import { EditorState, Compartment } from '@codemirror/state'
import { vscodeDark } from '@uiw/codemirror-theme-vscode'

const props = defineProps<{
  fs: ASYNC_FS
  height: string
  theme: 'light' | 'dark'
  langParserMap: {[key: string]: StreamParser<any>}
  extLangMap: {[key: string]: string}
  onCloseUnsaved: HandlerTwoActions
  onErrorSaveFile: HandlerZeroAction | undefined
}>()

const {
  fs,
  langParserMap,
  extLangMap,
  onCloseUnsaved,
  onErrorSaveFile
} = toRaw(props)

const {
  height,
  theme
} = toRefs(props)

let view: EditorView
const editor = ref()

const langStreamMap: {[key: string]: StreamLanguage<any> } = {}
for (const [lang, parser] of Object.entries(langParserMap)) {
  langStreamMap[lang] = StreamLanguage.define(parser)
}

function getLanguage (path: string) {
  const parts = path.split('.')
  if (parts.length > 1) {
    const ext = parts[parts.length - 1]
    if (ext in extLangMap) {
      return extLangMap[ext]
    }
  }
  return ''
}

const keyMap: KeyBinding[] = [
  {
    key: 'Mod-s',
    run: () => {
      const path = currentFile.value
      if (fileChanged[path]) {
        saveFile(path).catch(() => 0)
      }
      return true
    }
  }
]

const themeCompartment = new Compartment()

function setTheme () {
  view.dispatch({
    effects: themeCompartment.reconfigure(theme.value === 'dark' ? vscodeDark : [])
  })
}

watch(theme, () => {
  if (currentFile.value) {
    setTheme()
  }
})

const heightCompartment = new Compartment()

function heightTheme () {
  return EditorView.theme({ '&': { height: height.value } })
}

function setHeight () {
  view.dispatch({
    effects: heightCompartment.reconfigure(heightTheme())
  })
}

watch(height, () => {
  if (currentFile.value) {
    setHeight()
  }
})

const baseExtensions = [
  basicSetup,
  keymap.of(keyMap),
  EditorView.updateListener.of(v => {
    if (v.docChanged) {
      fileChanged[currentFile.value].value = v.state.doc.toString() !== savedContent[currentFile.value]
    }
  })
]

const openedFiles = ref<string[]>([])
const currentFile = ref<string>('')
const fileOrder: string[] = []
const fileStateMap: {[key: string]: EditorState} = {}
const savedContent: {[key: string]: string} = {}
const fileChanged: {[key: string]: Ref<boolean>} = {}

watch(currentFile, (value, oldValue) => {
  if (oldValue) {
    fileStateMap[oldValue] = view.state
  }
  if (value) {
    view.setState(fileStateMap[value])
    setTheme()
    setHeight()
    const index = fileOrder.indexOf(value)
    if (index >= 0) {
      for (let i = index; i < fileOrder.length - 1; ++i) {
        fileOrder[i] = fileOrder[i + 1]
      }
      fileOrder[fileOrder.length - 1] = value
    } else {
      fileOrder.push(value)
    }
  }
})

async function openFile (path: string) {
  if (!openedFiles.value.includes(path)) {
    const buffer: Uint8Array = await fs.readFile(path)
    const doc = new TextDecoder('utf-8', { fatal: true }).decode(buffer)
    const extensions = [
      ...baseExtensions,
      themeCompartment.of(theme.value === 'dark' ? vscodeDark : []),
      heightCompartment.of(heightTheme())
    ]
    const language = getLanguage(path)
    if (language) {
      extensions.push(langStreamMap[language])
    }
    const state = EditorState.create({ doc, extensions })
    fileStateMap[path] = state
    savedContent[path] = doc
    fileChanged[path] = ref<boolean>(false)
    openedFiles.value.push(path)
  }
  currentFile.value = path
}

async function saveFile (path: string) {
  const state = path === currentFile.value ? view.state : fileStateMap[path]
  const content = state.doc.toString()
  try {
    await fs.writeFile(path, content)
  } catch (e) {
    onErrorSaveFile && onErrorSaveFile(path)
    throw e
  }
  savedContent[path] = content
  fileChanged[path].value = false
}

function closeFile (path: string) {
  delete fileStateMap[path]
  openedFiles.value = openedFiles.value.filter(fileName => fileName !== path)
  const index = fileOrder.indexOf(path)
  fileOrder.splice(index, 1)
  if (path === currentFile.value) {
    currentFile.value = fileOrder.length ? fileOrder[fileOrder.length - 1] : ''
  }
}

function handleClose (path: string) {
  const discard = () => closeFile(path)
  if (fileChanged[path].value) {
    onCloseUnsaved(path,
      () => saveFile(path).then(() => closeFile(path)).catch(() => undefined),
      discard)
  } else {
    discard()
  }
}

function fileLabel (path: string) {
  if (fileChanged[path].value) {
    return `${path} ⚬`
  }
  return path
}

onMounted(() => {
  view = new EditorView({
    parent: editor.value
  })
})

defineExpose({
  openFile
})
</script>

<template>
  <div v-show="openedFiles.length">
    <n-tabs
      v-model:value="currentFile"
      type="card"
      closable
      @close="handleClose"
    >
      <n-tab
        v-for="file of openedFiles"
        :key="file"
        :name="file"
        :tab="fileLabel(file)"
      />
    </n-tabs>
    <div ref="editor" />
  </div>
</template>
