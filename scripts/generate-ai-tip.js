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
        // Try the stable 'gemini-1.5-flash' ID without prefixing. 
        // Flash is faster and better for this use case.
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const categories = [
            { id: 'performance', topics: 'JMeter load tuning, NeoLoad scaling, LoadRunner protocols, k6 performance metrics' },
            { id: 'sre', topics: 'SLIs/SLOs implementation, AKS reliability, Kubernetes cluster autoscaling, Observability signals' },
            { id: 'devops', topics: 'GitHub Action optimization, CI/CD hardening, Linux kernel networking, Docker orchestration' }
        ];

        const selectedCat = categories[Math.floor(Math.random() * categories.length)];

        const prompt = `
            ACT AS: A Senior Principal Performance Engineer & SRE Architect (30 years exp).
            TASK: Write a Technical Wiki entry for students at Little's Law Academy.
            CONTEXT: Today's theme is ${selectedCat.topics}.
            
            STRUCTURE (Use Markdown):
            1. # Architecture Entry: [Focus Tool Name]
            2. ## The Veteran's Memory
               Share an emotional war-story from the early days vs today regarding these tools (100 words).
            3. ## Critical Technical Analysis
               Explain a deep technical bottleneck (Memory Leaks, GC issues, or Network Latency) in 150 words.
            4. ## Fix & Practical Command
               Provide a specific fix (Code block or Shell command).
            5. ## Expert Wisdom
               Final career advice.
               
            LENGTH: Exactly 300 to 350 words total.
        `;

        const result = await model.generateContent(prompt);
        // Important: Extract response using await to prevent 404 async timing issues
        const response = await result.response;
        const text = response.text();

        if (!text) throw new Error("Empty AI Response Received");

        // Firebase Sync
        await db.collection('admin_data').doc('hourly_tip').set({
            content: text,
            lastUpdated: new Date().toISOString(),
            category: selectedCat.id
        });

        // Folder Path logic for /docs/folder/file.md
        const safeTitle = text.split('\n')[0].replace('# ', '').trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
        const baseDocsDir = path.join(__dirname, '../docs');
        const categoryDir = path.join(baseDocsDir, selectedCat.id);

        if (!fs.existsSync(categoryDir)) {
            fs.mkdirSync(categoryDir, { recursive: true });
        }

        const filePath = path.join(categoryDir, `${safeTitle}.md`);
        fs.writeFileSync(filePath, text);

        console.log(`✅ SUCCESSFULLY documented: ${safeTitle}.md into folder: ${selectedCat.id}`);

    } catch (error) {
        console.error("❌ Generation Error:", error.message);
        // If 404 occurs again, try fall-back model 'gemini-pro'
        if (error.message.includes('404')) {
            console.log("🔄 Model not found. Check if your API Key supports the Gemini-1.5 model line.");
        }
        process.exit(1);
    }
}

run();