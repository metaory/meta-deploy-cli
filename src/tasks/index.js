// ////////////////////////////////////////////////////////////////////////// //
module.exports = exports = {
  init: async () => {
    await prompts.envPrompt()
    await exports.menu()
  },
  menu: async () => {
    await configure.init()
    const opt = await prompts.menu()
    await exports[opt]()
  },
  // ////////////////////////////////////////////////////////////////////////// //
  initBuild: async () => {
    await configure.init({ silent: true })
    await application.bumpVersion()
    await application.initPreBuildSequence()
    await ecs.login()
    await docker.initBuildSequence()
    await exports.menu()
  },
  listLocalImages: async () => {
    await docker.listImages()
    await exports.menu()
  },
  listRemoteImages: async () => {
    await ecs.login()
    await ecs.listImages()
    await exports.menu()
  },
  changeEnv: async () => {
    await prompts.envPrompt({ force: true })
    await exports.menu()
  },
  settings: async () => {
    await configure.settings()
    await exports.menu()
  },
  loadBalancing: async() => {
    await ecs.login()
    await ecs.loadBalancing()
  }
}
const prompts = require('../lib/prompts')
const configure = require('./configure')
const application = require('./application')
const ecs = require('./ecs')
const docker = require('./docker')

// ////////////////////////////////////////////////////////////////////////// //
