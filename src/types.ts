import type { Options } from '@swc/core'
import type { Plugin, OutputOptions, ModuleFormat, RollupOptions } from 'rollup'
import type { PackageJson as Package } from 'types-package-json'

export type PackageJson = Package & { 
  module?: string, 
  type?: string, 
  typings?: string, 
  exports?: {[key: string]: unknown}
}

export interface CliOptions {
  dir?: string
}

export interface BuildOptions extends CliOptions {
  outDir?: string
  module?: boolean
  format?: ModuleFormat
  external?: string | string[]
  resolve?: boolean | string | string[]
  cleanOutDir?: boolean
  sourcemap?: boolean
  write?: boolean
  minify?: boolean | 'literals'
  dts?: boolean | 'only'
}

export interface BuildOutputOptions extends BuildOptions {
  output?: (options: OutputOptions) => OutputOptions
  pkg?: PackageJson
  sourcemap?: boolean
}

export type DTSOptions = {
  file?: string
  write?: boolean
  resolve?: boolean
}

export type PackageJsonFunc = (pkg?: PackageJson) => PackageJson

export interface Config {
  input?: string | string[]
  external?: string[]
  resolve?: boolean | string[]
  dts?: boolean | 'only' |  DTSOptions
  plugins?: Plugin[] | [Plugin[]]
  swc?: Options
  output?(options: OutputOptions): OutputOptions
  buildEnd?(): Promise<void>
  packageJson?: boolean | PackageJsonFunc
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
  pkg?: PackageJson,
  resolve?: boolean | string[]
} & RollupOptions

export type RegisterOptions = Options & {
  tsconfig?: {
    paths?: { [from: string]: [string] }
  }
}

export type handler = (options: BuildOptions) => Promise<void>
export type getOptions = (options: BuildOptions) => BuildOptions
export type baseExternals = (pkg?: PackageJson) => string[]
export type register = (options?: Options) => void
export type createDefaultConfig = (options?: Options) => void

export const defineConfig = (config: Config) => config