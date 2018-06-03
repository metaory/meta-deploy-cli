const chalk = require('chalk')
const inquirer = require('inquirer')
const { _c, logger, env_f, print_line } = require('../lib/logger')
const regex = /(?!\/|-|.)[\W]|^$/g
const { log } = console
const { CLI_CONFIG } = CONFIG
module.exports = exports = {
  menu: () => {
    const { APP_CONFIG: { NAME } } = CONFIG
    // print_line()
    return inquirer
      .prompt([{
        type: 'list',
        name: 'opt',
        message: 'Operation' + _c.dim(` [v${APP_VERSION} ${ENV}]`),
        choices: [{
            name: `${_c.bold(1)} Build ${_c.bold(NAME)} ${env_f()}`,
            value: 'initBuild',
          },
          {
            name: `${_c.bold(2)} List ${_c.bold('remote ')}images`,
            value: 'listRemoteImages'
          },
          {
            name: `${_c.bold(3)} List ${_c.bold('local ')}images`,
            value: 'listLocalImages'
          },
          {
            name: `${_c.bold(4)} Change ${_c.bold('environment')}`,
            value: 'changeEnv'
          },
          new inquirer.Separator(),
          {
            name: _c.bold(5) + ' Settings',
            value: 'settings'
          },
          {
            name: _c.bold(6) + _c.red_b(' Exit'),
            value: 'exit'
          },
        ],
        pageSize: 8
      }])
      .then(async (r) => {
        r.opt === 'exit' && process.exit(0)
        return Promise.resolve(r.opt)
      })
  },
  envPrompt: ({ force = false } = {}) => {
    if (!force && ['stage', 'prod'].includes(process.argv[2] || ENV)) {
      global.ENV = process.argv[2] || ENV
      return Promise.resolve(ENV)
    }
    const choices = [
      { name: _c.yellow_b('STAGE'), value: 'stage' },
      { name: _c.magenta_b('PROD'), value: 'prod' }
    ]

    return inquirer
      .prompt([{
        type: 'list',
        name: 'env',
        message: `Build Environment ` + _c.dim(`(${ENV})`),
        default: () => Number(!(choices.findIndex(x => x.value === ENV))),
        choices
      }])
      .then(r => {
        global.ENV = r.env
        return Promise.resolve(ENV)
      })
  },
  input: (key = 'KEY', value) => inquirer
    .prompt([{
      type: 'input',
      name: 'value',
      message: key,
      default: () => (value || key).replace(/^<|>$|^$/g, ''),
      transformer: (value) => {
        const _matched = value.match(regex)
        return value.replace(regex, (match) => _c.red_i(match))
      },
      validate: (value) =>
        value.match(regex) ? `"${value.replace(regex, (match) => _c.red_i(match))}" ${_c.red('Not Acceptable')}` : true
    }])
    .then(r => Promise.resolve(r.value)),
  confirm: ({
      msg = 'Are you sure?',
      val = `v${APP_VERSION} ${ENV}`,
      opt = true
    }) => inquirer
    .prompt([{
      type: 'confirm',
      name: 'confirm',
      message: msg + _c.dim(` [${val}]`),
      default: !!opt
    }])
    .then(r => Promise.resolve(r.confirm)),
  versionPrompt: (oldVersion) =>
    inquirer
    .prompt([{
      type: 'list',
      name: 'version',
      message: `SemVer ` + _c.dim(`https://semver.org (${oldVersion})`),
      choices: [
        'prerelease',
        'prepatch',
        'patch',
        'preminor',
        'minor',
        'premajor',
        'major',
        oldVersion,
      ].map(x => {
        return {
          name: semVerColor(x),
          value: isNaN(x[0]) ? x : 'none'
        }
      }),
      pageSize: 8
    }])
    .then(r => Promise.resolve(r.version)),
  imageActions: (image, allowReTag = false) => inquirer
    .prompt([{
      type: 'list',
      name: 'action',
      message: 'Select an option',
      choices: [
        { name: _c.green_b('run'.padEnd(10)) + _c.bold(image.name) + ':' + _c.red_b(image.tag), value: 'run' },
        {
          name: _c.red_b('revert'.padEnd(10)) +
            _c.bold(image.name) + ':' + _c.red_b(image.tag) +
            (allowReTag ? ' > ' + _c.bold(image.name) + ':' + env_f() : ''),
          [allowReTag ? 'value' : 'disabled']: 're-tag'
        },
        new inquirer.Separator(),
        { name: _c.yellow_b('back'), value: 'back' },
      ]
    }])
    .then((r) => Promise.resolve(r['action'])),
  listPrompt: ({ name = 'opt', message = 'Select an option', choices = [] }) => inquirer
    .prompt([{
      type: 'list',
      name,
      message,
      choices: [...choices,
        new inquirer.Separator(),
        { name: _c.yellow_b('back'), value: 'back' },
        new inquirer.Separator()
      ],
      pageSize: 12,
      default: choices.length
    }])
    .then((r) => r[name] === 'exit' ? process.exit(0) : Promise.resolve(r[name])),
  anyKey: (msg = 'continue') => new Promise((resolve, reject) => {
    inquirer
      .prompt([{
        type: 'input',
        name: 'continue',
        message: `press any ${_c.magenta_b('<key>')} to ${_c.yellow_b(msg)}`,
        transformer: (key) => {
          !!key && resolve(true)
          return '\n'
        }
      }])
      .then(r => resolve(true))
  }),
  settingsPrompt: ({ choices }) => inquirer
    .prompt([{
      type: 'checkbox',
      name: 'opts',
      message: 'select options',
      choices,
      pageSize: choices.length
    }])
    .then((r) => Promise.resolve(r.opts)),
}

const semVerColor = (semVer) => (x => {
  const _c = chalk.bold
  const pre = x.startsWith('pre')
  const prerelease = x.includes('release')
  const stl = pre ? 'bold' : 'bold'
  const val = (pre ? `${x}-` : x).padEnd(12)
  let color = 'white'
  if (x.includes('patch')) color = 'green'
  if (x.includes('minor')) color = 'yellow'
  if (x.includes('major')) color = 'red'
  if (prerelease) color = 'cyan'
  return _c.reset[pre && !prerelease ? color + 'Bright' : color](val)
})(semVer)
