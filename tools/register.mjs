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
  './register.js',
  './dotenv.js'
]

const build = async (input, plugins) => {
  const bundle = await rollup({
    input,
    external,
    plugins: [ swcPlugin(), ...plugins || [] ]
  })
  await bundle.write({ dir: 'dist', format: 'es' })
}

const dtsBundle = async (input, file) => {
  const build = await rollup({
    input,
    external,
    plugins: [ dts() ],
  })
  return build.write({ 
    file: join('dist', file), 
    format: 'es' 
  })
}

const destPath = join(...[ 'node_modules', 'qoi-cli' ])

await rm(destPath, { recursive: true, force: true })
await mkdir(destPath, { recursive: true })

await Promise.all([ 
  build('./src/register.ts'),
  build('./src/dotenv.ts'),
  dtsBundle('./src/register.ts', 'register.d.ts')
])
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
      },
      "./dotenv.js": {
        "import": "./dotenv.js",
        "types": "./dotenv.d.ts"
      },
    }
  }, null, '\t')
)