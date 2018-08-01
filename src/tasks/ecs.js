const moment = require('moment')
const ms = require('ms')

const { exec, spawn } = require('../lib/child_process')
const prompts = require('../lib/prompts')
const aws = require('../lib/prompts')
const { logger, _c, env_f, print_line } = require('../lib/logger')
const _log_ecs = require('debug')('ecs')
const _log_ecr = require('debug')('ecr')
const _log_docker = require('debug')('docker')

const { AWS_CONFIG: { REGISTRY_ID, REGION, PROFILE } } = CONFIG
const { USER } = process.env

const wait = (waitFor = '5m') => new Promise(resolve => setTimeout(resolve, ms(waitFor))) // todo

const login = async () => {
  try {
    _log_ecr('Logging in')
    const lr = await exec(`aws ecr get-login --no-include-email\
    --region ${REGION}\
    --registry-ids ${REGISTRY_ID}\
    --profile ${PROFILE}\
    | ${process.env.SHELL}`, { CWD })
  } catch (err) {
    if (err.includes('password-stdin')) return Promise.resolve()
    throw err
  } finally { _log_ecr('Succesfully Logged in') }
}
const reTag = async (image) => {
  logger.warning({ alt: 'Re-Tag and Deploy', key: `${_c.red_b(image.tag)} to`, msg: `${env_f()}`, })
  const confirm = await prompts.confirm({ opt: false })
  if (!confirm) return Promise.resolve()
  const imageManifest = await aws.getImageManifest(image.tag)
  await aws.reTag(imageManifest, ENV)
  await stopAll()
}
const listImages = async () => {
  _log_ecr('remote images')
  const {
    AWS_CONFIG: { REGISTRY_ID, REPOSITORY_NAME, REPOSITORY_URL },
    CONTAINER_CONFIG: { HOST_PORT, CONTAINER_PORT }
  } = CONFIG
  const images = await aws.describeImages()

  const choices = images
    .reduce((acc, cur) => {
      const { imageTags, repositoryName } = cur
      const [versionTag, hashTag, envTag] = imageTags.sort()
      cur.tag = versionTag
      acc.push({
        name: repositoryName +
          _c.bold(` ${versionTag.padEnd(10)}`) +
          `(${moment(cur.imagePushedAt).fromNow()})`.padEnd(16, envTag || hashTag ? '.' : '') +
          (hashTag ? `[${env_f(hashTag)}]` : ``) +
          (envTag ? `[${env_f(envTag)}]` : ``),
        value: cur
      })
      return acc
    }, [])
    .sort((a, b) => b.value.imagePushedAt - a.value.imagePushedAt)
  const image = await prompts.listPrompt({
    name: 'image',
    message: 'Select an Image',
    choices
  })
  if (image === 'back') return Promise.resolve()

  const _image = {
    url: `${REPOSITORY_URL}:${image.tag}`,
    name: image.repositoryName,
    tag: image.tag
  }

  const action = await prompts.imageActions(_image, true)
  if (action === 'run') await runContainer(_image)
  if (action === 're-tag') await reTag(image)
  if (action === 'back') await listImages()
}

/*--------------------------------------------------*/
/* LAZY STOP SERVICE WITH LOAD BALANCER
/*--------------------------------------------------*/

const loadBalancing = async () => {

  _log_ecs(logger.info({ alt: 'listing services', fp: true }))

  const serviceArns = await aws.listServices()

  const services = []

  serviceArns.forEach((serviceArn) => {
    const parts = serviceArn.split('/')
    const serviceName = parts[parts.length - 1]

    const { AWS_CONFIG: { LOAD_BALANCER_SERVICE_NAME } } = CONFIG

    if (serviceName !== LOAD_BALANCER_SERVICE_NAME) {
      services.push({ 'arn': serviceArn, 'name': serviceName })
    }
  })

  for (const service of services) {
    print_line()
    const stopped = await restartService(service)
    print_line()
  }

}

const restartService = async (service) => {

  _log_ecs(logger.info({ alt: 'stopping service', key: service.name, fp: true }))

  await stopAllTask(service.name)

  _log_ecs(logger.info({ alt: 'service stopped succesfully', key: service.name, fp: true }))

  _log_ecs(logger.info({ alt: `waiting for service to stabilize`, key: service.name, fp: true }))

  const waitForService = await aws.waitForService1(service.arn)

  _log_ecs(logger.info({ alt: `service stabilized now`, key: service.name, fp: true }))

  const { AWS_CONFIG: { LOAD_BALANCER_SLEEP } } = CONFIG

  _log_ecs(logger.info({ alt: `load balance sleeping`, key: `${LOAD_BALANCER_SLEEP} seconds`, fp: true }))

  await sleep(LOAD_BALANCER_SLEEP * 1000)
}

const stopAllTask = async (serviceName) => {
  print_line({ char: ' ' })
  _log_ecs(logger.info({ alt: 'list tasks', key: serviceName, fp: true }))
  const tasks = await aws.listTasks(serviceName)

  for (const task of tasks) {
    print_line({ char: ' ' })
    const stopped = await stopTask(task)
    print_line({ char: ' ' })
  }
}

const stopTask = async (task) => {
  _log_ecs(logger.info({ alt: 'stopping task', key: task, fp: true }))
  const stopped = await aws.stopTask(task)
  _log_ecs(logger.info({ alt: 'task stopped succesfully', key: task, fp: true }))
}

const sleep = (millis) => new Promise((resolve) => {
  setTimeout(resolve, millis);
});

/*--------------------------------------------------*/

const listTasks = async () => {
  _log_ecs(logger.info({ alt: 'list tasks', fp: true }))
  const tasks = await aws.describeTasks()
  return tasks
}
const stopAll = async () => {
  const tasks = await listTasks()
  for (const [index, task] of tasks.entries()) {
    const stopped = await restartTask(task)
    if (index + 1 !== tasks.length) await wait()
  }
}
const restartTask = async (task) => {
  const { AWS_CONFIG: { SERVICE_NAME } } = CONFIG
  _log_ecs(logger.info({ alt: 'stopping task', key: task, fp: true }))
  const stopped = await aws.stopTask(task)
  _log_ecs(logger.ok({ alt: 'stopped', key: task, fp: true }))

  _log_ecs(logger.info({ alt: `waiting for service to stabilize`, key: SERVICE_NAME, fp: true }))

  const waitFor = await aws.waitForService()
  const { failures, services } = waitFor
  if (failures.length) {
    _log_ecs(logger.error({ key: SERVICE_NAME, msg: 'failed to recover', fp: true }))
    console.error('FAILURES', JSON.stringify(failures, null, 2))
    return Promise.reject(new Error(`${SERVICE_NAME} Failed to Recover`))
  }
  const { serviceName, runningCount, status } = services[0]
  _log_ecs(logger.ok({ alt: `service`, key: serviceName, msg: `is ${status} with ${runningCount} tasks running`, fp: true }))

  return stopped
}

module.exports = {
  login,
  listImages,
  stopAll,
  loadBalancing
}

const { runContainer } = require('./docker')
