const fs = require('fs')
const path = require('path')
const { _c, logger, env_f, print_line } = require('../lib/logger')
const { exec, spawn } = require('../lib/child_process')
const { input, envPrompt, settingsPrompt, anyKey } = require('../lib/prompts')
const { repository: { url = '' } = {} } = require(CWD + '/package.json')

async function _promptConfigField(root, key, value) {
  if (!key) return
  const newValue = await input(key, value)
  await _writeToConfigJson(root, key, newValue)
}
async function _writeToConfigJson(root, key, value) {
  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, { encoding: 'utf8' }))
  fs.writeFileSync(CONFIG_PATH,
    JSON.stringify({ ...config,
      [root]: { ...config[root], [key]: value }
    }, null, '\t'))
}
// ////////////////////////////////////////////////////////////////////////// //
// ////////////////////////////////////////////////////////////////////////// //
async function checkConfigs({ silent }) {
  for (const rootKey in CONFIG) {
    if (!/_CONFIG$|^$/.test(rootKey)) continue
    for (const configKey in CONFIG[rootKey]) {
      const msg = CONFIG[rootKey][configKey]
      if (/^<|>$|^$/.test(msg)) {
        logger.error({ alt: rootKey, key: configKey, msg })
        await _promptConfigField(rootKey, configKey, msg)
      } else if (!silent && CLI_CONFIG.VERBOSE && !['CLI_CONFIG'].includes(rootKey)) {
        logger.ok({ dim: rootKey, alt: configKey, msg })
      }
    }
  }
  const { APP_CONFIG: { NAME } } = CONFIG
  const __len = NAME.length > 5 ? NAME.length : 6
  logger.info({
    dim: `:..${NAME.toUpperCase().padEnd(__len + 2, '.')}:`,
    msg: `${_c.green_b(APP_VERSION)} ${env_f()}`,
    lb: -1
  })
  const HEAD = await exec('git rev-parse HEAD')
  const SHA = HEAD.slice(0, 7)
  logger.info({
    dim: `:..${'HEAD-SHA'.padEnd(__len + 2, '.')}:`,
    msg: _c.dim(url.replace('.git', '/commit/')) + _c.blue_n(SHA.slice(0, 7)),
    lb: 1
  })
}
// ////////////////////////////////////////////////////////////////////////// //
async function settings() {
  const choices = Object.keys(CLI_CONFIG).reduce((acc, cur) => {
    acc.push({
      name: _c.cyan(CLI_CONFIG_LABELS[cur]),
      value: cur,
      checked: !!CLI_CONFIG[cur]
    })
    return acc
  }, [])
  const settingsOpt = await settingsPrompt({ choices })
  for (const opt of choices) {
    await _writeToConfigJson('CLI_CONFIG', opt.value, settingsOpt.includes(opt.value))
  }
  logger.ok({ alt: 'CLI-Settings', msg: 'Saved Successfully' })
  await anyKey()

}
// ////////////////////////////////////////////////////////////////////////// //
async function checkDependencies() {
  for (const dep of CONFIG['DEPENDENCIES']) {
    try {
      await exec(`type ${dep}`)
    } catch (e) {
      logger.error({ alt: 'Dependency', key: dep, msg: 'Not Found', rt: true })
      process.exit(1)
    }
  }
}
module.exports = {
  init: async ({ silent = false } = {}) => {
    await checkConfigs({ silent })
    await checkDependencies()
  },
  checkDependencies,
  checkConfigs,
  settings
}
// ////////////////////////////////////////////////////////////////////////// //
