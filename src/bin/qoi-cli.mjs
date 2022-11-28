#!/usr/bin/env node
import { createRequire } from 'module'
import { existsSync } from 'node:fs'

import { register } from '../register.js'
import { run } from '../cli.mjs'

existsSync('.env') && await import('../dotenv.js')

register()
run(createRequire(import.meta.url)('../package.json'))