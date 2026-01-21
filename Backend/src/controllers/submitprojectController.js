import validateSubmission from "../utils/validateSubmission.js";

const validationReport = validateSubmission(
  project.requirements,
  submissionDescription
);

project.validationReport = validationReport;
project.status = "submitted";
project.submittedAt = new Date();

await project.save();
