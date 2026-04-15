# Manual Testing Checklist for Freelancer App

## 🔧 Prerequisites
- [ ] MongoDB is running
- [ ] Backend server is running (npm run dev)
- [ ] Frontend server is running (npm run dev)
- [ ] OPENAI_API_KEY is set in .env

---

## 1️⃣ Backend API Tests

### Test Authentication
```bash
# Register Client
curl -X POST http://localhost:8097/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"client@test.com\",\"password\":\"test123\",\"role\":\"client\"}"

# Register Freelancer
curl -X POST http://localhost:8097/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"freelancer@test.com\",\"password\":\"test123\",\"role\":\"freelancer\"}"

# Login Client
curl -X POST http://localhost:8097/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"client@test.com\",\"password\":\"test123\"}"

# Save the token from response
```

### Test Project Creation with AI
```bash
# Create Project (replace YOUR_TOKEN)
curl -X POST http://localhost:8097/api/projects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_CLIENT_TOKEN" \
  -d "{
    \"title\":\"E-commerce Website\",
    \"budget\":50000,
    \"description\":\"Build a full-stack e-commerce platform with user authentication, product catalog with search, shopping cart functionality, payment integration using Stripe, and an admin dashboard for managing products and orders\"
  }"

# Expected: AI extracts 5-7 requirements with categories and priorities
```

### Test Client Dashboard
```bash
# Get Client Dashboard
curl -X GET http://localhost:8097/api/projects/client-dashboard \
  -H "Authorization: Bearer YOUR_CLIENT_TOKEN"

# Expected: Returns projects with AI-extracted requirements
```

### Test Freelancer Dashboard
```bash
# Get Freelancer Dashboard
curl -X GET http://localhost:8097/api/projects/freelancer-dashboard \
  -H "Authorization: Bearer YOUR_FREELANCER_TOKEN"

# Expected: Returns assigned projects
```

### Test Work Submission with AI Validation
```bash
# Submit Work (replace PROJECT_ID and TOKEN)
curl -X PUT http://localhost:8097/api/projects/PROJECT_ID/submit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_FREELANCER_TOKEN" \
  -d "{
    \"submissionUrl\":\"https://github.com/test/project\",
    \"submissionDescription\":\"I have implemented user authentication with JWT, created the product catalog with search functionality, built the shopping cart with local storage, and integrated Stripe payment gateway\"
  }"

# Expected: AI validation report with score, strengths, missing items
```

### Test AI Progress Suggestions
```bash
# Get AI Suggestions (replace PROJECT_ID and TOKEN)
curl -X GET http://localhost:8097/api/projects/PROJECT_ID/progress-suggestions \
  -H "Authorization: Bearer YOUR_FREELANCER_TOKEN"

# Expected: Next steps, time estimate, risk assessment
```

### Test Requirement Status Update
```bash
# Update Requirement Status (replace PROJECT_ID, REQ_ID, TOKEN)
curl -X PATCH http://localhost:8097/api/projects/PROJECT_ID/requirements/REQ_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_FREELANCER_TOKEN" \
  -d "{\"status\":\"completed\"}"

# Expected: Requirement status updated
```

---

## 2️⃣ Frontend UI Tests

### Client Workflow Test
1. **Login as Client**
   - [ ] Navigate to http://localhost:5173
   - [ ] Login with client@test.com / test123
   - [ ] Should redirect to /client dashboard

2. **Create New Project**
   - [ ] Click "New Project" button
   - [ ] Fill in title: "Test Project"
   - [ ] Fill in budget: 25000
   - [ ] Fill in description (detailed, 100+ characters)
   - [ ] Click "Create"
   - [ ] Should see success message about AI extraction
   - [ ] Should reload dashboard with new project

3. **View Project Details**
   - [ ] Click "View" on the project
   - [ ] Should see modal with project info
   - [ ] Should see "Project Requirements" section
   - [ ] Each requirement should show:
     - Status badge (pending/in-progress/completed)
     - Category
     - Priority (high/medium/low)
   - [ ] Should see description field

4. **Check AI Features**
   - [ ] Requirements should be auto-extracted
   - [ ] Should see 3-8 requirements
   - [ ] Each has category and priority
   - [ ] Categories like: frontend, backend, authentication, api, etc.

### Freelancer Workflow Test
1. **Login as Freelancer**
   - [ ] Logout from client
   - [ ] Login with freelancer@test.com / test123
   - [ ] Should redirect to /freelancer dashboard

2. **View Assigned Project**
   - [ ] Should see project assigned by client
   - [ ] Should see progress bar (0% initially)
   - [ ] Should see "Requirements" section
   - [ ] Click "Show All" to expand requirements

3. **Update Requirement Status**
   - [ ] For each requirement, change status dropdown
   - [ ] Set first requirement to "in-progress"
   - [ ] Progress bar should update
   - [ ] Set first requirement to "completed"
   - [ ] Progress bar should increase
   - [ ] Color coding should change (gray → yellow → green)

4. **Get AI Suggestions**
   - [ ] Click "🤖 Get AI Progress Suggestions"
   - [ ] Should show loading state
   - [ ] Should display suggestions panel with:
     - Next steps (2-3 items)
     - Estimated time
     - Risk assessment (low/medium/high)
   - [ ] Suggestions should be relevant to remaining requirements

5. **Submit Work**
   - [ ] Fill in submission description (detailed)
   - [ ] Paste a URL (GitHub/Drive link)
   - [ ] Click "Submit Work (AI will validate)"
   - [ ] Should show alert with:
     - AI Validation Score (0-100%)
     - Feedback message
   - [ ] Status should change to "submitted"
   - [ ] Should show AI score in status section

### Back to Client - Review Submission
1. **Check Validation Report**
   - [ ] Login as client again
   - [ ] Click "View" on submitted project
   - [ ] Should see "🤖 AI Validation Score" section
   - [ ] Should show percentage with color coding:
     - Green: ≥70%
     - Yellow: 40-69%
     - Red: <40%
   - [ ] Should see AI feedback quote
   - [ ] Should see "✅ Strengths" section (green)
   - [ ] Should see "⚠️ Missing/Unclear" section (red)
   - [ ] Should see "📊 Detailed Validation Report"
   - [ ] Each requirement shows:
     - Matched/Missing status
     - Evidence explanation
     - Confidence percentage

2. **Release Payment**
   - [ ] If satisfied, click "Approve & Release Payment"
   - [ ] Should show success message
   - [ ] Project status should change to "completed"
   - [ ] Should show "Payment Released ✔"

---

## 3️⃣ Edge Cases & Error Handling

### Test Without OpenAI Key
- [ ] Remove OPENAI_API_KEY from .env temporarily
- [ ] Restart backend
- [ ] Create project → Should use fallback (keyword extraction)
- [ ] Submit work → Should use fallback (simple matching)
- [ ] No crashes, app continues working

### Test With Invalid Data
- [ ] Try creating project with very short description (< 10 chars)
- [ ] Should get appropriate error or fallback
- [ ] Try submitting without URL
- [ ] Should show validation error

### Test Concurrent Users
- [ ] Open two browsers
- [ ] Login as client in one, freelancer in other
- [ ] Create project as client
- [ ] Should appear immediately in freelancer dashboard
- [ ] Update status as freelancer
- [ ] Should reflect in client view

### Test Network Errors
- [ ] Disconnect internet briefly
- [ ] Try AI operations
- [ ] Should show error gracefully
- [ ] Reconnect and retry
- [ ] Should work again

---

## 4️⃣ Performance Tests

### AI Response Times
- [ ] Requirement extraction: Should complete in 3-8 seconds
- [ ] Validation: Should complete in 4-10 seconds
- [ ] Suggestions: Should complete in 2-6 seconds
- [ ] All should show loading indicators

### Database Operations
- [ ] Create 5 projects rapidly
- [ ] All should save correctly
- [ ] Dashboard should load quickly (<2s)

---

## 5️⃣ Data Validation

### Check MongoDB Data
```javascript
// In MongoDB shell or Compass
db.projects.findOne()

// Should have structure:
{
  title: String,
  budget: Number,
  description: String,
  requirements: [
    {
      text: String,
      category: String,  // NEW
      priority: String,  // NEW
      status: String,
      verified: Boolean
    }
  ],
  validationReport: [
    {
      requirement: String,
      matched: Boolean,
      confidence: Number,  // NEW
      evidence: String     // NEW
    }
  ],
  overallScore: Number,      // NEW
  aiFeedback: String,        // NEW
  aiMissingItems: [String],  // NEW
  aiStrengths: [String]      // NEW
}
```

---

## ✅ Success Criteria

All tests should pass:
- [ ] Authentication works
- [ ] Projects can be created
- [ ] AI extracts requirements automatically
- [ ] Requirements have categories and priorities
- [ ] Freelancer can update requirement statuses
- [ ] Progress bar updates correctly
- [ ] AI suggestions are generated
- [ ] Work submission triggers AI validation
- [ ] Validation report is comprehensive (score, evidence, confidence)
- [ ] Strengths and missing items are identified
- [ ] Client can review and approve
- [ ] Payment release works
- [ ] Fallback works without OpenAI key
- [ ] No console errors
- [ ] No crashes

---

## 📊 Expected Results Summary

### Good AI Validation Score (70-100%)
- Most requirements matched
- Detailed evidence provided
- Clear strengths identified
- Minor or no missing items

### Medium AI Validation Score (40-69%)
- Some requirements matched
- Mixed evidence
- Both strengths and gaps identified
- Recommendations for improvement

### Low AI Validation Score (0-39%)
- Few requirements matched
- Missing critical features
- More gaps than strengths
- Needs significant work

---

## 🐛 Common Issues & Solutions

### Issue: "AI validation unavailable"
**Solution:** Check OPENAI_API_KEY in .env

### Issue: "Failed to extract requirements"
**Solution:** Ensure description is detailed (20+ characters)

### Issue: Requirements not showing
**Solution:** Check if project has 'description' field and AI extracted successfully

### Issue: Progress bar stuck at 0%
**Solution:** Update at least one requirement status to "completed"

### Issue: Validation score is 0%
**Solution:** Provide detailed submission description, not just URL

---

## 📝 Notes
- AI responses may vary slightly between runs (that's normal)
- Scores are estimates based on text analysis
- More detailed descriptions = better AI analysis
- Test with realistic project data for best results
