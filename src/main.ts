import * as core from '@actions/core'
import * as github from '@actions/github'

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

    let allChecksCompleted = false
    while (Date.now() < timeoutTime) {
      allChecksCompleted = await areAllActionsCompleted({
        ref,
        octokit,
        currentCheck
      })
      if (allChecksCompleted) {
        break
      }
      await new Promise(resolve => setTimeout(resolve, pollFrequency))
    }
    if (!allChecksCompleted) {
      core.setFailed('Timeout waiting for all checks to complete')
    }
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}

const areAllActionsCompleted = async (options: {
  ref: string
  octokit: ReturnType<typeof github.getOctokit>
  currentCheck: string
}): Promise<boolean> => {
  console.log('\nChecking if all actions are completed')
  const checks = await options.octokit.rest.checks.listForRef({
    ref: options.ref,
    owner: github.context.repo.owner,
    repo: github.context.repo.repo
  })
  let allChecksCompleted = true
  for (const check of checks.data.check_runs) {
    if (check.name !== options.currentCheck) {
      if (check.status !== 'completed') {
        console.log(`Check ${check.name} is not completed`)
        allChecksCompleted = false
      }
    }
  }

  if (allChecksCompleted) console.log('All checks completed')
  else console.log('Not all checks completed. Waiting...')

  return allChecksCompleted
}
