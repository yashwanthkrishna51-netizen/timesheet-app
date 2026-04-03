// api/github-proxy.js
// This file goes in: /api/github-proxy.js in your Vercel project
// Handles GitHub API calls server-side to avoid CORS issues

const GITHUB_CONFIG = {
    owner: process.env.GITHUB_OWNER || 'YOUR_GITHUB_USERNAME',
    repo: process.env.GITHUB_REPO || 'timesheet-data',
    token: process.env.GITHUB_TOKEN || 'YOUR_GITHUB_TOKEN',
    branch: 'main'
};

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const { action, filePath, content, message } = req.body;

    try {
        if (action === 'read') {
            // Read file from GitHub
            const response = await fetch(
                `https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${filePath}?ref=${GITHUB_CONFIG.branch}`,
                {
                    headers: {
                        'Authorization': `token ${GITHUB_CONFIG.token}`,
                        'Accept': 'application/vnd.github.v3.raw'
                    }
                }
            );

            if (response.status === 404) {
                return res.status(404).json({ error: 'File not found', filePath });
            }

            if (!response.ok) {
                const text = await response.text();
                console.error('GitHub API error:', response.status, text);
                return res.status(response.status).json({ error: `GitHub API error: ${response.status}`, details: text });
            }

            const data = await response.text();
            return res.status(200).json({ success: true, data });

        } else if (action === 'write') {
            // Write file to GitHub
            // First, get the current SHA
            const getResponse = await fetch(
                `https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${filePath}?ref=${GITHUB_CONFIG.branch}`,
                {
                    headers: {
                        'Authorization': `token ${GITHUB_CONFIG.token}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                }
            );

            let sha = null;
            if (getResponse.ok) {
                const fileData = await getResponse.json();
                sha = fileData.sha;
            }

            // Now update the file
            const updateResponse = await fetch(
                `https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${filePath}`,
                {
                    method: 'PUT',
                    headers: {
                        'Authorization': `token ${GITHUB_CONFIG.token}`,
                        'Content-Type': 'application/json',
                        'Accept': 'application/vnd.github.v3+json'
                    },
                    body: JSON.stringify({
                        message: message || `Update ${filePath}`,
                        content: Buffer.from(content).toString('base64'),
                        branch: GITHUB_CONFIG.branch,
                        ...(sha && { sha })
                    })
                }
            );

            if (!updateResponse.ok) {
                const error = await updateResponse.json();
                console.error('GitHub API error:', updateResponse.status, error);
                return res.status(updateResponse.status).json({ error: error.message || 'Failed to save' });
            }

            return res.status(200).json({ success: true, message: 'File saved' });

        } else {
            return res.status(400).json({ error: 'Invalid action. Use "read" or "write"' });
        }

    } catch (error) {
        console.error('Proxy error:', error);
        return res.status(500).json({ error: error.message });
    }
}
