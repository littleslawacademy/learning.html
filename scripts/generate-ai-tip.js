const admin = require('firebase-admin');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');
const path = require('path');

// 1. FIREBASE ADMIN SETUP
if (!admin.apps.length) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();

// 2. AI SETUP
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function run() {
    // List of models from newest to most stable fallback
    const modelsToTry = ["gemini-1.5-flash", "gemini-pro"];
    let lastError = null;

    for (const modelName of modelsToTry) {
        try {
            console.log(`Trying model: ${modelName}...`);
            const model = genAI.getGenerativeModel({ model: modelName });

            const categories = [
                { id: 'performance', topics: 'JMeter, LoadRunner, NeoLoad, k6' },
                { id: 'sre', topics: 'Kubernetes, AKS, Azure, Observability' },
                { id: 'devops', topics: 'CI/CD, GitHub Actions, Linux performance' }
            ];
            const cat = categories[Math.floor(Math.random() * categories.length)];

            const prompt = `Act as a Senior Performance Architect (30 years exp). Write a 300-word Technical Masterclass for ${cat.topics}. Include a war story, technical bottleneck analysis, and a practical CLI command. Format: Markdown.`;

            const result = await model.generateContent(prompt);
            const text = result.response.text();

            if (text) {
                // UPDATE FIREBASE
                await db.collection('admin_data').doc('hourly_tip').set({
                    content: text,
                    lastUpdated: new Date().toISOString(),
                    category: cat.id
                });

                // UPDATE GITHUB DOCS
                const baseDocsDir = path.join(__dirname, '../docs');
                const catDir = path.join(baseDocsDir, cat.id);
                if (!fs.existsSync(catDir)) fs.mkdirSync(catDir, { recursive: true });
                const fileName = `insight_${Date.now()}.md`;
                fs.writeFileSync(path.join(catDir, fileName), text);

                console.log(`✅ Success with ${modelName}! Content saved.`);
                return; // Stop the loop once successful
            }
        } catch (err) {
            console.log(`⚠️ ${modelName} failed, moving to next...`);
            lastError = err;
        }
    }
    
    console.error("❌ All models failed:", lastError);
    process.exit(1);
}

run();