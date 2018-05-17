const path = require('path')
const log = require('debug')('App')
const { exec, spawn } = require('../lib/child_process')
const { print_line, logger, _c } = require('../lib/logger')
const prompts = require('../lib/prompts')

// ////////////////////////////////////////////////////////////////////////// //
async function _initSequence(groupName, sequence) {
  const { NAME, PATH = '.', COMMANDS } = sequence
  if (!COMMANDS || !COMMANDS.length || !Array.isArray(COMMANDS))
    return logger.warning({ alt: groupName, key: NAME, msg: 'COMMANDS IS NOT SET' })
  logger.info({ alt: groupName, key: NAME, msg: `COMMENCING` })
  for (const command of COMMANDS) {

    const raw = command.replace(/{\w+}/g, (matched) => {
      const key = matched.replace(/^{|}$/g, '')
      if (key in global === false) {
        logger.error({ alt: `${groupName} ${NAME}`, key, msg: 'Not Found in global configs' })
        process.exit(1)
      }
      return global[key]
    })
    const rawSplit = raw.split(' ')
    const cmd = rawSplit.shift()
    const args = rawSplit
    const cwd = path.resolve(PATH)

    await spawn(cmd, args, { cwd })
  }
}
// ////////////////////////////////////////////////////////////////////////// //
async function _initSequenceSerie(name, serie) {
  if (!serie || !serie.length || !Array.isArray(serie))
    return logger.warning({ alt: 'APP_BUILD_SEQUENCE', key: name, msg: 'IS NOT SET' })
  const series = CONFIG['APP_BUILD_SEQUENCE']
  logger.info({ alt: 'APP_BUILD_SEQUENCE', key: name, msg: 'LOADING' })
  for (const sequence of serie) {
    await _initSequence(name, sequence)
  }
}
// ////////////////////////////////////////////////////////////////////////// //
// ////////////////////////////////////////////////////////////////////////// //
const bumpVersion = async () => {
  const { BUMP_VERSION, BUMP_VERSION_DEFAULT } = CLI_CONFIG
  if (!BUMP_VERSION) return Promise.resolve()
  const confirm = await prompts.confirm({ msg: `Bump Version`, opt: BUMP_VERSION_DEFAULT })
  if (!confirm) return Promise.resolve()
  const { APP_CONFIG: { PACKAGE_PATH } } = CONFIG

  const oldVersion = APP_VERSION
  logger.info({ alt: 'Current Version', key: oldVersion })
  const opt = await prompts.versionPrompt(oldVersion)
  const _package_path = path.resolve(CWD, PACKAGE_PATH)
  if (opt !== 'none') { await exec(`npm version --no-git-tag-version ${opt}`, { cwd: _package_path }) }
  logger.ok({ alt: 'New Version', key: oldVersion, msg: APP_VERSION })
}
// ////////////////////////////////////////////////////////////////////////// //
async function initPreBuildSequence() {
  const { PRE_BUILD, PRE_BUILD_DEFAULT } = CLI_CONFIG
  if (!PRE_BUILD) return Promise.resolve()
  const confirm = await prompts.confirm({ msg: `Init Pre Build Sequence`, opt: PRE_BUILD_DEFAULT })
  if (!confirm) return Promise.resolve()
  log('commencing Pre Build Sequence')
  const series = CONFIG['APP_BUILD_SEQUENCE']
  for (const group in series) {
    await _initSequenceSerie(group, series[group])
  }
}
// ////////////////////////////////////////////////////////////////////////// //
module.exports = {
  bumpVersion,
  initPreBuildSequence
}
