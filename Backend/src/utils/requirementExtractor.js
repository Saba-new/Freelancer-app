import { extractRequirementsAI } from "../services/aiService.js";

/**
 * Extract requirements from project description
 * Uses AI if available, falls back to keyword matching
 * @param {string} description - Project description
 * @returns {Promise<Array>} Array of requirement objects
 */
export default async function extractRequirements(description) {
  if (!description || description.trim().length < 10) {
    return [{
      text: "Complete the project as described",
      category: "other",
      priority: "high",
      status: "pending",
      verified: false,
    }];
  }

  try {
    // Try AI-powered extraction first
    const requirements = await extractRequirementsAI(description);
    
    if (requirements && requirements.length > 0) {
      return requirements;
    }

    // Fallback to keyword-based extraction
    return keywordBasedExtraction(description);
  } catch (error) {
    console.error("Requirement extraction error:", error.message);
    return keywordBasedExtraction(description);
  }
}

/**
 * Fallback keyword-based requirement extraction
 */
function keywordBasedExtraction(description) {
  const keywords = [
    { word: "login", category: "authentication" },
    { word: "authentication", category: "authentication" },
    { word: "dashboard", category: "frontend" },
    { word: "admin", category: "backend" },
    { word: "payment", category: "api" },
    { word: "profile", category: "frontend" },
    { word: "chat", category: "api" },
    { word: "database", category: "database" },
    { word: "api", category: "api" },
    { word: "deploy", category: "deployment" },
  ];

  const text = description.toLowerCase();
  const requirements = [];

  keywords.forEach((item) => {
    if (text.includes(item.word)) {
      requirements.push({
        text: `Implement ${item.word} functionality`,
        category: item.category,
        priority: "medium",
        status: "pending",
        verified: false,
      });
    }
  });

  if (requirements.length === 0) {
    requirements.push({
      text: "Complete the project as described",
      category: "other",
      priority: "high",
      status: "pending",
      verified: false,
    });
  }

  return requirements;
}
