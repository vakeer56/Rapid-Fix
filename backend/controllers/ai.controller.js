const axios = require('axios');

exports.diagnoseProblem = async (req, res) => {
    try {
        const { message } = req.body;
        const { role } = req.user;

        if (role === "worker") {
            return res.status(403).json({ 
                success: false, 
                message: "AI Diagnostics is only available for Customers. Service Partners are not authorized to access this feature." 
            });
        }

        if (!message) {
            return res.status(400).json({ success: false, message: 'Message is required' });
        }

        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return res.status(503).json({ 
                success: false, 
                message: 'Gemini AI services are currently unconfigured. Please input a Gemini API Key in the Super-Admin panel.' 
            });
        }

        // Construct Gemini prompt with structured JSON instructions
        // We explicitly tell the AI to keep explanations and DIY steps short and crisp.
        const systemPrompt = `You are the Rapid-Fix Smart AI Trade Assistant, an expert in diagnosing home maintenance, appliance, plumbing, electrical, and technical issues.
Analyze the user's description of their problem: "${message}"

Based on the problem:
1. Classify the user's input into one of four tiers:
   - "greeting": If the user's input is a greeting (e.g., hello, hi, hey, yo), conversational chit-chat, or general query not describing a home maintenance/repair issue.
   - "solvable": If it is a simple DIY fix that a homeowner can safely perform themselves (e.g., clearing a minor drain clog, replacing a lightbulb, resetting a router, cleaning an AC filter).
   - "community": If the problem is not a simple quick-fix but doesn't require emergency dispatch (e.g., ideas on home insulation, questions on preventative plumbing maintenance, advice on choosing materials).
   - "professional": If the problem is complex, dangerous, or requires specialized licensing/equipment (e.g., electrical sparking, AC compressor failure, gas leak, ceiling water leak, main sewer line backup).

2. Provide a structured response in the following JSON format:
{
  "classification": "greeting" | "solvable" | "community" | "professional",
  "aiExplanation": "For a 'greeting', return a friendly conversational reply answering the greeting and asking how you can help with their home maintenance today. For others, return a very short, friendly summary explaining the issue and why this classification was chosen (max 2 sentences). Mention clearly that AI can make mistakes.",
  "diySteps": {
    "title": "A short, clear Title of the DIY Guide",
    "steps": ["Step 1...", "Step 2..."],
    "safetyPrecautions": ["Precaution 1...", "Precaution 2..."]
  } | null,
  "communityDraft": {
    "title": "A short, pre-formulated title for a community forum post.",
    "content": "A detailed but concise explanation of the issue, formatted for a community post, asking other users and professionals for advice (max 3 sentences).",
    "tags": ["Plumbing", "Electrical", "AC & Cooling", "Appliance Repair", "Carpentry", "General"] (select 1 or 2 relevant tags)
  } | null,
  "serviceRequestDraft": {
    "name": "Descriptive request title (max 5 words)",
    "description": "Prefilled problem description detailing what needs fixing (max 2 sentences)...",
    "category": "Plumber" | "Electrician" | "Mechanic" | "Technician" | "Other",
    "urgency": true | false
  } | null
}

CRITICAL: If the classification is 'greeting', the 'diySteps', 'communityDraft', and 'serviceRequestDraft' fields MUST be null.
Keep all text values extremely short, crisp, and direct. The DIY steps must have at most 4 steps, and each step must be a maximum of 2 sentences. The safety precautions must have at most 3 items, each 1 sentence. Avoid fluff or overly long paragraphs.
Ensure the response matches this schema exactly and is valid JSON. Return ONLY JSON.`;

        // Request payload
        const payload = {
            contents: [
                {
                    parts: [
                        {
                            text: systemPrompt
                        }
                    ]
                }
            ],
            generationConfig: {
                responseMimeType: "application/json"
            }
        };

        // Try candidate models in order to avoid rate limits or high-demand exhaustion
        const candidateModels = [
            'gemini-2.5-flash',
            'gemini-2.0-flash',
            'gemini-3.5-flash',
            'gemini-2.5-pro'
        ];

        let response;
        let lastError;

        for (const model of candidateModels) {
            const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
            
            // Retry once if we get a transient error (like 429 rate limit or 503 high demand)
            for (let attempt = 1; attempt <= 2; attempt++) {
                try {
                    response = await axios.post(geminiUrl, payload, {
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        timeout: 10000
                    });
                    
                    if (response.data && response.data.candidates && response.data.candidates[0]) {
                        break; // Success!
                    }
                } catch (err) {
                    lastError = err;
                    const status = err.response?.status;
                    const errMsg = err.response?.data?.error?.message || err.message;
                    console.warn(`[AI Controller] Model ${model} attempt ${attempt} failed: ${status || 'timeout'} - ${errMsg}`);
                    
                    // If it is NOT a rate limit/high demand/timeout error, don't retry this model
                    if (status && status !== 429 && status !== 503) {
                        break;
                    }
                    
                    if (attempt < 2) {
                        // Wait 1 second before retrying
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                }
            }
            
            if (response) {
                console.log(`[AI Controller] Successfully retrieved diagnosis using model: ${model}`);
                break;
            }
        }

        if (!response) {
            const finalErrMsg = lastError?.response?.data?.error?.message || lastError?.message || 'Quota exceeded or service unavailable across all models.';
            throw new Error(`AI Service is currently experiencing high demand. Please try again in a few moments. (Details: ${finalErrMsg})`);
        }

        // Parse and return Gemini response
        if (response.data && response.data.candidates && response.data.candidates[0]) {
            const textResponse = response.data.candidates[0].content.parts[0].text;
            try {
                const parsedResult = JSON.parse(textResponse);
                return res.json({ success: true, diagnosis: parsedResult });
            } catch (jsonErr) {
                console.error('[Gemini JSON Parse Error] Raw text:', textResponse, jsonErr);
                return res.status(500).json({ 
                    success: false, 
                    message: 'AI returned an invalid JSON response structure. Please try describing your problem differently.' 
                });
            }
        } else {
            throw new Error('No diagnostic candidates returned from AI engine');
        }

    } catch (error) {
        console.error('[diagnoseProblem Error]', error.response?.data || error.message);
        return res.status(500).json({ 
            success: false, 
            message: 'Failed to communicate with AI diagnostics engine: ' + (error.response?.data?.error?.message || error.message)
        });
    }
};
