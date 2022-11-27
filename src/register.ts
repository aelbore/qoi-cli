import { RegisterOptions } from './types'
import { Options, transformSync } from '@swc/core'
import { addHook } from 'pirates'

import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'
import { createRequire } from 'module'

import module from 'module'
import sourceMapSupport from 'source-map-support'

const SourcemapMap = new Map()
const DEFAULT_EXTENSIONS = ['.js', '.jsx', '.es6', '.es', '.mjs', '.ts', '.tsx']

const require$ = createRequire(import.meta.url)

/**
 * Patch the Node CJS loader to suppress the ESM error
 * https://github.com/nodejs/node/blob/069b5df/lib/internal/modules/cjs/loader.js#L1125
 * 
 * As per https://github.com/standard-things/esm/issues/868#issuecomment-594480715
 * Idea is comming from https://github.com/egoist/esbuild-register/blob/master/src/node.ts
 */
function patchLoader(compile: (code: string, filename: string) => string) {
  const extensions = module.Module['_extensions']
  const jsHandler = extensions['.js']

  extensions['.js'] = (module: any, filename: string) => {
    try {
      return jsHandler.call(this, module, filename)
    } catch (error) {
      /// error.code === undefined
      /// message = 'Cannot use import statement outside a module'
      if (error.code !== 'ERR_REQUIRE_ESM' && error.code !== undefined) {
        throw error;
      }
      const content = readFileSync(filename, 'utf8')
      module._compile(compile(content, filename), filename)
    }
  }
}

function installSourceMapSupport() {
  sourceMapSupport.install({
    handleUncaughtExceptions: false,
    environment: 'node',
    retrieveSourceMap(file) {
      if (SourcemapMap.has(file)) {
        return { url: file, map: SourcemapMap.get(file) }
      }
      return null
    }
  })
}

function compile(content: string, file: string, options: Options) {  
  const jsc = createDefaultConfig(options)?.jsc

  const { code, map } = transformSync(content, {
    filename: file,
    jsc,
    sourceMaps: 'inline',
    minify: false,
    isModule: true,
    module: {
      type: 'commonjs',
      noInterop: false
    }
  })

  map && SourcemapMap.set(file, map)

  return code
}

const getTsConfig = () => {
  const tsconfigPath = resolve('tsconfig.json')
  const tsconfig = existsSync(tsconfigPath) ? getTsConfigPaths(tsconfigPath): undefined

  const tsPaths = (process.platform.includes('win32') && tsconfig?.tsconfig) ? require$('typescript-paths'): undefined
  tsPaths?.register({ tsconfigPath: { compilerOptions: tsconfig.tsconfig } }) 

  return tsconfig as import('typescript').CompilerOptions
}

export function getTsConfigPaths(tsconfigPath: string) {
  const { compilerOptions } = require$(tsconfigPath)
  return compilerOptions?.paths ? { tsconfig: compilerOptions }: undefined 
}

export function createDefaultConfig(options?: Options) {
  return {
    ...options || {},
    jsc: {
      parser: {
        syntax: 'typescript',
        decorators: true,
        dynamicImport: true,
        tsx: true
      },
      target: options?.jsc?.target || 'es2020',
      ...process.platform.includes('win32') 
        ? {}
        : options?.jsc?.paths 
          ? { baseUrl: options?.cwd || process.cwd(), paths: options.jsc.paths }
          : {}
    },
    sourceMaps: options?.sourceMaps || false, 
    isModule: options?.isModule || true
  } as Options
}

export function register(options?: RegisterOptions) {
  const paths = options?.tsconfig?.paths ?? getTsConfig()?.paths ?? undefined

  const compileCode = (code: string, filename: string) => {
    return compile(code, filename, {
      ...options || {},
      jsc: { 
        ...options?.jsc || {}, 
        ...paths ? { paths }: {}
      },
      sourceMaps: 'inline',
      minify: false,
      isModule: true,
      module: { 
        type: 'commonjs', 
        noInterop: false 
      }
    })
  }

  installSourceMapSupport()
  patchLoader(compileCode)
  addHook(compileCode, { exts: DEFAULT_EXTENSIONS })
}