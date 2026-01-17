const admin = require('firebase-admin');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');
const path = require('path');

// 1. FIREBASE ADMIN SETUP
if (!admin.apps.length) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

// 2. AI SETUP
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function run() {
    try {
        // AUTOMATIC MODEL SELECTION: 
        // We try the most stable identifiers to bypass the 404
        const modelList = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro"];
        let model;
        
        // Loop through until we find one that works in your region
        for (const name of modelList) {
            try {
                model = genAI.getGenerativeModel({ model: name });
                console.log(`📡 Attempting connection with: ${name}`);
                break; 
            } catch (e) { continue; }
        }

        const categories = [
            { id: 'performance', topics: 'JMeter, LoadRunner, NeoLoad, k6, Locust, Correlation' },
            { id: 'sre', topics: 'Kubernetes, AKS, SLIs/SLOs, Observability, Grafana, Dynatrace' },
            { id: 'devops', topics: 'GitHub Actions, Jenkins, Linux performance tuning, CI/CD' }
        ];

        const selectedCat = categories[Math.floor(Math.random() * categories.length)];

        const prompt = `
            ACT AS: A world-class Principal Performance Architect and SRE with 30 years of history.
            CONTEXT: You are mentoring students at Little's Law Academy.
            TOPIC: General high-level insights for ${selectedCat.topics}.
            
            STRUCTURE:
            1. # Architectural Field Manual: [Random Specific Tool from the Topic list]
            2. ## The Trenches
               Write a 150-word story about a past production disaster. Mention the stress, the stakes, and the specific tool used.
            3. ## Technical Analysis
               Detailed 100-word analysis of a technical bottleneck (e.g., Thread contention, Heap Exhaustion).
            4. ## Fix & Command
               Provide a practical fix using a code block, shell command, or YAML.
            5. ## Veteran's Philosophy
               Final mentorship wisdom.

            LENGTH: Total response must be between 300 and 400 words.
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        if (!text) throw new Error("Empty response.");

        // 3. EXTRACT FILENAME from first line of AI response
        const titleLine = text.split('\n')[0].replace('# ', '').trim();
        const safeFileName = titleLine.toLowerCase().replace(/[^a-z0-9]/g, '_') + ".md";

        // 4. UPDATE FIREBASE
        await db.collection('admin_data').doc('hourly_tip').set({
            content: text,
            lastUpdated: new Date().toISOString(),
            category: selectedCat.id
        });

        // 5. UPDATE GITHUB FOLDERS
        const baseDocsDir = path.join(__dirname, '../docs');
        const targetFolder = path.join(baseDocsDir, selectedCat.id);

        if (!fs.existsSync(targetFolder)) {
            fs.mkdirSync(targetFolder, { recursive: true });
        }

        const filePath = path.join(targetFolder, safeFileName);
        fs.writeFileSync(filePath, text);

        console.log(`✅ SUCCESSFULLY documented: ${safeFileName} into folder: ${selectedCat.id}`);

    } catch (error) {
        console.error("❌ Fatal Error during Generation:", error.message);
        process.exit(1);
    }
}

run();