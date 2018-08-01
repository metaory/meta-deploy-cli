const AWS = require('aws-sdk')

const { AWS_CONFIG: { REGISTRY_ID, REGION, PROFILE } } = CONFIG
const { USER } = process.env

const ecr = new AWS.ECR({ region: REGION })
const ecs = new AWS.ECS({ region: REGION })

exports.describeImages = () => new Promise((resolve, reject) => {
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
exports.describeTasks = () => new Promise((resolve, reject) => {
  const { AWS_CONFIG: { CLUSTER_NAME: cluster, } } = CONFIG

  const params = { cluster }
  ecs.listTasks(params, (err, data) => {
    if (err) reject(err)
    else resolve(data['taskArns'])
  })
})
exports.stopTask = (task) => new Promise((resolve, reject) => {
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
exports.waitForService = () => new Promise((resolve, reject) => {
  const { AWS_CONFIG: { CLUSTER_NAME: cluster, SERVICE_NAME } } = CONFIG
  const params = { cluster, services: [SERVICE_NAME] }

  ecs.waitFor('servicesStable', params, (err, data) => {
    if (err) reject(err)
    else resolve(data)
  })
})
exports.getImageManifest = (imageTag) => new Promise((resolve, reject) => {
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
exports.reTag = (imageManifest, imageTag) => new Promise((resolve, reject) => {
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
exports.listServices = () => new Promise((resolve, reject) => {
  const { AWS_CONFIG: { CLUSTER_NAME: cluster, } } = CONFIG

  const params = { cluster }
  ecs.listServices(params, (err, data) => {
    if (err) reject(err)
    else resolve(data['serviceArns'])
  })
});
exports.listTasks = (serviceName) => new Promise((resolve, reject) => {
  const { AWS_CONFIG: { CLUSTER_NAME: cluster } } = CONFIG

  const params = { cluster, serviceName }

  ecs.listTasks(params, (err, data) => {
    if (err) reject(err)
    else resolve(data['taskArns'])
  })

})
exports.waitForService1 = (service) => new Promise((resolve, reject) => {
  const { AWS_CONFIG: { CLUSTER_NAME: cluster } } = CONFIG
  const params = { cluster, services: [service] }

  ecs.waitFor('servicesStable', params, (err, data) => {
    if (err) reject(err)
    else resolve(data)
  })
})
