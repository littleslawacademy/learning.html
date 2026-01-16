const admin = require('firebase-admin');
const { GoogleGenerativeAI } = require("@google/generative-ai");

// 1. Initialize Firebase Admin
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

// 2. Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function run() {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        // Categorization to ensure the AI covers all your requested areas
        const topics = [
            "Legacy to Modern Perf (LoadRunner vs K6/Locust)",
            "Cloud Native Observability (Grafana/Prometheus/Dynatrace on AKS/EKS)",
            "DevOps Orchestration (Complex Jenkins/GitHub Actions Pipelines)",
            "Distributed Load Testing Bottlenecks in Azure/AWS",
            "Advanced SRE (HPA Scaling, SLIs/SLOs, and Error Budgets)"
        ];
        const selectedTopic = topics[Math.floor(Math.random() * topics.length)];

        const prompt = `
            ACT AS: A Principal Performance Architect & SRE with 30 years of experience. You started with manual scripting in Mercury LoadRunner and now architect auto-scaling AKS/EKS clusters.
            
            TOPIC: ${selectedTopic}

            GOAL: Write a 300-word masterclass entry for your students at Little's Law Academy.
            
            STRUCTURE & REQUIREMENTS:
            1. THE TRENCHES (Narrative): Start with a specific "war story" or memory. Use emotional language—talk about the stress of a 3 AM production crash or the pride of an optimized 99th percentile response time.
            2. THE ARCHITECTURAL CHALLENGE: Describe a complex technical bottleneck involving specific tools (JMeter, Dynatrace, Datadog, Kubernetes, etc.). 
            3. THE DATA-DRIVEN SOLUTION: Provide an exact technical fix. Include a sample code snippet, a specific Linux command, a JMeter property, or a K8s YAML config.
            4. THE LESSON LEARNED: Why does this matter in the long term?
            
            STYLING:
            - Technically sophisticated (use terms like 'TCP Retransmissions', 'Thread contention', 'Garbage Collection overhead').
            - Mentoring and inspiring tone.
            - DO NOT go under 280 words. DO NOT exceed 350 words.
        `;

        const result = await model.generateContent(prompt);
        const masterclassText = result.response.text();

        // Save to Firebase
        await db.collection('admin_data').doc('hourly_tip').set({
            content: masterclassText,
            category: selectedTopic,
            author: "Principal Architect Vasanth (AI)",
            lastUpdated: new Date().toISOString()
        });

        console.log(`✅ ${selectedTopic} masterclass generated and sent to Firebase!`);
    } catch (error) {
        console.error("❌ Script Error:", error);
        process.exit(1);
    }
}

run();