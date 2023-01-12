import type { Plugin } from 'rollup'
import { minifyHTMLLiterals } from 'minify-html-literals'

export const minifyLiterals = () => {
  return {
    name: 'minify-literals',
    transform(code: string) {
      return minifyHTMLLiterals(code)
    } 
  } as Plugin
}