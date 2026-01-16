const admin = require('firebase-admin');
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize Firebase Admin
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function run() {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = "Generate one short, unique 'Pro Tip' for a Performance Tester or SRE. Topics can include JMeter, Neoload, LoadRunner, K6, Locust, GitHub Actions, or Kubernetes. Focus on specific technical concepts like correlation, parameterization, or pacing. Format: Return only the text. Under 60 words.";

        const result = await model.generateContent(prompt);
        const tipText = result.response.text();

        // Save to Firebase (this will create the collection/doc if they don't exist)
        await db.collection('admin_data').doc('hourly_tip').set({
            content: tipText,
            lastUpdated: new Date().toISOString()
        });

        console.log("✅ Successfully sent new tip to Firebase!");
    } catch (error) {
        console.error("❌ Script Error:", error);
        process.exit(1);
    }
}

run();