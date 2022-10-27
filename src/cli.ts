import type { BuildOptions } from './types'
import type { PackageJson } from 'types-package-json'

import { createRequire } from 'module'
import { resolve } from 'node:path'

import { cac } from 'cac'

export function run(p: PackageJson) {
  const cli = cac('qoi')
  const require$ = createRequire(import.meta.url)
  
  cli
  .command('[file]')
  .action(file => require$(resolve(file)))

  cli
  .command(
    'build [dir]', 
    'Build your typescript or javascript code')
  .option(
    '--dts [dts]', 
    '[boolean] Generates corresponding .d.ts file  (default: false)')
  .option(
    '--resolve [resolve]', 
    '[boolean] resolve external dependencies')
  .option(
    '--cleanOutDir', 
    '[boolean] force empty outDir')
  .option(
    '--minify [minify]', 
    '[boolean] enable/disable minification(default: false)')
  .action(async (dir: string, options: BuildOptions) => { 
    const { handler, getOptions } = require$('./build')
    await handler(getOptions({ ...options, dir }))
  })
    
  cli
  .help()
  .version(p.version)
  .parse()
}