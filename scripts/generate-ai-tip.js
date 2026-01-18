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

// CATEGORY CONFIGURATION
const categoryMap = {
    "performance": {
        name: "Performance Tools Hub",
        folder: "performance",
        tools: ["JMeter", "NeoLoad", "LoadRunner", "k6", "Locust", "Gatling"],
        focus: "Load testing strategies, scripting bottlenecks, and tool-specific optimizations."
    },
    "sre": {
        name: "SRE & Observability",
        folder: "sre",
        tools: ["Kubernetes", "AKS", "Azure-Monitor", "Grafana", "Datadog", "Dynatrace", "AppDynamics"],
        focus: "Reliability engineering, SLIs/SLOs, Error Budgets, and Infrastructure Observability."
    },
    "devops": {
        name: "DevOps & CI/CD",
        folder: "devops",
        tools: ["GitHub-Actions", "Jenkins", "Docker", "Linux-Kernel-Tuning", "Terraform", "Ansible"],
        focus: "Pipeline automation, container orchestration, and OS-level performance tuning."
    },
    "performance_mastery": {
        name: "Basics to Advanced Mastery",
        folder: "performance_mastery",
        tools: ["Fundamentals", "Workload-Design", "Queueing-Theory", "Bottleneck-Analysis", "Capacity-Planning"],
        focus: "The professional roadmap: explaining core concepts like Little's Law from absolute basics to architectural expert level."
    },
    "trends_ai": {
        name: "Innovation & AI Trends",
        folder: "trends_ai",
        tools: ["GenAI-in-Testing", "Predictive-Analytics", "Autonomous-Load-Testing", "LLM-Optimizations", "Tech-Trends-2025"],
        focus: "Cutting-edge updates: How AI is transforming performance, autonomous remediation, and the future of engineering."
    }
};

async function run() {
    try {
        // Selection Logic: Pick a random category and tool
        const keys = Object.keys(categoryMap);
        const selectedCatKey = keys[Math.floor(Math.random() * keys.length)];
        const category = categoryMap[selectedCatKey];
        const selectedTool = category.tools[Math.floor(Math.random() * category.tools.length)];

        console.log(`🚀 Little's Law Team is generating content for: ${selectedTool} (${category.name})`);

        // Model initialization (Using the most stable high-speed model)
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `
            ACT AS: The Senior Leadership Team at Little's Law Academy. You are world-class Architects with 30 years of history.
            TOPIC: ${selectedTool}.
            CATEGORY: ${category.name}.
            THEME: ${category.focus}.
            
            GOAL: Write a technical briefing (Approx 350 words) for our students.
            IMPORTANT: Do not mention AI. Speak as 'We, the Little's Law Team'.
            
            STRUCTURE (Use Strictly valid Markdown):
            # ${selectedTool} Internal Team Briefing
            
            ## ⚡ From the Trenches (Experience)
            Share an emotional and highly specific "war story" from our team's history. Talk about a 3 AM system collapse, a critical latency spike in production, or the stress of a failing BFCM load test. Connect this emotionally to why ${selectedTool} is vital.
            
            ## 🛠️ Architecture Deep-Dive
            Break down a complex technical concept. Talk about specific metrics (P99 latency, Throughput vs Goodput, TCP handshakes, or Heap usage). Explain the internal mechanics.
            
            ## 💻 Technical Implementation
            Provide one exact technical example that our team recommends. This MUST be a code block (CLI command, YAML config, JMeter Groovy snippet, or Python k6 script).
            
            ## 💡 Our Engineering Philosophy
            One closing piece of mentorship/wisdom regarding the current tech landscape or the rise of AI in our field.
            
            TONE: High-authority, expert-level, yet inspiring and mentorship-focused.
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const markdownContent = response.text();

        if (!markdownContent) throw new Error("Empty response from Engine");

        // 1. SYNC TO FIREBASE (Site-wide Banner)
        await db.collection('admin_data').doc('hourly_tip').set({
            content: markdownContent,
            tool: selectedTool,
            folder: category.folder,
            author: "Little's Law Team",
            lastUpdated: new Date().toISOString()
        });

        // 2. SYNC TO GITHUB (Create Folders & Save Markdown)
        const baseDocsDir = path.join(__dirname, '../docs');
        const targetFolder = path.join(baseDocsDir, category.folder);

        // Ensure path exists
        if (!fs.existsSync(targetFolder)) {
            fs.mkdirSync(targetFolder, { recursive: true });
        }

        // Clean name for file consistency
        const cleanName = selectedTool.toLowerCase().replace(/[^a-z0-9]/g, '_');
        const filePath = path.join(targetFolder, `${cleanName}.md`);
        
        fs.writeFileSync(filePath, markdownContent);

        console.log(`✅ CONTENT PUBLISHED: docs/${category.folder}/${cleanName}.md`);

    } catch (error) {
        console.error("❌ Fatal Team Content Error:", error.message);
        process.exit(1);
    }
}

run();