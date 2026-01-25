import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Verify API key is loaded
if (!process.env.OPENAI_API_KEY) {
  console.warn("⚠️  WARNING: OPENAI_API_KEY is not set in environment variables!");
} else {
  console.log("✓ OpenAI API key loaded successfully");
}

/**
 * Extract structured requirements from project description using AI
 * @param {string} description - Project description from client
 * @returns {Promise<Array>} Array of requirement objects
 */
export async function extractRequirementsAI(description) {
  try {
    if (!description || description.trim().length < 10) {
      return [];
    }

    const prompt = `You are a project requirement analyzer. Extract clear, actionable requirements from the following project description.

Project Description:
"${description}"

Return ONLY a JSON array of requirements in this exact format:
[
  {
    "text": "Specific requirement description",
    "category": "frontend|backend|database|authentication|api|deployment|testing|other",
    "priority": "high|medium|low"
  }
]

Rules:
- Extract 3-10 specific, measurable requirements
- Be concise but clear
- Focus on deliverable features
- Categorize correctly
- Prioritize based on typical project needs
- Return ONLY valid JSON, no explanations`;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a technical project analyzer that extracts requirements. Always return valid JSON only.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 1000,
    });

    const content = response.choices[0].message.content.trim();
    
    // Extract JSON from response (in case AI adds markdown formatting)
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error("No JSON array found in AI response");
      return fallbackRequirements(description);
    }

    const requirements = JSON.parse(jsonMatch[0]);

    // Transform to match schema
    return requirements.map(req => ({
      text: req.text,
      category: req.category,
      priority: req.priority,
      status: "pending",
      verified: false,
    }));
  } catch (error) {
    console.error("AI Requirement Extraction Error:", error.message);
    return fallbackRequirements(description);
  }
}

/**
 * Validate submitted work against project requirements using AI
 * @param {Array} requirements - Project requirements
 * @param {string} submissionDescription - Description of submitted work
 * @param {string} submissionUrl - URL to submitted work
 * @returns {Promise<Object>} Validation report with matched requirements
 */
export async function validateSubmissionAI(
  requirements,
  submissionDescription,
  submissionUrl
) {
  try {
    if (!requirements || requirements.length === 0) {
      return {
        overallScore: 0,
        validationReport: [],
        feedback: "No requirements to validate against",
      };
    }

    const requirementList = requirements
      .map((r, i) => `${i + 1}. ${r.text}`)
      .join("\n");

    const prompt = `You are a technical project evaluator. Analyze if the submitted work meets the project requirements.

PROJECT REQUIREMENTS:
${requirementList}

SUBMISSION DETAILS:
URL: ${submissionUrl || "Not provided"}
Description: ${submissionDescription || "Not provided"}

Analyze and return ONLY a JSON object in this exact format:
{
  "overallScore": 0-100,
  "validationReport": [
    {
      "requirement": "Exact requirement text",
      "matched": true/false,
      "confidence": 0-100,
      "evidence": "Brief explanation of why matched/not matched"
    }
  ],
  "feedback": "2-3 sentence overall feedback",
  "missingItems": ["List of critical missing items"],
  "strengths": ["List of implemented features"]
}

Rules:
- Be objective and fair
- matched=true only if there's clear evidence
- Provide constructive feedback
- Return ONLY valid JSON, no explanations`;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a technical evaluator. Always return valid JSON only.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.2,
      max_tokens: 1500,
    });

    const content = response.choices[0].message.content.trim();
    
    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("No JSON object found in AI validation response");
      return fallbackValidation(requirements);
    }

    const validation = JSON.parse(jsonMatch[0]);
    return validation;
  } catch (error) {
    console.error("AI Validation Error:", error.message);
    console.error("Full error:", error);
    if (error.response) {
      console.error("API Response:", error.response.data);
    }
    return fallbackValidation(requirements);
  }
}

/**
 * Generate AI-powered progress suggestions for freelancer
 * @param {Object} project - Project object
 * @returns {Promise<Object>} Progress suggestions
 */
export async function generateProgressSuggestions(project) {
  try {
    const completedReqs = project.requirements.filter(
      r => r.status === "completed"
    ).length;
    const totalReqs = project.requirements.length;
    const progressPercent = totalReqs > 0 ? (completedReqs / totalReqs) * 100 : 0;

    const prompt = `You are a project management assistant. Analyze project progress and provide guidance.

PROJECT: ${project.title}
BUDGET: ₹${project.budget}
PROGRESS: ${completedReqs}/${totalReqs} requirements completed (${progressPercent.toFixed(1)}%)

REQUIREMENTS STATUS:
${project.requirements.map(r => `- [${r.status.toUpperCase()}] ${r.text}`).join("\n")}

Provide a JSON response with:
{
  "nextSteps": ["Array of 2-3 specific next actions"],
  "estimatedTimeToComplete": "e.g., 2-3 days",
  "riskAssessment": "low|medium|high",
  "recommendations": ["Array of 2-3 recommendations"]
}

Return ONLY valid JSON.`;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "You are a project advisor. Return only JSON." },
        { role: "user", content: prompt },
      ],
      temperature: 0.4,
      max_tokens: 500,
    });

    const content = response.choices[0].message.content.trim();
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    return {
      nextSteps: ["Complete pending requirements", "Test all features"],
      estimatedTimeToComplete: "Unknown",
      riskAssessment: "medium",
      recommendations: ["Stay on track with requirements"],
    };
  } catch (error) {
    console.error("AI Progress Suggestion Error:", error.message);
    return {
      nextSteps: ["Review requirements", "Continue development"],
      estimatedTimeToComplete: "Unknown",
      riskAssessment: "medium",
      recommendations: ["Focus on completing pending tasks"],
    };
  }
}

// Fallback functions when AI is unavailable

function fallbackRequirements(description) {
  const keywords = [
    "authentication",
    "dashboard",
    "database",
    "api",
    "frontend",
    "backend",
    "payment",
    "chat",
  ];

  const text = description.toLowerCase();
  const requirements = [];

  keywords.forEach(keyword => {
    if (text.includes(keyword)) {
      requirements.push({
        text: `Implement ${keyword} functionality`,
        category: "other",
        priority: "medium",
        status: "pending",
        verified: false,
      });
    }
  });

  if (requirements.length === 0) {
    requirements.push({
      text: "Complete project as described",
      category: "other",
      priority: "high",
      status: "pending",
      verified: false,
    });
  }

  return requirements;
}

function fallbackValidation(requirements) {
  return {
    overallScore: 50,
    validationReport: requirements.map(req => ({
      requirement: req.text,
      matched: false,
      confidence: 50,
      evidence: "AI validation unavailable - manual review required",
    })),
    feedback: "AI validation service unavailable. Please manually review the submission.",
    missingItems: ["Manual review required"],
    strengths: ["Submission received"],
  };
}
