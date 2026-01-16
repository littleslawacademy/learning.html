async function run() {
    try {
        // Try 'gemini-1.5-flash'. If you still get a 404, 'gemini-pro' is the most stable fallback.
        const modelName = "gemini-1.5-flash"; 
        const model = genAI.getGenerativeModel({ model: modelName });

        const now = new Date();
        const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
        
        let level = "Beginner Fundamentals";
        let topics = "JMeter, LoadRunner, SRE definition, basic Linux commands";

        if (dayOfYear % 3 === 1) {
            level = "Intermediate Implementation";
            topics = "Correlation, Pacing logic, SLO vs SLA, Jenkins CI/CD pipelines, K6 scripting";
        } else if (dayOfYear % 3 === 2) {
            level = "Trending SRE & DevOps Modernization";
            topics = "Platform Engineering, Observability, OpenTelemetry, FinOps, K8s scaling";
        }

        const prompt = `
            ACT AS: A Principal Performance Architect & SRE with 30 years of experience. You started with Mercury LoadRunner and now architect auto-scaling AKS/EKS clusters.
            Level: ${level}.
            Topics: ${topics}.

            GOAL: Write a 300-word masterclass entry for your students at Little's Law Academy.
            
            STRUCTURE:
            1. THE TRENCHES (Narrative): Start with a specific war story or 3 AM production incident. Use emotional, expert language.
            2. THE ARCHITECTURAL CHALLENGE: Describe a bottleneck involving tools like ${topics}.
            3. THE SOLUTION: Provide an exact technical fix (Include a code snippet or CLI command).
            4. THE LESSON: One final piece of advice for the future.

            Style: Technically sophisticated, 300 words long, inspiring.
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const masterclassText = response.text();

        if (!masterclassText || masterclassText.length < 100) {
            throw new Error("AI returned empty or too short response.");
        }

        // Save to Firebase
        await db.collection('admin_data').doc('hourly_tip').set({
            content: masterclassText,
            category: level,
            author: "Principal Architect (AI)",
            lastUpdated: new Date().toISOString()
        });

        console.log(`✅ Success: ${modelName} generated the Masterclass.`);

    } catch (error) {
        console.error("❌ Script Error:", error.message);
        
        // AUTO-FALLBACK: If Flash fails, try the older but stable Gemini Pro
        if (error.message.includes('404') || error.message.includes('not found')) {
            console.log("🔄 Attempting fallback to gemini-pro...");
            try {
                const fallbackModel = genAI.getGenerativeModel({ model: "gemini-pro" });
                // ... you could repeat the generation here if you wanted a total backup ...
            } catch (inner) {
                console.error("❌ All models failed.");
            }
        }
        process.exit(1);
    }
}