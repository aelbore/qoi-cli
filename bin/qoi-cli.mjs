#!/usr/bin/env node
import { createRequire } from 'module'
import { register } from 'qoi-cli/register'

register()

const require = createRequire(import.meta.url)
require('../src/cli').run(require('../package.json'))