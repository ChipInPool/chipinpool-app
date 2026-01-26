// GitHub repository setup script for ChipInPool mobile app
import { Octokit } from '@octokit/rest';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
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

async function getGitHubClient() {
  const accessToken = await getAccessToken();
  return new Octokit({ auth: accessToken });
}

async function main() {
  try {
    const octokit = await getGitHubClient();
    
    // Check if repo exists in chipinpool org
    const org = 'chipinpool';
    const repoName = 'mobile-app';
    
    console.log(`Checking if ${org}/${repoName} exists...`);
    
    try {
      const { data: repo } = await octokit.repos.get({
        owner: org,
        repo: repoName,
      });
      console.log(`Repository already exists: ${repo.html_url}`);
    } catch (error: any) {
      if (error.status === 404) {
        console.log(`Creating repository ${org}/${repoName}...`);
        const { data: newRepo } = await octokit.repos.createInOrg({
          org,
          name: repoName,
          description: 'ChipInPool mobile app built with Expo and React Native',
          private: false,
          has_issues: true,
          has_projects: false,
          has_wiki: false,
        });
        console.log(`Created repository: ${newRepo.html_url}`);
      } else {
        throw error;
      }
    }
    
    // Get user info
    const { data: user } = await octokit.users.getAuthenticated();
    console.log(`Authenticated as: ${user.login}`);
    
    console.log(`\nNext steps:`);
    console.log(`1. cd mobile`);
    console.log(`2. git init`);
    console.log(`3. git remote add origin https://github.com/${org}/${repoName}.git`);
    console.log(`4. git add .`);
    console.log(`5. git commit -m "Initial commit - ChipInPool mobile app"`);
    console.log(`6. git push -u origin main`);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
