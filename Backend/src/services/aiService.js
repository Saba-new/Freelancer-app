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
  const text = description.toLowerCase();
  const requirements = [];
  
  // Enhanced keyword patterns with categories
  const patterns = [
    // Authentication
    { keywords: ['login', 'signup', 'auth', 'authentication', 'user account', 'password', 'register'], 
      text: 'Implement user authentication system', 
      category: 'authentication', 
      priority: 'high' },
    
    // Dashboard/UI
    { keywords: ['dashboard', 'interface', 'ui', 'user interface', 'admin panel'], 
      text: 'Build dashboard/admin interface', 
      category: 'frontend', 
      priority: 'high' },
    
    // Database
    { keywords: ['database', 'mongodb', 'mysql', 'postgres', 'data storage', 'schema'], 
      text: 'Set up database and data models', 
      category: 'database', 
      priority: 'high' },
    
    // API
    { keywords: ['api', 'rest api', 'endpoint', 'backend api', 'routes'], 
      text: 'Develop REST API endpoints', 
      category: 'api', 
      priority: 'high' },
    
    // Frontend Features
    { keywords: ['frontend', 'react', 'vue', 'angular', 'responsive', 'ui components'], 
      text: 'Create responsive frontend interface', 
      category: 'frontend', 
      priority: 'medium' },
    
    // Backend Logic
    { keywords: ['backend', 'server', 'business logic', 'node', 'express'], 
      text: 'Implement backend business logic', 
      category: 'backend', 
      priority: 'medium' },
    
    // Payment
    { keywords: ['payment', 'stripe', 'paypal', 'transaction', 'checkout'], 
      text: 'Integrate payment processing', 
      category: 'api', 
      priority: 'medium' },
    
    // Chat/Messaging
    { keywords: ['chat', 'messaging', 'real-time', 'socket', 'websocket'], 
      text: 'Implement real-time chat/messaging', 
      category: 'api', 
      priority: 'medium' },
    
    // File Upload
    { keywords: ['upload', 'file upload', 'image upload', 'cloudinary', 'storage'], 
      text: 'Add file upload functionality', 
      category: 'backend', 
      priority: 'low' },
    
    // Deployment
    { keywords: ['deploy', 'deployment', 'hosting', 'production', 'server'], 
      text: 'Deploy application to production', 
      category: 'deployment', 
      priority: 'low' },
    
    // Testing
    { keywords: ['test', 'testing', 'unit test', 'integration test'], 
      text: 'Write tests for key features', 
      category: 'testing', 
      priority: 'low' },
  ];

  // Check for each pattern
  patterns.forEach(pattern => {
    if (pattern.keywords.some(keyword => text.includes(keyword))) {
      // Avoid duplicates
      if (!requirements.some(r => r.text === pattern.text)) {
        requirements.push({
          text: pattern.text,
          category: pattern.category,
          priority: pattern.priority,
          status: "pending",
          verified: false,
        });
      }
    }
  });

  // If no specific requirements found, extract from description length and complexity
  if (requirements.length === 0) {
    if (text.length > 200) {
      // Longer description - likely complex project
      requirements.push(
        {
          text: "Complete core functionality as described",
          category: "other",
          priority: "high",
          status: "pending",
          verified: false,
        },
        {
          text: "Implement user interface",
          category: "frontend",
          priority: "medium",
          status: "pending",
          verified: false,
        },
        {
          text: "Set up backend logic",
          category: "backend",
          priority: "medium",
          status: "pending",
          verified: false,
        }
      );
    } else {
      // Short description - keep it simple
      requirements.push({
        text: "Complete project as described",
        category: "other",
        priority: "high",
        status: "pending",
        verified: false,
      });
    }
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
