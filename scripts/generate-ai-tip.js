const admin = require('firebase-admin');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');
const path = require('path');

// 1. FIREBASE ADMIN SETUP
if (!admin.apps.length) {
    try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    } catch (e) {
        console.error("❌ Firebase Service Account error. Check your GitHub Secret.");
        process.exit(1);
    }
}
const db = admin.firestore();

// 2. AI SETUP
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const categoryMap = {
    "performance": { name: "Performance Hub", folder: "performance", tools: ["JMeter", "NeoLoad", "LoadRunner", "k6"] },
    "sre": { name: "SRE & Cloud", folder: "sre", tools: ["Kubernetes", "AKS", "Observability", "Azure"] },
    "devops": { name: "DevOps CI/CD", folder: "devops", tools: ["GitHub", "Jenkins", "Linux", "Docker"] },
    "performance_mastery": { name: "Roadmap Mastery", folder: "performance_mastery", tools: ["Fundamentals", "Analysis"] },
    "trends_ai": { name: "Trends & AI", folder: "trends_ai", tools: ["AI-Testing", "Predictive-Ops"] }
};

async function run() {
    // UK/EU Recommended stable IDs
    const modelNames = ["gemini-1.5-flash", "gemini-pro"];
    let contentGenerated = null;

    const keys = Object.keys(categoryMap);
    const cat = categoryMap[keys[Math.floor(Math.random() * keys.length)]];
    const tool = cat.tools[Math.floor(Math.random() * cat.tools.length)];

    for (const name of modelNames) {
        try {
            console.log(`📡 Attempting secure connection: ${name}...`);
            
            // Using the base model getter - SDK handles the endpoint version
            const model = genAI.getGenerativeModel({ model: name });

            const prompt = `Act as the Little's Law Engineering Team. Write a 300-word professional briefing on ${tool}. Category: ${cat.name}. Include: From the Trenches story, Architectural analysis, and a Code/Command example. Use Markdown. No mention of AI.`;

            // Adding a timeout and cleaner response handling
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            if (text && text.length > 100) {
                contentGenerated = text;
                console.log(`✅ Success: Content received via ${name}`);
                break; 
            }
        } catch (error) {
            console.error(`❌ [${name}] Error:`, error.message);
            // If it's a 404, we continue to 'gemini-pro'
        }
    }

    if (contentGenerated) {
        await saveEverything(contentGenerated, tool, cat);
    } else {
        console.error("🚨 Content generation failed globally. Verify API Key exists in a project with Generative Language API enabled.");
        process.exit(1);
    }
}

async function saveEverything(text, tool, category) {
    // 1. Firebase Save
    await db.collection('admin_data').doc('hourly_tip').set({
        content: text,
        tool: tool,
        category: category.folder,
        author: "Little's Law Team",
        lastUpdated: new Date().toISOString()
    });

    // 2. GitHub Save
    const baseDocsDir = path.join(__dirname, '../docs');
    const targetFolder = path.join(baseDocsDir, category.folder);
    if (!fs.existsSync(targetFolder)) fs.mkdirSync(targetFolder, { recursive: true });

    const cleanName = tool.toLowerCase().replace(/[^a-z0-9]/g, '_');
    fs.writeFileSync(path.join(targetFolder, `${cleanName}.md`), text);
    console.log(`📂 Wiki updated: docs/${category.folder}/${cleanName}.md`);
}

run();