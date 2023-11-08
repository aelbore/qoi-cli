import tsconfigPath from 'rollup-plugin-tsconfig-paths'
import { register as register$, RegisterOptions, OptionFallback } from 'typescript-paths'

export const tsconfigPaths = () => tsconfigPath()

export const register$$ = (options: RegisterOptions & OptionFallback) => {
	return register$(options)
}