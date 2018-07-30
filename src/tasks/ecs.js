const AWS = require('aws-sdk')
const moment = require('moment')

const { exec, spawn } = require('../lib/child_process')
const prompts = require('../lib/prompts')
const { logger, _c, env_f } = require('../lib/logger')
const _log_ecs = require('debug')('ecs')
const _log_ecr = require('debug')('ecr')
const _log_docker = require('debug')('docker')

const { AWS_CONFIG: { REGISTRY_ID, REGION, PROFILE } } = CONFIG
const { USER } = process.env

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
  const imageManifest = await __getImageManifest(image.tag)
  await __reTag(imageManifest, ENV)
  await stopAll()
}
const listImages = async () => {
  _log_ecr('remote images')
  const {
    AWS_CONFIG: { REGISTRY_ID, REPOSITORY_NAME, REPOSITORY_URL },
    CONTAINER_CONFIG: { HOST_PORT, CONTAINER_PORT }
  } = CONFIG
  const images = await __describeImages()

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
const listTasks = async () => {
  _log_ecs(logger.info({ alt: 'list tasks', fp: true }))
  const tasks = await __describeTasks()
  return tasks
}
const stopAll = async () => {
  const tasks = await listTasks()
  for (const task of tasks) {
    const stopped = await restartTask(task)
  }
}
const restartTask = async (task) => {
  const { AWS_CONFIG: { SERVICE_NAME } } = CONFIG
  _log_ecs(logger.info({ alt: 'stopping task', key: task, fp: true }))
  const stopped = await __stopTask(task)
  _log_ecs(logger.ok({ alt: 'stopped', key: task, fp: true }))

  _log_ecs(logger.info({ alt: `waiting for service to stabilize`, key: SERVICE_NAME, fp: true }))

  const waitFor = await __waitForService(task)
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

module.exports = exports = {
  login,
  listImages,
  stopAll
}

const { runContainer } = require('./docker')

const ecr = new AWS.ECR({ region: REGION })
const ecs = new AWS.ECS({ region: REGION })
const __describeImages = () => new Promise((resolve, reject) => {
  const {
    AWS_CONFIG: {
      REGISTRY_ID: registryId,
      REPOSITORY_NAME: repositoryName
    }
  } = CONFIG
  const params = {
    repositoryName,
    filter: { tagStatus: "TAGGED" },
    registryId
  }
  ecr.describeImages(params, (err, data) => {
    if (err) reject(err)
    else resolve(data['imageDetails'])
  })
})
const __describeTasks = () => new Promise((resolve, reject) => {
  const { AWS_CONFIG: { CLUSTER_NAME: cluster, } } = CONFIG

  const params = { cluster }
  ecs.listTasks(params, (err, data) => {
    if (err) reject(err)
    else resolve(data['taskArns'])
  })
})
const __stopTask = (task) => new Promise((resolve, reject) => {
  const { AWS_CONFIG: { CLUSTER_NAME: cluster, } } = CONFIG

  const params = {
    task,
    cluster,
    reason: `${ENV}:${APP_VERSION} by ${USER}`
  }
  ecs.stopTask(params, (err, data) => {
    if (err) reject(err)
    else resolve(data)
  })
})
const __waitForService = (task) => new Promise((resolve, reject) => {
  const { AWS_CONFIG: { CLUSTER_NAME: cluster, SERVICE_NAME } } = CONFIG
  const params = { cluster, tasks: [task] }
  // const params = { cluster, services: [SERVICE_NAME] } // todo remove me

  // ecs.waitFor('servicesStable', params, (err, data) => { // todo remove me
  ecs.waitFor('tasksRunning', params, (err, data) => {
    if (err) reject(err)
    else resolve(data)
  })
})
const __getImageManifest = (imageTag) => new Promise((resolve, reject) => {
  const {
    AWS_CONFIG: {
      REGISTRY_ID: registryId,
      REPOSITORY_NAME: repositoryName
    }
  } = CONFIG

  const params = {
    imageIds: [{
      imageTag
    }],
    repositoryName
  }
  ecr.batchGetImage(params, (err, data) => {
    if (err || data.failures.length) reject(err || new Error())
    if (!data['images'].length) reject(new Error())
    resolve(data['images'][0]['imageManifest'])
  })
})

const __reTag = (imageManifest, imageTag) => new Promise((resolve, reject) => {
  const {
    AWS_CONFIG: {
      REGISTRY_ID: registryId,
      REPOSITORY_NAME: repositoryName
    }
  } = CONFIG

  const params = { imageManifest, repositoryName, imageTag, registryId, }
  ecr.putImage(params, function(err, data) {
    if (err) reject(err)
    else resolve(data)
  })
})
