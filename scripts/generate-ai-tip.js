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
        // Using 'gemini-1.5-flash' - adding '-latest' is often more stable in CI
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const categories = [
            {
                id: 'performance',
                tools: ['JMeter', 'NeoLoad', 'LoadRunner', 'k6', 'Locust'],
                topics: 'Correlation, Parameterization, Workload Modeling, Pacing'
            },
            {
                id: 'sre',
                tools: ['Kubernetes', 'AKS', 'Azure', 'Grafana', 'Datadog', 'Dynatrace'],
                topics: 'SLOs, Error Budgets, AKS Scaling, Observability'
            },
            {
                id: 'devops',
                tools: ['GitHub', 'Jenkins', 'Linux', 'Pipelines', 'Docker'],
                topics: 'CI/CD workflows, Bash Scripting, Linux Performance Tuning'
            }
        ];

        const selectedCat = categories[Math.floor(Math.random() * categories.length)];
        const selectedTool = selectedCat.tools[Math.floor(Math.random() * selectedCat.tools.length)];

        const prompt = `
            ACT AS: A Principal Performance Architect & SRE with 30 years of experience.
            
            GOAL: Write a professional Masterclass entry (300 words) about ${selectedTool}.
            Focus on these areas: ${selectedCat.topics}.
            
            FORMAT (Strict Markdown):
            1. # ${selectedTool} Architectural Deep Dive
            2. ## The Trenches (Story)
            Write a 100-word emotional "war story" from the past (e.g., a massive production failure at 3 AM) and how it felt to be the one responsible for the fix.
            3. ## Technical Analysis
            Explain a highly technical bottleneck involving ${selectedTool}. Use expert terminology (Latency, Throughput, TCP, Heap Analysis).
            4. ## Implementation Example
            Provide a clear technical example (e.g., a code snippet, a CLI command, or a YAML config).
            5. ## Veteran Wisdom
            Close with a one-sentence inspiring advice for future Performance Engineers.

            WORD COUNT: Ensure the total length is at least 300 words.
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        if (!text) throw new Error("AI returned empty content");

        // 3. UPDATE FIREBASE (Real-time Site Banner)
        await db.collection('admin_data').doc('hourly_tip').set({
            content: text,
            tool: selectedTool,
            category: selectedCat.id,
            lastUpdated: new Date().toISOString()
        });

        // 4. UPDATE GITHUB (Permanent categorized Docs)
        // Root is 'docs/', Subfolders are 'performance/', 'sre/', 'devops/'
        const baseDocsDir = path.join(__dirname, '../docs');
        const categoryFolder = path.join(baseDocsDir, selectedCat.id);

        if (!fs.existsSync(categoryFolder)) {
            fs.mkdirSync(categoryFolder, { recursive: true });
        }

        const fileName = `${selectedTool.toLowerCase()}.md`;
        const filePath = path.join(categoryFolder, fileName);

        fs.writeFileSync(filePath, text);

        console.log(`✅ [${selectedCat.id}] Successfully documented ${selectedTool} into /docs/${selectedCat.id}/${fileName}`);

    } catch (error) {
        console.error("❌ Fatal Error:", error.message);
        process.exit(1);
    }
}

run();