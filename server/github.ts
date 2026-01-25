// GitHub Integration - Connected via Replit Connectors
import { Octokit } from '@octokit/rest'

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=github',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('GitHub not connected');
  }
  return accessToken;
}

// WARNING: Never cache this client.
// Access tokens expire, so a new client must be created each time.
export async function getUncachableGitHubClient() {
  const accessToken = await getAccessToken();
  return new Octokit({ auth: accessToken });
}

// Helper to push current code to a GitHub repository
export async function pushToGitHub(owner: string, repo: string, branch: string = 'main') {
  const octokit = await getUncachableGitHubClient();
  
  // Get authenticated user info
  const { data: user } = await octokit.users.getAuthenticated();
  console.log(`Authenticated as: ${user.login}`);
  
  // Check if repo exists
  try {
    await octokit.repos.get({ owner, repo });
    console.log(`Repository ${owner}/${repo} exists`);
  } catch (error: any) {
    if (error.status === 404) {
      console.log(`Repository ${owner}/${repo} not found. Creating...`);
      await octokit.repos.createInOrg({
        org: owner,
        name: repo,
        private: true,
        description: 'ChipInPool - Social Payments & Fund Pooling Platform',
      });
    } else {
      throw error;
    }
  }
  
  return { success: true, message: `Ready to push to ${owner}/${repo}` };
}
