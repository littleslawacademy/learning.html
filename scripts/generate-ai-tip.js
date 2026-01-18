const admin = require('firebase-admin');
const Groq = require('groq-sdk');
const fs = require('fs');
const path = require('path');

// 1. FIREBASE SETUP
if (!admin.apps.length) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();

// 2. GROQ SETUP
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const categoryMap = {
    "performance": { name: "Performance Hub", folder: "performance", tools: ["JMeter", "NeoLoad", "k6"] },
    "sre": { name: "SRE & Cloud", folder: "sre", tools: ["Kubernetes", "AKS", "Azure"] },
    "devops": { name: "DevOps Hub", folder: "devops", tools: ["Jenkins", "GitHub Actions"] },
    "performance_mastery": { name: "Roadmap Mastery", folder: "performance_mastery", tools: ["Fundamentals", "Queueing Theory"] },
    "trends_ai": { name: "Trends & AI", folder: "trends_ai", tools: ["Autonomous Testing", "LLM-Scaling"] }
};

async function run() {
    try {
        const keys = Object.keys(categoryMap);
        const cat = categoryMap[keys[Math.floor(Math.random() * keys.length)]];
        const tool = cat.tools[Math.floor(Math.random() * cat.tools.length)];

        console.log(`🚀 Little's Law Team preparing Masterclass for: ${tool}`);

        const completion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: "You are the Senior Technical Team at Little's Law Academy. You speak as a collective group of experts with 30 years experience. Your goal is technical mentorship."
                },
                {
                    role: "user",
                    content: `Write a technical masterclass on ${tool} for our students. 
                    Include: 1. A war story from the trenches. 2. A deep dive into an architectural bottleneck. 3. A practical CLI command or code snippet. 
                    Format as Markdown. Word count: Exactly 350 words. Do not mention AI.`
                }
            ],
            model: "llama-3.3-70b-versatile", // Highest quality Groq model
        });

        const text = completion.choices[0]?.message?.content;

        if (text) {
            await saveEverything(text, tool, cat);
            console.log(`✅ Success! [${tool}] content generated via Groq.`);
        }

    } catch (error) {
        console.error("❌ Groq Automation Error:", error.message);
        process.exit(1);
    }
}

async function saveEverything(text, tool, category) {
    // Save to Firebase (Home Banner)
    await db.collection('admin_data').doc('hourly_tip').set({
        content: text,
        tool: tool,
        category: category.folder,
        author: "Little's Law Team",
        lastUpdated: new Date().toISOString()
    });

    // Save to GitHub Wiki Folders
    const baseDocsDir = path.join(__dirname, '../docs');
    const folderPath = path.join(baseDocsDir, category.folder);
    if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath, { recursive: true });

    const fileName = tool.toLowerCase().replace(/[^a-z0-9]/g, '_') + ".md";
    fs.writeFileSync(path.join(folderPath, fileName), text);
}

run();