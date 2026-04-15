const DEFAULT_ML_SERVICE_URL = "http://127.0.0.1:8001";

function getMlServiceUrl() {
  return process.env.ML_SERVICE_URL || DEFAULT_ML_SERVICE_URL;
}

async function postWithTimeout(url, body, timeoutMs = 2500) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`ML service responded with ${response.status}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

export async function getProjectMlIntelligence(project) {
  const serviceUrl = getMlServiceUrl();

  try {
    const projectData = typeof project?.toObject === "function" ? project.toObject() : JSON.parse(JSON.stringify(project));
    return await postWithTimeout(`${serviceUrl}/predict`, { project: projectData });
  } catch (error) {
    console.warn("ML intelligence fallback:", error.message);
    return null;
  }
}
