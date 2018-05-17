const dockerCLI = require('docker-cli-js')
const path = require('path')

const prompts = require('../lib/prompts')
const tasks = require('./index.js')
const { exec, spawn } = require('../lib/child_process')
const { init } = require('./index.js')

const { logger, _c } = require('../lib/logger')
const _log_docker = require('debug')('docker')

const Docker = dockerCLI.Docker
const docker = new Docker()

const listImages = async () => {
  const { APP_CONFIG: { NAME }, } = CONFIG
  _log_docker('local images')
  const res = await docker.command(`images`)

  const images = res.images
    .filter(x => x.repository.includes(NAME))
    .reduce((acc, cur, array, index) => {
      const _i = acc.findIndex(x => x['image id'] === cur['image id'])
      if (_i > -1) {
        acc[_i].tag = acc[_i].tag.padEnd(8) + `[${cur.tag}] `
        return acc
      }
      acc.push(cur)
      return acc
    }, [])
    .map(x => {
      return {
        name: `${x.repository}` + x['image id'] +
          _c.bold(` ${x.tag.padEnd(10)}`) +
          `(${x.created})`,
        value: {
          url: `${x.repository}:${x.tag}`,
          name: x.repository,
          tag: x.tag,
        }
      }
    })
    .sort((a, b) => a.repository - b.repository)
  const image = await prompts.listPrompt({ name: 'image', message: 'Select an Image', choices: images })
  if (image === 'back') return Promise.resolve()

  const action = await prompts.imageActions(image)
  if (action === 'run') await runContainer(image)
  if (action === 'back') await listImages()
}
const runContainer = async (image) => {
  _log_docker(logger.info({ alt: 'image', key: image.tag, msg: image.url, fp: true }))
  const { CONTAINER_CONFIG: { CONTAINER_PATH, HOST_PORT, CONTAINER_PORT }, } = CONFIG
  await killAllContainer()

  await spawn('docker', ['run', '-d',
    `-p`, `${HOST_PORT}:${CONTAINER_PORT}`,
    `${image.url}`
  ])

  const ps = await docker.command(`ps -l`)
  _log_docker(logger.ok({
    alt: image.url,
    key: ps.containerList[0].containerId,
    msg: `listening at http://0.0.0.0:${HOST_PORT}`,
    fp: true
  }))
  await prompts.anyKey('stop container')
  await killAllContainer()
}
const killContainer = async (containerId) => {
  _log_docker(logger.info({
    alt: 'container',
    key: containerId,
    msg: 'stoping',
    fp: true
  }))
  await docker.command(`kill ${containerId}`)
}
const killAllContainer = async () => {
  const ps = await docker.command('ps')
  for (container of ps.containerList) {
    await killContainer(container['container id'])
  }
}
const initBuildSequence = async () => {
  const confirm = await prompts.confirm({ msg: `Init Build Sequence`, opt: CLI_CONFIG.BUILD_DEFAULT })
  if (!confirm) return Promise.resolve()
  _log_docker(logger.info({ alt: 'COMMENCING BUILD SEQUENCE', key: ENV, fp: true }))
  await buildImage()
  await tagImage()
  await pushImage()
  await ecs.stopAll()
}

module.exports = exports = {
  listImages,
  runContainer,
  killContainer,
  killAllContainer,
  initBuildSequence
}

const ecs = require('./ecs')

const buildImage = async () => {
  if (!CLI_CONFIG.BUILD_IMAGE) return Promise.resolve()
  const {
    APP_CONFIG: { NAME },
    AWS_CONFIG: { REPOSITORY_URL },
    CONTAINER_CONFIG: { CONTAINER_PATH },
  } = CONFIG

  await spawn('docker', ['build', '-t', NAME, CONTAINER_PATH])
}
const tagImage = async () => {
  if (!CLI_CONFIG.TAG_IMAGE) return Promise.resolve()

  const { APP_CONFIG: { NAME }, AWS_CONFIG: { REPOSITORY_URL } } = CONFIG

  await spawn('docker', ['tag', `${NAME}:latest`, `${REPOSITORY_URL}:${ENV}`])

  await spawn('docker', ['tag', `${NAME}:latest`, `${REPOSITORY_URL}:${APP_VERSION}`])

  const HEAD = await exec('git rev-parse HEAD')
  await spawn('docker', ['tag', `${NAME}:latest`, `${REPOSITORY_URL}:${HEAD.slice(0, 7)}`])
}
const pushImage = async () => {
  if (!CLI_CONFIG.PUSH_IMAGE) return Promise.resolve()

  const { APP_CONFIG: { NAME }, AWS_CONFIG: { REPOSITORY_URL } } = CONFIG

  await spawn('docker', ['push', `${REPOSITORY_URL}:${ENV}`])

  await spawn('docker', ['push', `${REPOSITORY_URL}:${APP_VERSION}`])

  const HEAD = await exec('git rev-parse HEAD')
  await spawn('docker', ['push', `${REPOSITORY_URL}:${HEAD.slice(0, 7)}`])
}
