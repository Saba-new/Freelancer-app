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
    return simpleValidation(requirements, submissionText, submissionUrl);
  } catch (error) {
    console.error("Validation error:", error.message);
    return simpleValidation(requirements, submissionText, submissionUrl);
  }
}

/**
 * Fallback simple text-based validation
 */
function simpleValidation(requirements, submissionText, submissionUrl = "") {
  const text = (submissionText || "").toLowerCase();
  const url = (submissionUrl || "").toLowerCase();
  const hasSubmission = text.length > 0 || url.length > 0;
  const hasValidUrl = url.includes('github') || url.includes('drive.google') || url.includes('http');
  
  // Enhanced keyword matching with synonyms
  const categoryKeywords = {
    frontend: ['ui', 'interface', 'react', 'vue', 'angular', 'component', 'page', 'design', 'css', 'html', 'responsive'],
    backend: ['api', 'server', 'endpoint', 'route', 'controller', 'service', 'node', 'express', 'django', 'flask'],
    database: ['database', 'mongo', 'sql', 'mysql', 'postgres', 'schema', 'collection', 'table', 'query'],
    authentication: ['auth', 'login', 'signup', 'jwt', 'token', 'session', 'password', 'user', 'register'],
    api: ['api', 'rest', 'endpoint', 'request', 'response', 'graphql', 'webhook'],
    deployment: ['deploy', 'hosting', 'server', 'production', 'vercel', 'heroku', 'aws', 'docker'],
    testing: ['test', 'unit', 'integration', 'jest', 'mocha', 'spec', 'coverage'],
  };

  const validationReport = requirements.map((req) => {
    // If valid URL provided but no description, give benefit of doubt
    if (hasValidUrl && !text) {
      return {
        requirement: req.text,
        matched: true,
        confidence: 70,
        evidence: "Code repository provided - review the submitted link to verify",
      };
    }

    // If no submission at all, mark as pending review
    if (!hasSubmission) {
      return {
        requirement: req.text,
        matched: false,
        confidence: 0,
        evidence: "No submission provided - manual review required",
      };
    }

    // Extract key words from requirement
    const reqWords = req.text.toLowerCase().split(/\s+/);
    const meaningfulWords = reqWords.filter(
      w => w.length > 3 && !['the', 'and', 'for', 'with', 'from', 'that', 'this', 'will', 'should', 'must', 'have', 'been'].includes(w)
    );

    // Check for direct keyword matches
    const directMatches = meaningfulWords.filter(word => text.includes(word));
    
    // Check for category-based matches
    const categoryMatches = req.category && categoryKeywords[req.category] 
      ? categoryKeywords[req.category].filter(keyword => text.includes(keyword))
      : [];

    const totalMatches = directMatches.length + categoryMatches.length;
    const matched = totalMatches > 0;
    
    // Calculate confidence based on match quality
    let confidence = 50; // Base confidence
    if (directMatches.length >= 2) confidence = 75;
    else if (directMatches.length === 1) confidence = 65;
    else if (categoryMatches.length >= 2) confidence = 60;
    else if (categoryMatches.length === 1) confidence = 55;
    
    // Build evidence string
    let evidence = "";
    if (directMatches.length > 0) {
      evidence = `Found keywords: ${directMatches.slice(0, 3).join(', ')}`;
    } else if (categoryMatches.length > 0) {
      evidence = `Related to ${req.category}: ${categoryMatches.slice(0, 2).join(', ')}`;
    } else {
      evidence = "No clear evidence in submission - manual review required";
    }

    return {
      requirement: req.text,
      matched: matched,
      confidence: matched ? confidence : 40,
      evidence: evidence,
    };
  });

  const matchedCount = validationReport.filter(r => r.matched).length;
  const overallScore = hasSubmission 
    ? Math.round((matchedCount / requirements.length) * 100)
    : 50; // Default score when no description provided

  const feedback = !hasSubmission
    ? "AI validation unavailable. Please manually review the submission."
    : hasValidUrl && !text
    ? "Code repository submitted. Click the link to review the implementation and verify all requirements are met."
    : overallScore >= 70
    ? "Most requirements appear to be addressed based on submission description"
    : overallScore >= 40
    ? "Some requirements may need review - client should verify implementation"
    : "Manual review recommended - submission description may be incomplete";

  return {
    overallScore,
    validationReport,
    feedback,
    missingItems: hasSubmission 
      ? validationReport.filter(r => !r.matched).map(r => r.requirement)
      : ["Manual review required"],
    strengths: hasValidUrl && !text
      ? ["Code repository submitted", "Ready for client review"]
      : validationReport.filter(r => r.matched).map(r => r.requirement),
  };
}
