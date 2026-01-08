const fs = require('fs');
const path = require('path');

// Simple .env parser (no external dependencies)
function parseEnv(content) {
    const env = {};
    const lines = content.split('\n');
    for (const line of lines) {
        const trimmed = line.trim();
        // Skip empty lines and comments
        if (!trimmed || trimmed.startsWith('#')) continue;

        const match = trimmed.match(/^([^=]+)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            let value = match[2].trim();
            // Remove surrounding quotes if present
            if ((value.startsWith('"') && value.endsWith('"')) ||
                (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1);
            }
            env[key] = value;
        }
    }
    return env;
}

// Load root .env
const rootEnvPath = path.resolve(__dirname, '..', '.env');
const backendEnv = parseEnv(fs.readFileSync(rootEnvPath, 'utf-8'));

// Construct VITE_API_BASE_URL
const protocol = backendEnv.MCP_SERVER_PROTOCOL || 'http';
const host = backendEnv.MCP_SERVER_HOST || 'localhost';
const port = backendEnv.MCP_SERVER_PORT || '3222';

const frontendEnvContent = `# Auto-generated from root .env - DO NOT EDIT MANUALLY
VITE_API_BASE_URL=${protocol}://${host}:${port}
`;

// Write to frontend/.env
const frontendEnvPath = path.resolve(__dirname, '..', 'frontend', '.env');
fs.writeFileSync(frontendEnvPath, frontendEnvContent);

console.log(`Generated frontend/.env with VITE_API_BASE_URL=${protocol}://${host}:${port}`);
