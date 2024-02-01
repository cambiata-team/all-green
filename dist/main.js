"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = void 0;
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
async function run() {
    try {
        const githubToken = core.getInput('token');
        const ref = core.getInput('ref');
        const startTime = Date.now();
        const timeoutTime = parseInt(core.getInput('timeout')) * 1000 + startTime;
        const pollFrequency = parseInt(core.getInput('poll-frequency')) * 1000;
        const octokit = github.getOctokit(githubToken);
        const currentCheck = github.context.job;
        console.log(`Waiting for all checks to complete on ${ref}`);
        let checksStatus = 'running';
        while (Date.now() < timeoutTime) {
            checksStatus = await pollActions({
                ref,
                octokit,
                currentCheck
            });
            if (checksStatus !== 'running')
                break;
            await new Promise(resolve => setTimeout(resolve, pollFrequency));
        }
        if (checksStatus === 'failed') {
            core.setFailed('At least one check failed');
        }
        else if (checksStatus === 'running') {
            core.setFailed('Timeout waiting for all checks to complete');
        }
    }
    catch (error) {
        // Fail the workflow run if an error occurs
        if (error instanceof Error)
            core.setFailed(error.message);
    }
}
exports.run = run;
const pollActions = async (options) => {
    console.log('\nChecking if all actions are completed');
    const checks = await options.octokit.rest.checks.listForRef({
        ref: options.ref,
        owner: github.context.repo.owner,
        repo: github.context.repo.repo
    });
    let checksStatus = 'passed';
    for (const check of checks.data.check_runs) {
        if (check.name === options.currentCheck)
            continue;
        if (check.status !== 'completed') {
            console.log(`Check ${check.name} is not completed`);
            checksStatus = 'running';
            continue;
        }
        if (check.conclusion !== 'success' && check.conclusion !== 'skipped') {
            console.log(`Check ${check.name} failed with conclusion: ${check.conclusion}`);
            checksStatus = 'failed';
            break;
        }
    }
    if (checksStatus === 'running') {
        console.log('Not all checks completed. Waiting...');
    }
    else if (checksStatus === 'passed') {
        console.log('All checks passed');
    }
    else {
        console.log('At least one check failed');
    }
    return checksStatus;
};
//# sourceMappingURL=main.js.map