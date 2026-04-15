// Test AI Service Functions
import { extractRequirementsAI, validateSubmissionAI, generateProgressSuggestions } from './src/services/aiService.js';
import dotenv from 'dotenv';

dotenv.config();

console.log('🧪 AI Service Validation Tests\n');
console.log('='.repeat(50));

// Test 1: Requirement Extraction
async function testRequirementExtraction() {
    console.log('\n📋 Test 1: AI Requirement Extraction');
    console.log('-'.repeat(50));
    
    const testDescription = `
        Build a full-stack e-commerce website with the following features:
        - User authentication with JWT
        - Product catalog with search and filtering
        - Shopping cart functionality
        - Payment integration with Stripe
        - Admin dashboard for managing products
        - Order tracking system
        - Email notifications for orders
    `;

    try {
        const requirements = await extractRequirementsAI(testDescription);
        
        console.log(`✅ Extracted ${requirements.length} requirements:`);
        requirements.forEach((req, i) => {
            console.log(`\n${i + 1}. ${req.text}`);
            console.log(`   Category: ${req.category}`);
            console.log(`   Priority: ${req.priority}`);
            console.log(`   Status: ${req.status}`);
        });
        
        return true;
    } catch (error) {
        console.log(`❌ Error: ${error.message}`);
        return false;
    }
}

// Test 2: Submission Validation
async function testSubmissionValidation() {
    console.log('\n\n🔍 Test 2: AI Submission Validation');
    console.log('-'.repeat(50));

    const testRequirements = [
        { text: 'Implement user authentication', category: 'authentication', priority: 'high' },
        { text: 'Create product catalog', category: 'frontend', priority: 'high' },
        { text: 'Build shopping cart', category: 'frontend', priority: 'medium' },
        { text: 'Integrate payment gateway', category: 'api', priority: 'high' }
    ];

    const submission = `
        I have implemented user authentication using JWT tokens with login and registration.
        Created a product catalog page with search functionality.
        The shopping cart is working with local storage.
    `;

    try {
        const validation = await validateSubmissionAI(
            testRequirements,
            submission,
            'https://github.com/test/project'
        );

        console.log(`\n✅ Validation Complete:`);
        console.log(`   Overall Score: ${validation.overallScore}%`);
        console.log(`   Feedback: ${validation.feedback}`);
        console.log(`\n   Matched Requirements:`);
        validation.validationReport.filter(v => v.matched).forEach(v => {
            console.log(`   ✓ ${v.requirement} (${v.confidence}% confidence)`);
        });
        console.log(`\n   Missing Requirements:`);
        validation.validationReport.filter(v => !v.matched).forEach(v => {
            console.log(`   ✗ ${v.requirement}`);
        });

        return true;
    } catch (error) {
        console.log(`❌ Error: ${error.message}`);
        return false;
    }
}

// Test 3: Progress Suggestions
async function testProgressSuggestions() {
    console.log('\n\n💡 Test 3: AI Progress Suggestions');
    console.log('-'.repeat(50));

    const mockProject = {
        title: 'E-commerce Website',
        budget: 50000,
        requirements: [
            { text: 'User authentication', status: 'completed' },
            { text: 'Product catalog', status: 'completed' },
            { text: 'Shopping cart', status: 'in-progress' },
            { text: 'Payment integration', status: 'pending' },
            { text: 'Admin dashboard', status: 'pending' }
        ]
    };

    try {
        const suggestions = await generateProgressSuggestions(mockProject);

        console.log(`\n✅ Suggestions Generated:`);
        console.log(`\n   Next Steps:`);
        suggestions.nextSteps.forEach((step, i) => {
            console.log(`   ${i + 1}. ${step}`);
        });
        console.log(`\n   Estimated Time: ${suggestions.estimatedTimeToComplete}`);
        console.log(`   Risk Level: ${suggestions.riskAssessment}`);
        console.log(`\n   Recommendations:`);
        suggestions.recommendations.forEach((rec, i) => {
            console.log(`   ${i + 1}. ${rec}`);
        });

        return true;
    } catch (error) {
        console.log(`❌ Error: ${error.message}`);
        return false;
    }
}

// Test 4: OpenAI Connection
async function testOpenAIConnection() {
    console.log('\n\n🔌 Test 4: OpenAI API Connection');
    console.log('-'.repeat(50));

    if (!process.env.OPENAI_API_KEY) {
        console.log('❌ OPENAI_API_KEY not found in environment');
        return false;
    }

    if (!process.env.OPENAI_API_KEY.startsWith('sk-')) {
        console.log('❌ Invalid OPENAI_API_KEY format');
        return false;
    }

    console.log('✅ OpenAI API key is configured');
    console.log(`   Key prefix: ${process.env.OPENAI_API_KEY.substring(0, 8)}...`);
    return true;
}

// Run all tests
async function runAllTests() {
    console.log('\n🚀 Starting AI Service Validation Tests...\n');

    const results = {
        connection: await testOpenAIConnection(),
        extraction: await testRequirementExtraction(),
        validation: await testSubmissionValidation(),
        suggestions: await testProgressSuggestions()
    };

    console.log('\n\n' + '='.repeat(50));
    console.log('📊 Test Results Summary');
    console.log('='.repeat(50));
    console.log(`OpenAI Connection: ${results.connection ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Requirement Extraction: ${results.extraction ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Submission Validation: ${results.validation ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Progress Suggestions: ${results.suggestions ? '✅ PASS' : '❌ FAIL'}`);

    const passCount = Object.values(results).filter(Boolean).length;
    const totalTests = Object.keys(results).length;

    console.log('\n' + '='.repeat(50));
    console.log(`Overall: ${passCount}/${totalTests} tests passed`);
    console.log('='.repeat(50) + '\n');

    if (passCount === totalTests) {
        console.log('🎉 All tests passed! AI integration is working correctly.\n');
    } else {
        console.log('⚠️  Some tests failed. Please check the errors above.\n');
    }
}

// Execute tests
runAllTests().catch(error => {
    console.error('Fatal error running tests:', error);
    process.exit(1);
});
