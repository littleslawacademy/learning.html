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
// Ensure your GEMINI_API_KEY secret is correct in GitHub
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function run() {
    try {
        // Use "gemini-1.5-flash" - this is the most current stable identifier
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        // Tool categories and their respective folders
        const categories = [
            {
                folder: 'performance',
                tools: ['JMeter', 'NeoLoad', 'LoadRunner', 'k6', 'Locust', 'Gatling'],
                topics: 'Correlation, Parameterization, Think Time, Pacing, Throughput, Workload Modeling'
            },
            {
                folder: 'sre',
                tools: ['Kubernetes', 'AKS', 'Azure-Monitor', 'Grafana', 'Datadog', 'Dynatrace', 'AppDynamics'],
                topics: 'SLOs, SLIs, Error Budgets, Auto-scaling, Observability, AKS clusters, Circuit Breaking'
            },
            {
                folder: 'devops',
                tools: ['GitHub-Actions', 'Jenkins', 'Linux-Performance', 'Docker', 'GitLab-CI', 'Ansible'],
                topics: 'Pipelines, CI/CD, Shell Scripting, Kernel Tuning, TCP/IP Optimization, Container Hardening'
            }
        ];

        // Randomly pick a category and then a tool
        const selectedCat = categories[Math.floor(Math.random() * categories.length)];
        const selectedTool = selectedCat.tools[Math.floor(Math.random() * selectedCat.tools.length)];

        const prompt = `
            ACT AS: A World-Class Principal Performance Architect & SRE with 30 years of experience.
            You are mentoring students at Little's Law Academy.

            GOAL: Write a Technical Wiki entry for ${selectedTool} focused on ${selectedCat.topics}.
            
            STRUCTURE (Markdown):
            1. # ${selectedTool}: Advanced Architecture Insight
            2. THE TRENCHES (Narrative): Start with a "war story". Talk about an emotional moment early in your career involving high-stakes performance failure and the lesson learned.
            3. TECHNICAL DEEP DIVE: Explain a specific concept related to ${selectedTool} (e.g. Memory profiling, TCP tuning, or async workloads).
            4. PRACTICAL EXAMPLE: Provide a real-world code snippet, CLI command, or configuration snippet (YAML, JMX, or Script).
            5. THE VETERAN'S WISDOM: Closing emotional/professional advice for future-proofing an SRE career.

            TONE: Professional, sophisticated, inspiring, and strictly technical.
            LENGTH: Exactly around 300 words.
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const masterclassMD = response.text();

        if (!masterclassMD) throw new Error("Response was empty.");

        // 3. SYNC TO FIREBASE (For the Homepage Banner)
        await db.collection('admin_data').doc('hourly_tip').set({
            content: masterclassMD,
            tool: selectedTool,
            folder: selectedCat.folder,
            lastUpdated: new Date().toISOString()
        });

        // 4. SYNC TO GITHUB (Create Folders & Save MD)
        // Correct path for sub-folders inside 'docs'
        const baseDocsDir = path.join(__dirname, '../docs');
        const categoryDir = path.join(baseDocsDir, selectedCat.folder);

        if (!fs.existsSync(categoryDir)) {
            fs.mkdirSync(categoryDir, { recursive: true });
        }

        const fileName = `${selectedTool.toLowerCase()}.md`;
        const filePath = path.join(categoryDir, fileName);

        fs.writeFileSync(filePath, masterclassMD);

        console.log(`✅ [${selectedCat.folder}] ${selectedTool} Masterclass generated.`);

    } catch (error) {
        console.error("❌ Script Error:", error.message);
        process.exit(1);
    }
}

run();