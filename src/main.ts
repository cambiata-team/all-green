import * as core from '@actions/core'
import * as github from '@actions/github'

type ChecksStatus = 'running' | 'passed' | 'failed'

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    const githubToken = core.getInput('token')
    const ref = core.getInput('ref')
    const startTime = Date.now()
    const timeoutTime = parseInt(core.getInput('timeout')) * 1000 + startTime
    const pollFrequency = parseInt(core.getInput('poll-frequency')) * 1000
    const octokit = github.getOctokit(githubToken)
    const currentCheck = github.context.job

    console.log(`Waiting for all checks to complete on ${ref}`)

    let checksStatus: ChecksStatus = 'running'

    while (Date.now() < timeoutTime) {
      checksStatus = await pollActions({
        ref,
        octokit,
        currentCheck
      })

      if (checksStatus !== 'running') break

      await new Promise(resolve => setTimeout(resolve, pollFrequency))
    }

    if (checksStatus === 'failed') {
      core.setFailed('At least one check failed')
    } else if (checksStatus === 'running') {
      core.setFailed('Timeout waiting for all checks to complete')
    }
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}

const pollActions = async (options: {
  ref: string
  octokit: ReturnType<typeof github.getOctokit>
  currentCheck: string
}): Promise<ChecksStatus> => {
  console.log('\nChecking if all actions are completed')

  const checks = await options.octokit.rest.checks.listForRef({
    ref: options.ref,
    owner: github.context.repo.owner,
    repo: github.context.repo.repo
  })

  let checksStatus: ChecksStatus = 'passed'

  for (const check of checks.data.check_runs) {
    if (check.name === options.currentCheck) continue
    if (check.status !== 'completed') {
      console.log(`Check ${check.name} is not completed`)
      checksStatus = 'running'
      continue
    }
    if (check.conclusion !== 'success' && check.conclusion !== 'skipped') {
      console.log(
        `Check ${check.name} failed with conclusion: ${check.conclusion}`
      )
      checksStatus = 'failed'
      break
    }
  }

  if (checksStatus === 'running') {
    console.log('Not all checks completed. Waiting...')
  } else if (checksStatus === 'passed') {
    console.log('All checks passed')
  } else {
    console.log('At least one check failed')
  }

  return checksStatus
}
