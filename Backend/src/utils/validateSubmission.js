import { validateSubmissionAI } from "../services/aiService.js";

/**
 * Validate submitted work against requirements
 * Uses AI if available, falls back to simple matching
 * @param {Array} requirements - Project requirements
 * @param {string} submissionText - Description or URL of submission
 * @returns {Promise<Object>} Validation result with report
 */
export default async function validateSubmission(requirements, submissionText, submissionUrl = "") {
  if (!requirements || requirements.length === 0) {
    return {
      overallScore: 0,
      validationReport: [],
      feedback: "No requirements defined for this project",
      missingItems: [],
      strengths: [],
    };
  }

  try {
    // Try AI-powered validation first
    const validation = await validateSubmissionAI(
      requirements,
      submissionText,
      submissionUrl
    );

    if (validation && validation.validationReport) {
      return validation;
    }

    // Fallback to simple text matching
    return simpleValidation(requirements, submissionText);
  } catch (error) {
    console.error("Validation error:", error.message);
    return simpleValidation(requirements, submissionText);
  }
}

/**
 * Fallback simple text-based validation
 */
function simpleValidation(requirements, submissionText) {
  const text = (submissionText || "").toLowerCase();

  const validationReport = requirements.map((req) => {
    // Extract key words from requirement
    const reqWords = req.text.toLowerCase().split(" ");
    const keyWords = reqWords.filter(
      w => w.length > 4 && !["implement", "create", "build", "develop"].includes(w)
    );

    // Check if any key words are in submission
    const matched = keyWords.some(word => text.includes(word));

    return {
      requirement: req.text,
      matched: matched,
      confidence: matched ? 60 : 40,
      evidence: matched
        ? "Keywords found in submission"
        : "No clear evidence in submission text",
    };
  });

  const matchedCount = validationReport.filter(r => r.matched).length;
  const overallScore = Math.round((matchedCount / requirements.length) * 100);

  return {
    overallScore,
    validationReport,
    feedback: overallScore >= 70
      ? "Most requirements appear to be met"
      : overallScore >= 40
      ? "Some requirements may be missing - review recommended"
      : "Several requirements appear to be missing",
    missingItems: validationReport
      .filter(r => !r.matched)
      .map(r => r.requirement),
    strengths: validationReport
      .filter(r => r.matched)
      .map(r => r.requirement),
  };
}
