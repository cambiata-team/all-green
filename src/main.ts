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
    const octokit = github.getOctokit(githubToken)
    const checks = await octokit.rest.checks.listForRef({
      ref,
      owner: github.context.repo.owner,
      repo: github.context.repo.repo
    })
    const currentCheck = github.context.job
    console.log('context', github.context)
    let allChecksCompleted = true
    for (const check of checks.data.check_runs) {
      console.log({ check })
      if (check.name !== currentCheck) {
        if (check.status !== 'completed') {
          console.log(`Check ${check.name} is not completed`)
          allChecksCompleted = false
        }
      }
    }
    if (!allChecksCompleted) core.setFailed('Not all checks completed')
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}
