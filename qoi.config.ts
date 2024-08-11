import type { OutputOptions, PreRenderedChunk } from 'rollup'
import type { PackageJson } from 'types'

import { defineConfig } from './src/build'

import json from '@rollup/plugin-json'
import fs from 'fs/promises'

import { existsSync } from 'fs'

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
      'rollup-plugin-dts',
      'dotenv',
      'rollup-plugin-tsconfig-paths',
      'typescript-paths',
      '@literals/html-css-minifier',
      '@literals/parser',
      'html-minifier-terser'
    ],
    plugins: [ json() ],
    output(options: OutputOptions) {
      options.minifyInternalExports = false
      options.manualChunks = (id: string) => {
        if (id.includes('dotenv')) return 'dotenv'
        if (id.includes('picomatch')) return 'picomatch'
        if (id.includes('minify-literals') || 
            id.includes('@literals/html-css-minifier') || 
            id.includes('@literals/parser') ||
            id.includes('html-minifier-terser')) return 'minify-literals'
        if (id.includes('ts-paths') || id.includes('rollup-plugin-tsconfig-paths') || id.includes('typescript-paths')) return 'ts-paths'
        if (id.includes('rollup-plugin-dts')) return 'rollup-plugin-dts'
        if (id.includes('@rollup')) return 'build.vendor'
        if (id.includes('node_modules')) return 'vendor'
        if (id.includes('register')) return 'register'
        if (id.includes('build')) return 'build'
        if (id.includes('filter')) return 'filter'
      }
      options.chunkFileNames = (chunkInfo: PreRenderedChunk) => {
        switch (chunkInfo.name) {
          case 'dotenv': return 'dotenv.js'
          case 'ts-paths': return 'ts-paths.js'
          case 'minify-literals': return 'minify-literals.js'
          case 'register': return 'register.js'
          case 'build': return 'build.js'
          case 'filter': return 'filter.js'
          default: return '[name].[hash].js'
        }
      }
      return options
    },
    async buildEnd() {
      const destPath = './dist/qoi-cli.js'
      existsSync(destPath) && await fs.unlink(destPath)
      await fs.copyFile('./src/index.ts', destPath)
    }
  },
  {
    input: './src/cli.ts',
    external: [
      './build',
      './dotenv'
    ],
    resolve: [ 'cac' ],
    output(options: OutputOptions) {
      options.minifyInternalExports = false
      options.entryFileNames = 'cli.mjs'
      return options
    },
    async buildEnd() {
      await fs.cp('./src/bin', './dist/bin', { recursive: true, force: true })
    }
  },
  {
    input: './src/types.ts',
    resolve: [
      'types-package-json'
    ],
    packageJson(pkg: PackageJson) {
      pkg.exports = {
        ...pkg.exports || {},
        '.': { default: './qoi-cli.js' },
        './register.js': './register.js',
        './build.js': './build.js',
        './dotenv.js': './dotenv.js',
        './minify-literals.js': './minify-literals.js',
        './ts-paths.js': './ts-paths.js',
        './filter.js': './filter.js'
      }
      return pkg
    },
    dts: 'only'
  }
])