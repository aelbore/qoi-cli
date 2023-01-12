import { readFileSync, writeFileSync } from 'fs'

const PKG_PATH = './node_modules/typescript-paths/package.json'
const pkg$ = JSON.parse(readFileSync(PKG_PATH, 'utf-8'))
pkg$.exports['.']['import'] = './lib/esm/index.js'
writeFileSync(PKG_PATH, JSON.stringify(pkg$, null, '\t'))