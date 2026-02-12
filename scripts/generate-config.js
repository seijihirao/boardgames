const { writeFileSync, readFileSync, existsSync } = require('fs');
const { join } = require('path');

// Load .env file if it exists
const envPath = join(__dirname, '..', '.env');
if (existsSync(envPath)) {
    const envContent = readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length) {
            process.env[key.trim()] = valueParts.join('=').trim();
        }
    });
}

const config = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID
};

const output = `export const firebaseConfig = ${JSON.stringify(config, null, 4)};
`;

const outputPath = join(__dirname, 'firebase-config.js');
writeFileSync(outputPath, output);
console.log('Generated firebase-config.js');
