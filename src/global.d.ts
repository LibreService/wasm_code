import type { ASYNC_FS as _ASYNC_FS } from './async-fs'

declare global {
  type HidePath = (path: string) => boolean
  type HandlerZeroAction = (path: string) => void | Promise<void>
  type HandlerOneAction = (path: string, action: (path: string) => Promise<void>) => void | Promise<void>
  type HandlerTwoActions = (path: string, positiveAction: () => Promise<void>, negativeAction: () => void) => void | Promise<void>
  type HandlerUpload = (path: string, upload: (files: { name: string, content: Uint8Array }[]) => Promise<void>) => void
  type ASYNC_FS = _ASYNC_FS
}

export {}
