import { DotenvConfigOptions, config, parse } from 'dotenv'

export const config$ = (options?: DotenvConfigOptions) => config(options || {})

export const parse$ = (envs: {[key: string]: string} | string) => {
  if (typeof envs == 'string') return parse(envs)  
  const envs$ = Object.keys(envs || {})
  if (envs$.length) {
    const values = envs$.reduce((p, c) => {
      p.push(`${c}=${envs[c]}`)
      return p
    }, [])
    return Object.assign(process.env, parse(values.join('\n'))) as {[key: string]: string}
  }
  return {}
}