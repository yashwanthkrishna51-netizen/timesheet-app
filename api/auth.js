// api/auth.js
// Secure authentication endpoint
// User credentials stored in Vercel environment variables (not in frontend code)

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,PUT,DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }

    // Get users from environment variables
    // Format: USERS_JSON='{"user1":{"password":"pass1","admin":true},...}'
    const usersJson = process.env.USERS_JSON;
    
    if (!usersJson) {
        console.error('USERS_JSON environment variable not set');
        return res.status(500).json({ error: 'Server configuration error' });
    }

    try {
        const users = JSON.parse(usersJson);
        const user = users[username.toLowerCase()];

        if (!user || user.password !== password) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        // Generate a simple session token (in production, use JWT)
        const token = Buffer.from(`${username}:${Date.now()}`).toString('base64');

        return res.status(200).json({
            success: true,
            username: username.toLowerCase(),
            isAdmin: user.admin || false,
            token: token,
            message: 'Login successful'
        });

    } catch (error) {
        console.error('Auth error:', error.message);
        return res.status(500).json({ error: 'Authentication error' });
    }
}
