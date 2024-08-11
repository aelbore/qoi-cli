import { type FilterPattern, createFilter as $createFilter } from '@rollup/pluginutils'

export type FilterOptions = {
  include?: FilterPattern
  exclude?: FilterPattern
}

export type FilterFn = (id: string, options?: FilterOptions) => boolean

export type CreateFilter = {
  tsFilter?: FilterFn
  cssFilter?: FilterFn
  excludes?: RegExp[]
}

export const createFilter = () => {
  const excludes$ =  [ /node_modules/, /virtual/ ] 

  const merge  = (pattern?: FilterPattern) => {
    return pattern ? Array.isArray(pattern) ? pattern: [ pattern ]: [] 
  }

  const tsFilter = (id: string, options?: FilterOptions) => {
    const { include, exclude } = options ?? {}
    const filter = $createFilter(
      [ '**/*.{js,ts,tsx,jsx,mjs}', ...merge(include!) ], 
      [ ...excludes$, ...merge(exclude) ]
    )
    return filter(id)
  }

  const cssFilter = (id: string, options?: FilterOptions) => {
    const { include, exclude } = options ?? {}
    const filter = $createFilter(
      [ '**/*.{css,scss,css?inline,scss?inline}', ...merge(include) ], 
      [ ...excludes$, ...merge(exclude) ]
    )
    return filter(id)
  }

  return { tsFilter, cssFilter, excludes: excludes$ } as CreateFilter
}