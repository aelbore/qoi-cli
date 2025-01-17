import * as walk from 'acorn-walk'
import makeSynchronous from 'make-synchronous'
import MagicString from 'magic-string'

export const minifyFragmentSync = makeSynchronous(async (  
  code: string,
  options?: import('@swc/html').FragmentOptions
) => {
  const html = await import('@swc/html')
  const result = await html.minifyFragmentSync(code, {
    collapseWhitespaces: 'all',
    ...options ?? {}
  })
  return result.code as string
})

export const minifyLiterals = () => { 
  return {
    name: 'minify-literals',
    transform(code: string) {
      const ast = this.parse(code), magicString = new MagicString(code)
      walk.recursive(ast, ast.body, {  
        TemplateElement(node) {
          const text = minifyFragmentSync(node.value.raw)
          magicString.overwrite(node.start, node.end, text)
        }
      })
      return {
        ast,
        code: magicString.toString(),
        map: magicString.generateMap({
          hires: true
        })
      }
    } 
  } as import('rollup').Plugin
}