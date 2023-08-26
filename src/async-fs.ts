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

async function lsDir (fs: ASYNC_FS, path: string) {
  const names = await fs.readdir(path)
  return names.filter(name => name !== '.' && name !== '..')
}

function traverseFS (fs: ASYNC_FS, preFolderCallback: HandlerZeroAction | undefined, fileCallback: HandlerZeroAction, postFolderCallback: HandlerZeroAction | undefined) {
  async function clo (path: string) {
    const { mode } = await fs.lstat(path)
    if (await fs.isDir(mode)) {
      if (!path.endsWith('/')) {
        path += '/'
      }
      preFolderCallback && await preFolderCallback(path)
      const names = await lsDir(fs, path)
      for (const name of names) {
        await clo(path + name)
      }
      return postFolderCallback && postFolderCallback(path)
    }
    return fileCallback(path)
  }
  return clo
}

export {
  lsDir,
  traverseFS
}
