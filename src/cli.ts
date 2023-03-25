import type { BuildOptions } from './types'
import type { PackageJson } from 'types-package-json'

import { createRequire } from 'module'
import { resolve } from 'node:path'
import { statSync, existsSync } from 'node:fs'

import { cac } from 'cac'

export function run(p: PackageJson) {
  const cli = cac('qoi')
  const require$ = createRequire(import.meta.url)

  const dotenv = (env?: string) => {
    const dotenv = require$('./dotenv')
    if (existsSync(env) && statSync(env).isFile()) {
      Object.assign(process.env, dotenv.config$({ path: env }))
    }
    if (existsSync('.env')) {
      Object.assign(process.env, dotenv.config$())
    }
    const content = env?.split?.(',')?.join('\n')
    Object.assign(process.env, dotenv.parse$(content))
  }
  
  cli
  .command('[file]')
  .action(file => {
    dotenv()
    const paths = [ resolve(file), resolve('node_modules', file) ]
    for (const path$ of paths) {
      existsSync(path$) && require$(path$)
    }
  })

  cli
  .command('build [dir]', 'Build your typescript or javascript code')
  .option('-c, --config <file>', `[string] use specified config file`)
  .option('--name <name>', '[string] name of the config to execute')   
  .option('-f, --format <format>', '[string] Specifies the format of the generated bundle (default: "es")')   
  .option('--sourcemap', '[boolean] output source maps for build (default: false)') 
  .option('--dts [dts]', '[boolean] Generates corresponding .d.ts file  (default: false)')
  .option('--resolve [resolve]', '[boolean] resolve external dependencies')
  .option('--external <external>', '[string] Specify external dependencies')
  .option('--cleanOutDir', '[boolean] force empty outDir')
  .option('--minify [minify]', '[boolean] enable/disable minification(default: false)')
  .option('--env <file>', `[string] env variables or path of env`)
  .action(async (dir: string, options: BuildOptions) => { 
    dotenv(options.env)
    const { handler, getOptions } = require$('./build')
    await handler(getOptions({ ...options, dir }))
  })
    
  cli.help().version(p.version).parse()
}