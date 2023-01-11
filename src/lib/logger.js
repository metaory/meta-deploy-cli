const chalk = require('chalk')
const debug = require('debug')

const packageJson = require('../../package')
const _debug = debug(packageJson.name)
const errorLogger = debug('error')

const colWidth = () => process.stdout.columns || 60

const _c = {
  error: chalk.bold.red,
  warn: chalk.keyword('orange'),
  info: chalk.keyword('dodgerblue'),
  gray: chalk.gray,
  bold: chalk.bold,

  reset: chalk.reset,
  cyan: chalk.cyan,
  gray_n: chalk.reset.white,
  dim: chalk.dim,
  red: chalk.red,
  green: chalk.green,
  blue: chalk.blue,
  blue_n: chalk.reset.bold.blue,
  yellow: chalk.yellow,
  magenta: chalk.magenta,

  cyan_b: chalk.bold.cyan,
  red_b: chalk.bold.red,
  green_b: chalk.bold.green,
  blue_b: chalk.bold.blue,
  yellow_b: chalk.bold.yellow,
  magenta_b: chalk.bold.magenta,
  dim_b: chalk.bold.dim,
  gray_b: chalk.bold.black,

  red_i: chalk.bold.inverse.red,
  green_i: chalk.bold.inverse.green,
  blue_i: chalk.bold.inverse.blue,
  yellow_i: chalk.bold.inverse.yellow,
}

const log_key_value = (key, value = '') => {
  var message = ` ${_c.gray(key)} ${_c.bold(value)}`
  console.log(message)
}

function _write({
  level,
  alt = '',
  key = '',
  msg = '',
  dim = '',
  lb = 0,
  fp = false,
  debug = false,
}) {
  const err = level === 'error'
  const levelColor = (level => {
    switch (level) {
      case 'ok':
        return 'green_b'
      case 'info':
        return 'blue_b'
      case 'error':
        return 'red_b'
      case 'warning':
        return 'magenta_b'
      default:
        return 'cyan_b'
    }
  })(level)
  const prefix = (level => {
    switch (level) {
      case 'error':
        return _c[levelColor]('>>')
      case 'warning':
      case 'info':
      case 'ok':
        return _c[levelColor]('!')
      default:
        return _c[levelColor]('>')
    }
  })(level)
  const f_alt = _c.bold(alt)
  const f_key = _c.yellow_b(key)
  const f_dim = _c.gray_b(dim)
  const f_msg = _c[levelColor](msg)
  if ([-1, 2].includes(lb) && !fp) print_line()
  const formatted = [f_dim, f_alt, f_key, f_msg].reduce((acc, cur) => {
    if (cur) acc += cur + ' '
    return acc
  }, fp ? '' : `${prefix} `)

  if (debug) genLogger(alt, true)(`${f_key} ${f_msg}`)
  if (fp) return formatted
  else console.log(formatted)
  if ([1, 2].includes(lb) && !fp) print_line()
}
const logger = {
  ok: (args) => _write({ level: 'ok', ...args }),
  info: (args) => _write({ level: 'info', ...args }),
  error: (args) => _write({ level: 'error', ...args }),
  warning: (args) => _write({ level: 'warning', ...args }),
}

const log_error = (e = 'Error') => {
  if (typeof e === 'string') {
    return console.log(_c.red_i(e))
  }
  e.name && console.log(_c.red_i(e.name))
  errorLogger(_c.red(e.message))
  if (CLI_CONFIG.VERBOSE === true && e.stack)
    errorLogger(_c.red(e.stack))
}

const env_f = (env = ENV) => _c[(env => {
  switch (env) {
    case 'prod':
      return 'magenta_b'
    case 'stage':
      return 'yellow_b'
    default:
      return 'bold'
  }
})(env)](env)
const print_line = ({ length = colWidth(), char = '-' } = {}) => console.log(
  chalk.gray(Array.from({ length }).fill(char).join(''))
)

const genLogger = (name = 'info') => debug(`${name}`)

module.exports = exports = {
  _c,
  env_f,
  logger,
  log_error,
  print_line,
  log_key_value
}
