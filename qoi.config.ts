import type { OutputOptions, PreRenderedChunk } from 'rollup'
import { defineConfig } from './src/build'

import json from '@rollup/plugin-json'
import fs from 'fs/promises'

export default defineConfig([
  {
    input: './src/index.ts',
    resolve: [
      '@rollup/plugin-node-resolve',
      '@rollup/plugin-commonjs',
      'pirates',
      'source-map-support',
      'picomatch',
      'magic-string',
      'minify-html-literals',
      'rollup-plugin-dts'
    ],
    plugins: [ json() ],
    output(options: OutputOptions) {
      options.manualChunks = (id: string) => {
        if (id.includes('minify-html-literals')) return 'minify-html-literals'
        if (id.includes('rollup-plugin-dts')) return 'rollup-plugin-dts'
        if (id.includes('@rollup')) return 'build.vendor'
        if (id.includes('node_modules')) return 'vendor'
        if (id.includes('register')) return 'register'
        if (id.includes('build')) return 'build'
      }
      options.chunkFileNames = (chunkInfo: PreRenderedChunk) => { 
        switch (chunkInfo.name) {
          case 'register': return 'register.js'
          case 'build': return 'build.js'
          default: return '[name].[hash].js' 
        }
      }
      return options
    },
    async buildEnd() {
      await fs.unlink('./dist/qoi-cli.js')
      await fs.copyFile('./src/index.ts', './dist/qoi-cli.js')
    }
  },
  {
    input: './src/cli.ts',
    resolve: [ 'cac' ],
    output(options: OutputOptions) {
      options.entryFileNames = 'cli.mjs'
      return options
    },
    async buildEnd() {
      await fs.cp('./src/bin', './dist/bin', { recursive: true, force: true })
    }
  },
  {
    input: './src/types.ts',
    resolve: [ 'types-package-json' ],
    dts: true
  }
])