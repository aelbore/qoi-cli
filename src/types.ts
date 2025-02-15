
import type { OutputOptions, ModuleFormat, RollupOptions, Plugin as RollupPlugin } from 'rollup'
import type { PackageJson as Package } from 'types-package-json'

import type { Options } from './swc'

export { createFilter, CreateFilter, FilterFn, FilterOptions } from './filter'

export type PackageJson = Package & { 
  module?: string, 
  type?: string, 
  typings?: string, 
  exports?: {[key: string]: unknown}
}

export interface CliOptions {
  dir?: string
  config?: string
  c?: string
}

export interface BuildOptions extends CliOptions {
  name?: string
  outDir?: string
  module?: boolean
  format?: ModuleFormat
  external?: string | string[]
  resolve?: boolean | string
  cleanOutDir?: boolean
  sourcemap?: boolean
  write?: boolean
  minify?: boolean | 'literals'
  dts?: boolean | 'only'
  env?: string
}

export interface BuildOutputOptions extends BuildOptions {
  output?: (options: OutputOptions) => OutputOptions
  pkg?: PackageJson
  sourcemap?: boolean
}

export type DTSOptions = {
  file?: string
  write?: boolean
  resolve?: boolean | string[]
}

export type PackageJsonFunc = (pkg?: PackageJson) => PackageJson

export interface Plugin extends RollupPlugin {
  enforce?: 'pre' | 'post'
}

export type InputPlugin = Plugin | InputPlugin[]

export interface Config {
  name?: string
  input?: string | string[] | {[key: string]: string}
  external?: string[]
  resolve?: boolean | string[] 
  dts?: boolean | 'only' |  DTSOptions
  sourcemap?: boolean
  plugins?: InputPlugin
  swc?: Options
  output?(options: OutputOptions): OutputOptions
  buildEnd?(): Promise<void>
  packageJson?: boolean | PackageJsonFunc
  env?: {[key: string]: string}
}

export interface RequireModule extends NodeRequire {
  default?: Function
}

export interface CopyPackageOptions {
  pkg?: PackageJson
  legacy?: boolean
  outDir?: string
  packageJson?(pkg: PackageJson): PackageJson
}

export type TypesOptions = { 
  dts?: boolean | 'only' | DTSOptions, 
  config?: Config
  pkg?: PackageJson,
  resolve?: boolean | string | string[]
} & RollupOptions

export type RegisterOptions = import('@swc/core').Options & {
  tsconfig?: {
    paths?: { [from: string]: [string] }
  }
}

declare function swcPlugin(options?: Options): Plugin
declare function handler(options: BuildOptions): Promise<void>
declare function getOptions(options: BuildOptions): BuildOptions
declare function baseExternals(pkg?: PackageJson): string[]
declare function register(options?: Options): void
declare function createDefaultConfig(options?: Options): void
declare function getTsConfigPaths(tsconfigPath: string): import('typescript').CompilerOptions

declare function minifyFragmentSync(
  code: string, 
  options?: import('@swc/html').FragmentOptions
): string
declare function minifyLiterals(): import('rollup').Plugin

declare function defineConfig(config: Config | Config[]): Config | Config[]

export { minifyLiterals, minifyFragmentSync, swcPlugin, defineConfig, handler, getOptions, baseExternals, register, createDefaultConfig, getTsConfigPaths }