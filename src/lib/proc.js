const chalk = require('chalk')
const debug = require('debug')
const path = require('path')
debug.enable('*')

const packageJson = require('../../package')
const { log_error, print_line, log_key_value, logger, _c } = require('./logger')

process.on('uncaughtException', log_error)
process.on('unhandledRejection', log_error)

global.CWD = process.cwd()
global.ENV = '<env>'

global.CONFIG_PATH = path.resolve(CWD, 'config.json')

if (CWD.split('/').pop() === 'deploy') {
  log_error('this script can not run without a host')
  console.log(_c.cyan(' it have to be placed as submodule in another project <PROJECT>/deploy'))
  console.log(' read https://github.com/metaory/meta-deploy-cli \n')
  process.exit(1)
}

Object.defineProperty(global, 'CONFIG', {
  get: function(a, b) {
    try {
      delete require.cache[require.resolve(CONFIG_PATH)]
      const _CONFIG = require(CONFIG_PATH)
      return Object.assign(_CONFIG, {
        AWS_CONFIG: { ..._CONFIG.AWS_CONFIG,
          ...Object.keys(_CONFIG.ECS).reduce((acc, cur) => {
            acc[cur] = replaceVars(cur, _CONFIG)
            return acc
          }, {}),
        }
      })
    } catch (e) {
      console.error(e)
      console.log(_c.red_b(`to copy and overwrite config.template.json to ./config.json`))
      console.log(_c.red(` bash deploy/install.sh force\n`))
      process.exit()
    }
  }
})
Object.defineProperty(global, 'CLI_CONFIG', {
  get: function() {
    try {
      delete require.cache[require.resolve(CONFIG_PATH)]
      const _CONFIG = require(CONFIG_PATH)
      return _CONFIG.CLI_CONFIG
    } catch (e) {
      console.error(e)
      console.log(_c.red_b(`to copy and overwrite config.template.json to ./config.json`))
      console.log(_c.red(` bash deploy/install.sh force\n`))
      process.exit()
    }
  }
})

Object.defineProperty(global, 'APP_VERSION', {
  get: function() {
    try {
      const { APP_CONFIG: { PACKAGE_PATH } } = CONFIG
      if (/^<|>$|^$/.test(PACKAGE_PATH)) return 'NA'
      const _package_path = path.resolve(CWD, PACKAGE_PATH, 'package.json')
      delete require.cache[require.resolve(_package_path)]
      return require(_package_path)['version']
    } catch (e) {
      console.error(e)
      console.log(_c.red_b('Failed to read version'))
      console.log(_c.red(` bash deploy/install.sh force\n`))
      process.exit()
    }
  }
})

function replaceVars(field, config) {
  const { APP_CONFIG: { NAME, LOAD_BALANCER_NAME, CACHE_NAME }, AWS_CONFIG: { REGISTRY_ID, REGION }, ECS } = config
  const replaceFields = { NAME, ENV, REGISTRY_ID, REGION, LOAD_BALANCER_NAME, CACHE_NAME }
  return ECS[field].replace(/{\w+}/g, (matched) => {
    return replaceFields[matched.replace(/{|}/g, '')]
  })
}

global.CLI_CONFIG_LABELS = {
  'BUMP_VERSION': 'Version Bump',
  'BUMP_VERSION_DEFAULT': 'Default Version Bump Prompt Value',

  'PRE_BUILD': 'Application Build',
  'PRE_BUILD_DEFAULT': 'Default Application Build Prompt Value',

  'BUILD_IMAGE': 'Container Build',
  'BUILD_DEFAULT': 'Default Container Build Prompt Value',

  'TAG_IMAGE': 'Tag Image',
  'PUSH_IMAGE': 'Push Image',
  'RESTART_TASK': 'Restart Image',
  'VERBOSE': 'Verbose'
}

process.nextTick(() => logger.info({ dim: `${packageJson.name.toUpperCase()} ${packageJson.version}`}))
