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

const categoryMap = {
    "performance": {
        name: "Performance Tools Hub",
        folder: "performance",
        tools: ["JMeter", "NeoLoad", "LoadRunner", "k6", "Locust"],
        focus: "Load testing strategies and tool-specific optimizations."
    },
    "sre": {
        name: "SRE & Observability",
        folder: "sre",
        tools: ["Kubernetes", "AKS", "Azure-Monitor", "Grafana", "Datadog"],
        focus: "Reliability engineering and SLIs/SLOs."
    },
    "devops": {
        name: "DevOps & CI/CD",
        folder: "devops",
        tools: ["GitHub-Actions", "Jenkins", "Docker", "Terraform"],
        focus: "Pipeline automation and container orchestration."
    },
    "performance_mastery": {
        name: "Basics to Advanced Mastery",
        folder: "performance_mastery",
        tools: ["Fundamentals", "Workload-Design", "Bottleneck-Analysis"],
        focus: "Core performance concepts from beginner to expert level."
    },
    "trends_ai": {
        name: "Innovation & AI Trends",
        folder: "trends_ai",
        tools: ["GenAI-in-Testing", "Autonomous-Load-Testing", "Tech-Trends-2026"],
        focus: "How AI and new trends are changing SRE and Testing."
    }
};

async function run() {
    // Attempt these models in order of preference
    const modelNames = ["gemini-1.5-flash", "gemini-pro"];
    let successfulGeneration = false;

    // Pick content first
    const keys = Object.keys(categoryMap);
    const selectedCatKey = keys[Math.floor(Math.random() * keys.length)];
    const category = categoryMap[selectedCatKey];
    const selectedTool = category.tools[Math.floor(Math.random() * category.tools.length)];

    for (const modelName of modelNames) {
        if (successfulGeneration) break;

        try {
            console.log(`📡 Trying generation with model: ${modelName}...`);
            const model = genAI.getGenerativeModel({ model: modelName });

            const prompt = `
                ACT AS: The Senior Leadership Team at Little's Law Academy. You are world-class Architects.
                TOPIC: ${selectedTool}.
                CATEGORY: ${category.name}.
                GOAL: Write a technical masterclass (350 words) for our students.
                
                STRUCTURE:
                # ${selectedTool} Internal Team Briefing
                ## ⚡ From the Trenches
                Tell an emotional war story about this topic from our team's 30-year history.
                ## 🛠️ Architecture Deep-Dive
                Technical analysis of P99 metrics, bottlenecks, or internal mechanics.
                ## 💻 Technical Implementation
                Provide a code snippet or CLI command (formatted in a markdown code block).
                ## 💡 Team Wisdom
                A closing mentor tip.
                
                IMPORTANT: Do not mention AI. Only say "Little's Law Team".
            `;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            if (text) {
                console.log(`✅ Success using ${modelName}`);
                await saveResult(text, selectedTool, category);
                successfulGeneration = true;
            }

        } catch (error) {
            console.warn(`⚠️ Model ${modelName} failed or not found. trying next...`);
        }
    }

    if (!successfulGeneration) {
        console.error("❌ All AI models failed. Check your API Key permissions and quota.");
        process.exit(1);
    }
}

async function saveResult(text, tool, category) {
    // Save to Firebase
    await db.collection('admin_data').doc('hourly_tip').set({
        content: text,
        tool: tool,
        folder: category.folder,
        author: "Little's Law Team",
        lastUpdated: new Date().toISOString()
    });

    // Save to GitHub
    const baseDocsDir = path.join(__dirname, '../docs');
    const targetFolder = path.join(baseDocsDir, category.folder);
    if (!fs.existsSync(targetFolder)) fs.mkdirSync(targetFolder, { recursive: true });

    const cleanName = tool.toLowerCase().replace(/[^a-z0-9]/g, '_');
    fs.writeFileSync(path.join(targetFolder, `${cleanName}.md`), text);
}

run().catch(console.error);