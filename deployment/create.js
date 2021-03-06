const crypto = require('crypto')
const { stringify } = require('querystring')

const {
  owner, repo, ref, refName, context,
} = require('./tools')
const api = require('./api')

module.exports = async () => {
  const deploy = await api.createDeploymentFromRef({
    auto_merge: false,
    required_contexts: [],
    payload: JSON.stringify({
      ref,
      tag: refName,
    }),
    description: `Production deploy for tag ${refName}`,
  })

  await context.writeJSON('deployment', deploy)

  const sign = crypto.createSign('RSA-SHA256')
  sign.update(owner + repo + deploy.id + refName)

  const query = stringify({
    owner,
    repo,
    deploy: deploy.id,
    tag: refName,
    sign: sign.sign(process.env.PRIVATE_KEY, 'hex'),
  })

  const url = `https://auto-deploy.inextenso.io/deploy?${query}`

  const img = 'https://img.shields.io/badge/Deploy%20to-Production-orange.svg?style=for-the-badge'

  await api.appendToReleaseBody(
    refName,
    `## Deploy to production :rocket:

[![Deploy to prod](${img})](${url})`,
  )

  context.slackMessage({
    text: `[${owner}/${repo}:${refName}] Your release are ready to deploy !`,
    attachments: [
      {
        actions: [
          {
            type: 'button',
            text: 'Release 🚀',
            url: `https://github.com/${owner}/${repo}/releases/tag/${refName}`,
            style: 'danger',
          },
        ],
      },
    ],
  })
}
