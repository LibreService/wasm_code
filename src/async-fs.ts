export type ASYNC_FS = {
  lstat: (path: string) => Promise<{
    mode: number
  }>
  isFile: (mode: number) => Promise<boolean>
  isDir: (mode: number) => Promise<boolean>
  readFile: (path: string) => Promise<Uint8Array>
  writeFile: (path: string, content: string | Uint8Array) => Promise<void>
  rename: (src: string, dst: string) => Promise<void>
  unlink: (path: string) => Promise<void>
  readdir: (path: string) => Promise<string[]>
  mkdir: (path: string) => Promise<void>
  rmdir: (path: string) => Promise<void>
}
