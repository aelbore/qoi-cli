#!/usr/bin/env node
import { createRequire } from 'module'

import { register } from '../register'
import { run } from '../cli.mjs'

register()
run(createRequire(import.meta.url)('../package.json'))