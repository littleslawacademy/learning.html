const admin = require('firebase-admin');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');
const path = require('path');

// 1. FIREBASE ADMIN SETUP
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

// 2. AI SETUP
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function run() {
    try {
        const modelName = "gemini-1.5-flash";
        const model = genAI.getGenerativeModel({ model: modelName });

        // TOOLSETS FOR WIKI DIVERSIFICATION
        const tools = [
            "JMeter Masterclass", "NeoLoad Fundamentals", "LoadRunner Architecture",
            "k6 Modern Performance", "Locust Python Testing", "Kubernetes SRE",
            "Azure AKS Optimization", "Grafana Observability", "Dynatrace AI",
            "DevOps Pipeline Hardening", "Linux Kernel Tuning", "Datadog Monitors"
        ];
        const selectedTool = tools[Math.floor(Math.random() * tools.length)];

        // THE EXPERT PROMPT
        const prompt = `
            ACT AS: A Principal Performance Architect & SRE with 30 years of enterprise experience. 
            You have managed massive systems using ${selectedTool} and are a mentor at Little's Law Academy.

            GOAL: Write a technical masterclass/wiki entry (Approx 300-350 words).

            REQUIRED STRUCTURE (Format in Markdown):
            1. # ${selectedTool} Deep Dive
            2. THE TRENCHES (Narrative): A short "war story" from 10-20 years ago. Share an emotional moment—a crash that happened on a holiday, the stress of a million-dollar memory leak, or a 3 AM rescue.
            3. ARCHITECTURAL CHALLENGE: Describe a complex technical bottleneck specific to ${selectedTool} or related cloud architecture (Azure/AKS/AWS).
            4. TECHNICAL FIX (High Authority): Provide an advanced technical example (a code snippet, shell command, or specific property config).
            5. THE PHILOSOPHY: One piece of wisdom about the future of Performance Engineering.

            STYLE: Sophisticated, technical (use terms like 'Latency', 'Concurrency', 'Thread Contention', 'Distributed Tracing'), yet emotional and mentor-like.
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const masterclassMD = response.text();

        if (!masterclassMD || masterclassMD.length < 500) {
            throw new Error("AI response was too short for a masterclass.");
        }

        // 3. PERSISTENCE LAYER A: FIREBASE (For the Live Dashboard)
        await db.collection('admin_data').doc('hourly_tip').set({
            content: masterclassMD, // Stored as MD so our JS can parse it
            tool: selectedTool,
            lastUpdated: new Date().toISOString(),
            author: "Architect Vasanth (AI)"
        });

        // 4. PERSISTENCE LAYER B: GITHUB DOCS (For the Wiki)
        const docsDir = path.join(__dirname, '../docs');
        
        // Ensure the docs directory exists
        if (!fs.existsSync(docsDir)) {
            fs.mkdirSync(docsDir, { recursive: true });
        }

        // Clean filename (e.g. "JMeter Masterclass" -> "jmeter_masterclass.md")
        const fileName = `${selectedTool.toLowerCase().replace(/\s+/g, '_')}.md`;
        const filePath = path.join(docsDir, fileName);

        // Write the file (Every hour this specific tool file will get better)
        fs.writeFileSync(filePath, masterclassMD);

        console.log(`✅ Success! [${selectedTool}] Masterclass written to Firebase and /docs/${fileName}`);

    } catch (error) {
        console.error("❌ Script Error:", error.message);
        
        // Error handling fallback
        if (error.message.includes('404')) {
            console.log("🔄 Model version mismatch. Check Google AI API Studio model availability.");
        }
        process.exit(1);
    }
}

run();