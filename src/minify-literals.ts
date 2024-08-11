import type { Plugin } from 'rollup'
import { minifyHTMLLiterals } from '@literals/html-css-minifier'

export const minifyLiterals = () => {
  return {
    name: 'minify-literals',
    transform(code: string) {
      return minifyHTMLLiterals(code)
    } 
  } as Plugin
}