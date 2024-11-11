import type { Plugin } from 'rollup'
import { createFilter, type CreateFilter } from './filter'

import { existsSync, statSync } from 'fs'
import { dirname, extname, join } from 'path'

import { minifySync, transformSync } from '@swc/core'
import { createDefaultConfig } from './register'

const EXTENSIONS = [ 'ts', 'tsx' ]

function pathResolver(extensions?: string[]) {
  const exts = [ ...EXTENSIONS, 'js', 'jsx', ...(extensions ?? []) ]

  const resolveFile = (resolved: string, index: boolean = false) => {
    for (const extension of exts) {
      const file = index
        ? join(resolved, `index.${extension}`)
        : `${resolved}.${extension}`
      if (existsSync(file)) {
        return file
      }
    }
    return null
  }

  return function resolveId(id: string, origin: string | undefined) {
    if (origin && id[0] === '.') {
      const resolved = join(dirname(origin), id)
      const file = resolveFile(resolved)
      if (file) {
        return file
      }
      if (existsSync(resolved) && statSync(resolved).isDirectory()) {
        const coreFile = resolveFile(resolved, true)
        if (coreFile) {
          return coreFile
        }
      }
    }
  }
}

const minify = (code: string, options: Options) => {
  return minifySync(code, {
    sourceMap: (typeof options?.sourceMaps == 'string') ? true: options.sourceMaps,
    module: options?.jsc?.minify?.module ?? true,
    compress: true,
    mangle: { toplevel: true }
  })
}

export type Options = { 
  createFilter?: () => Partial<CreateFilter>
} & import('@swc/core').Options

export function swcPlugin(options?: Options) {
  const extensions = EXTENSIONS.map(ext => `.${ext}`)
  const filter = (id: string) => extensions.includes(extname(id))
  const filter$ = options?.createFilter?.()

  const { createFilter, ...rest } = options ?? {}
  const defaults = createDefaultConfig(rest)
  const opts = { 
    ...defaults,
    jsc: {
      ...defaults.jsc ?? {},
      ...({ baseUrl: rest?.jsc?.baseUrl ?? process.cwd() }),
      ...({ paths: rest?.jsc?.paths ?? {} })
    }
  } as Options 
  return {
    name: 'swc',
    resolveId: pathResolver(),
    transform(code: string, id: string) {
      if (id.includes('node_modules')) return null
      if (filter$?.tsFilter?.(id) || filter$?.cssFilter?.(id) || filter(id)) {
        return transformSync(code, { filename: id, ...opts })
      }
    },
    renderChunk(code: string) {
      return rest?.minify ? minify(code, rest): null
    }
  } as Plugin
}