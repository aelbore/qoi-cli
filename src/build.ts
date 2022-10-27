import type { ModuleFormat, OutputOptions, RollupOptions } from 'rollup'
import type { 
  RequireModule, 
  Config, 
  BuildOptions, 
  PackageJson, 
  BuildOutputOptions,
  TypesOptions,
  DTSOptions,
  CopyPackageOptions,
  PackageJsonFunc
} from 'types'

import { existsSync, statSync, rmSync, mkdirSync } from 'node:fs'
import { copyFile, mkdir, writeFile } from 'node:fs/promises'
import { dirname, join, basename } from 'node:path'
import { createRequire, builtinModules } from 'node:module'

import { rollup } from 'rollup'

import nodeResolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import MagicString from 'magic-string'

import { swcPlugin } from './swc'

type CreateOptions = {
  config?: Config, 
  options?: BuildOptions,
  pkg?: PackageJson 
}

type CopyReadmeOptions = {
  filePath?: string
  output?: string
}

type EntryFile = {
  dir?: string
  pkgName?: string
}

const baseDir = () => {
  return process.env.APP_ROOT_PATH ?? process.cwd()
}

const getPackageNameScope = (name: string) => {
  const names = name.split('/')
  return (names.length > 1) ? names[1]: names.pop()
}

const getPackage = (filePath?: string) => {
  const pkgPath = filePath ?? join(baseDir(), 'package.json')
  return (requireModule(pkgPath) as any) as PackageJson
}

const resolveConfigFile = () => {
  const configs = [ 'qoi.config.ts', 'qoi.config.js', 'qoi.config.mjs' ]
  for (const config of configs) {
    const CONFIG_FULL_PATH = join(baseDir(), config)
    if (existsSync(CONFIG_FULL_PATH)) return config
  }
  return null
}

const requireModule = (modulePath: string): RequireModule => {
  try { return require(modulePath)
  } catch { return createRequire(import.meta.url)(modulePath) }
}

const updateExternalWithResolve = (
  options: Omit<BuildOptions, 'resolve'> 
    & { resolve?: boolean | string | string[] }
) => {
  const { resolve, external } = options
  if (typeof resolve == "boolean" && resolve) {
    return []
  }
  if (Array.isArray(resolve)) {
    return Array.from(external).filter(value => (!resolve.includes(value)))
  }
  if (typeof resolve == "string") {
    const resolves = resolve.split(',')
    const externals = Array.from(external).filter(value => (!resolves.includes(value)))
    return externals
  }
  return external ?? []
}

const removeLicense = (minify: boolean) => {
  const toMinify = (code: string) => {
    const content = new MagicString(code)
    return ({ code: content.replace('@license', ''), map: content.generateMap({ hires: true }) })
  }
  return {
    name: 'license',
    transform(code: string) {
      return minify && toMinify(code)
    }
  }
}

const minifyLiterals = (isLiterals: boolean) => {
  const toMinify = (code: string) => {
    const minify = createRequire(import.meta.url)('minify-html-literals')
    return minify.minifyHTMLLiterals(code)
  }
  return {
    name: 'minify-literals',
    async transform(code: string) {
      return isLiterals && await toMinify(code)
    } 
  }
}

const tsPaths = () => {
  const require = createRequire(import.meta.url)
  const tsconfigPath = join(process.cwd(), 'tsconfig.json')
  
  const tsconfig = process.platform.includes('win32') && existsSync(tsconfigPath) ? require(tsconfigPath): undefined
  return tsconfig?.compilerOptions?.paths ? [ require('rollup-plugin-tsconfig-paths')() ]: []
}

const createOutputOptions = (options: BuildOutputOptions) => {
  const { output, outDir: dir = 'dist', pkg, format, sourcemap } = options

  const filename = getPackageNameScope(pkg.name) + (options.module ? '.mjs': '.js')
  const outputs = format.split(',').map((format: string) => {
    const outputOptions = {
      dir: (format.includes('cjs') ? join(dir, 'cjs'): dir),
      format: (options.module ? 'es': format) as ModuleFormat,
      sourcemap,
      entryFileNames: filename,
      chunkFileNames: '[name].[hash].js'
    } as OutputOptions
    return output?.(outputOptions) ?? outputOptions
  })

  return outputs
}

const createOptions = ({ config, options, pkg }: CreateOptions) => {
  const isLiterals = (typeof options.minify == 'string') && options.minify.includes('literals')
  const minify = (typeof options.minify == 'boolean') ? options.minify: isLiterals
  return {
    input: config.input || getEntryFile({ pkgName: pkg.name, dir: options.dir }),
    external: updateExternalWithResolve({
      resolve: config.resolve ?? options.resolve ?? false,
      external: [
        ...((options.external || '') as string).split(','),
        ...config.external || [],
        ...baseExternals(pkg)
      ]
    }),
    plugins: [
      ...config?.plugins?.flat() || [],
      ...tsPaths(),
      removeLicense(minify),
      commonjs(),
      nodeResolve(),
      swcPlugin(config.swc),
      minifyLiterals(isLiterals)
    ],
    output: createOutputOptions({
      ...options,
      pkg,
      output: config.output
    })
  } as RollupOptions
}

const build = async (options: RollupOptions, write: boolean = true) => {
  const { output } = options
  const outputOptions = Array.isArray(output) ? output: [ output ]

  const bundle = await rollup(options)
  return Promise.all(outputOptions.map(outputOption => {
    return bundle[write ? 'write': 'generate'](outputOption)
  }))
}

const dtsBuild = async (options: TypesOptions) => {
  const { input, output: o, external, pkg, resolve, dts } = options
  const dtsPlugin = await import('rollup-plugin-dts')

  const resolve$ = Array.isArray(resolve) 
    ? resolve: typeof resolve == 'string' ? resolve.split(','): []

  const createDefaultOptions = () => {
    const output = Array.isArray(o) ? o: [ o ]
    const file = output[0].entryFileNames
    const dir = output[0].dir
    return {
      file: (file && typeof file == 'string')
        ? join(dir, file.includes('.js') ? basename(file, '.js') + '.d.ts': file)
        : join(dir, getPackageNameScope(pkg.name) + '.d.ts'), 
      write: true, 
      resolve: false
    } as DTSOptions
  }
  const opts = typeof dts == 'boolean' || typeof dts == 'string'
    ? createDefaultOptions(): { ...createDefaultOptions(), ...dts || {} }

  const bundle = await rollup({
    input, 
    external,
    plugins: [
      {
        name: 'style',
        transform(_, id) {
          return (id.includes('.css') || id.includes('.scss'))
            && { code: '' }
        }
      },
      dtsPlugin.default({ 
        respectExternal: (opts.resolve as boolean) || 
         (typeof resolve == 'boolean' ? resolve: resolve$.length ? true: false) as boolean         
      })
    ]
  })

  return bundle[opts.write ? 'write': 'generate']({ file: opts.file, format: 'es' })
}

const copyReadMeFile = async (options?: CopyReadmeOptions) => {
  const fileName = 'README.md'
  const src = options?.filePath ?? join(baseDir(), fileName)
  const destPath = join((options?.output ?? 'dist'), fileName)
  mkdirSync(dirname(destPath), { recursive: true })
  existsSync(src) && await copyFile(src, destPath)
}

const createCommonjsPackageFile = async (outDir: string) => {
  const outputFile = join(outDir, 'cjs', 'package.json')
  await mkdir(dirname(outputFile), { recursive: true })
  await writeFile(outputFile, JSON.stringify({ type: 'commonjs' }, null, 2))
}

const copyPackge = async (options: CopyPackageOptions) => {
  const { pkg, outDir, legacy, packageJson } = options

  const name = getPackageNameScope(pkg.name)
  const main = pkg.main || `${name}.js`
  const hasLegacy = legacy && (!pkg.exports)

  const packageFile = {
    name: pkg.name,
    version: pkg.version,
    ...(pkg.bin ? { bin: { ...pkg.bin } }: {}),
    type: pkg.type || 'module',
    main,
    module: main,
    ...(hasLegacy
      ? { exports: { require: `./cjs/${main}`, import: `./${main}` } }
      : {}),
    typings: pkg.typings || `${name}.d.ts`,
    keywords: pkg.keywords,
    author: pkg.author,
    license: pkg.license,
    ...(pkg.peerDependencies
      ? { peerDependencies: pkg.peerDependencies }
      : {}),
    ...(pkg.dependencies 
        ? { dependencies: pkg.dependencies }
        : {})
  } as PackageJson

  const pkgJsonFunc = typeof packageJson == 'boolean' ? undefined: packageJson
  const json = pkgJsonFunc?.(packageFile) ?? packageFile
  const outputFile = join(outDir, 'package.json')

  await writeFile(outputFile, JSON.stringify(json, null, 2))
  hasLegacy && await createCommonjsPackageFile(outDir)
}

function loadConfig(configFile?: string) {
  const CONFIG_FULL_PATH = join(baseDir(), configFile ?? resolveConfigFile() ?? '')
  return (
    statSync(CONFIG_FULL_PATH).isFile() && existsSync(CONFIG_FULL_PATH) 
      ? requireModule(CONFIG_FULL_PATH)?.default
      : {}
  ) as Config | Config[]
}

const getEntryFile = (options?: EntryFile) => {
  const extensions = [ '.ts', '.js', '.tsx', '.jsx', '.mjs']
  const createExtensions = (value: string)  => extensions.map(e => `${value}${e}`)
  
  const { dir = 'src', pkgName } = options || {}
  const name = getPackageNameScope(pkgName)

  const entryFiles = [ 
    ...createExtensions('index'),
    ...createExtensions('main'),
    ...(name ? createExtensions(name): []) 
  ]
  const file = entryFiles.find(entry => existsSync(join(dir, entry)))
    
  if (file) {
    return join(dir, file)
  }

  throw new Error('Entry file is not exist.')
}

const isDtsOnly = (options: BuildOptions, config: Config) => {
  return (typeof options.dts == 'string' && options.dts === 'only')
    || (typeof config.dts == 'string' && config.dts === 'only')
}

export function baseExternals(pkg?: PackageJson) {
  pkg = pkg ?? getPackage()
  return [
    ...builtinModules,
    ...Object.keys(pkg.peerDependencies || {}),
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {})
  ] as string[]
}

export function getOptions(options: BuildOptions) {
  return {
    format: 'es',
    outDir: 'dist',
    sourcemap: false,
    cleanOutDir: false,
    write: true,    
    ...options || {}
  } as BuildOptions
}

export async function handler(options: BuildOptions) {
  const config = loadConfig(), pkg = getPackage()
  const configs = Array.isArray(config) ? config: [ config ]
  
  options.cleanOutDir && rmSync(options.outDir, { force: true, recursive: true })

  await Promise.all(configs.map(async c => {
    const opts = createOptions({ config: c, options, pkg })
    await Promise.all([ 
      ((typeof options.dts === 'boolean' && options.dts) || !isDtsOnly(options, c)) 
        && build(opts),
      (options.dts || c.dts) 
        && dtsBuild({ 
            ...opts, dts: options.dts || c.dts, 
            resolve: c.resolve || options.resolve
          }),
      copyReadMeFile({ output: options.outDir }),
      copyPackge({ 
        pkg, 
        outDir: options.outDir,
        packageJson: c.packageJson as PackageJsonFunc,
        legacy: options.format.split(',').includes('cjs') 
      })
    ])
    c.buildEnd && await c.buildEnd()
  }))
}

export const defineConfig = (config: Config | Config[]) => config