import type { BuildOptions } from './types'
import type { PackageJson } from 'types-package-json'

import { createRequire } from 'module'
import { resolve } from 'node:path'

import { cac } from 'cac'

export function run(p: PackageJson) {
  const cli = cac('qoi')
  
  cli
  .command('[file]')
  .action(file => {
    createRequire(import.meta.url)(resolve(file))
  })

  cli
  .command(
    'build [dir]', 
    'Build your typescript or javascript code')
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
    const { handler, getOptions } = createRequire(import.meta.url)('./build')
    await handler(getOptions({ ...options, dir }))
  })
    
  cli
  .help()
  .version(p.version)
  .parse()
}