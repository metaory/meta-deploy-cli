const path = require('path')
const { exec, spawn, fork } = require('child_process')
const { logger, _c, print_line } = require('./logger')
const debug = require('debug')('$')
module.exports = {
  exec: (command, options = {}) => {
    return new Promise((resolve, reject) => {
      const _process = exec(command, options)

      _process.stdout.on('data', resolve)
      _process.stderr.on('data', reject)
      _process.on('close', (code) => {
        return code === 0 ?
          resolve(true) :
          reject(new Error())
      })
    })
  },
  spawn: (command, args = [], options = {}) => {
    print_line({ char: '.' })
    const msg = command + ' ' + args.join(' ')
    debug(logger.info({ msg, fp: true }))
    return new Promise((resolve, reject) => {
      const ps = spawn(command, args, { ...options,
        stdio: [process.stdin, process.stdout, process.stderr]
      })

      ps.on('close', (code) => {
        if (code === 0) {
          debug(logger.ok({ msg, fp: true }))
          resolve()
        } else {
          debug(logger.error({ msg, fp: true }))
          reject({ name: 'Error', message: `${command} ${args.join(' ')}`, stack: options.cwd })
        }
      })
    })
  }
}
