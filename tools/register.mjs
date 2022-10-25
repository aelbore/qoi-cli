import { builtinModules, createRequire } from 'module'
import { rename, mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { rollup } from 'rollup'
import { transformSync } from '@swc/core'

import dts from 'rollup-plugin-dts'

const pkg = createRequire(import.meta.url)('../package.json')

const swcPlugin = () => ({
  transform(code, id) {
    return id.includes('.ts') && 
      transformSync(code, {
        filename: id, 
        jsc: { 
          parser: { syntax: 'typescript' },
          target: 'es2022'
        },
        isModule: true
      })
  }
})

const external = [
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.devDependencies || {}),
  ...builtinModules,
  './register.js'
]

const build = async () => {
  const bundle = await rollup({
    input: './src/register.ts',
    external,
    plugins: [ swcPlugin() ]
  })
  await bundle.write({ dir: 'dist', format: 'es' })
}

const dtsBundle = async () => {
  const build = await rollup({
    input: './src/register.ts',
    external,
    plugins: [ dts() ],
  })
  return build.write({ 
    file: join('dist', 'register.d.ts'), 
    format: 'es' 
  })
}

const destPath = join(...[ 'node_modules', 'qoi-cli' ])

await rm(destPath, { recursive: true, force: true })
await mkdir(destPath, { recursive: true })

await Promise.all([ build(), dtsBundle() ])
await rename('dist', destPath)
await writeFile(
  join(destPath, 'package.json'), 
  JSON.stringify({
    "name": "qoi-cli",
    "version": "0.0.1",
    "type": "module",
    "exports": {
      "./register": {
        "import": "./register.js",
        "types": "./register.d.ts"
      }
    }
  }, null, '\t')
)