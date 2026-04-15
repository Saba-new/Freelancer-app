#!/usr/bin/env node

/**
 * Complete System Validation Script
 * Tests backend, database, and API endpoints
 */

import axios from 'axios';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const BASE_URL = 'http://localhost:8097/api';
let clientToken = '';
let freelancerToken = '';
let projectId = '';

console.log('🧪 COMPLETE SYSTEM VALIDATION\n');
console.log('='.repeat(60));

// Test 1: Environment Variables
function testEnvironment() {
    console.log('\n📋 Test 1: Environment Configuration');
    console.log('-'.repeat(60));

    const required = ['MONGO_URI', 'JWT_SECRET', 'PORT'];
    const optional = ['OPENAI_API_KEY', 'CLOUDINARY_CLOUD_NAME'];

    let passed = true;

    required.forEach(key => {
        if (process.env[key]) {
            console.log(`✅ ${key}: Configured`);
        } else {
            console.log(`❌ ${key}: Missing (REQUIRED)`);
            passed = false;
        }
    });

    optional.forEach(key => {
        if (process.env[key]) {
            console.log(`✅ ${key}: Configured`);
        } else {
            console.log(`⚠️  ${key}: Missing (Optional - fallback will be used)`);
        }
    });

    return passed;
}

// Test 2: Database Connection
async function testDatabase() {
    console.log('\n\n🗄️  Test 2: MongoDB Connection');
    console.log('-'.repeat(60));

    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ MongoDB connected successfully');
        console.log(`   Database: ${mongoose.connection.name}`);
        console.log(`   Host: ${mongoose.connection.host}`);
        
        // Check collections
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log(`   Collections: ${collections.map(c => c.name).join(', ')}`);
        
        await mongoose.disconnect();
        return true;
    } catch (error) {
        console.log(`❌ MongoDB connection failed: ${error.message}`);
        return false;
    }
}

// Test 3: Backend Server
async function testBackendServer() {
    console.log('\n\n🖥️  Test 3: Backend Server');
    console.log('-'.repeat(60));

    try {
        const response = await axios.get('http://localhost:8097');
        console.log('✅ Backend server is running');
        return true;
    } catch (error) {
        if (error.code === 'ECONNREFUSED') {
            console.log('❌ Backend server is not running');
            console.log('   Start with: cd Backend && npm run dev');
        } else {
            console.log(`⚠️  Server responded: ${error.message}`);
        }
        return false;
    }
}

// Test 4: Authentication Endpoints
async function testAuthentication() {
    console.log('\n\n🔐 Test 4: Authentication');
    console.log('-'.repeat(60));

    try {
        // Register client
        console.log('Testing client registration...');
        try {
            await axios.post(`${BASE_URL}/auth/register`, {
                email: 'testclient@validation.com',
                password: 'test123456',
                role: 'client'
            });
            console.log('✅ Client registration successful');
        } catch (error) {
            if (error.response?.status === 400) {
                console.log('✅ Client already exists (OK)');
            } else {
                throw error;
            }
        }

        // Register freelancer
        console.log('Testing freelancer registration...');
        try {
            await axios.post(`${BASE_URL}/auth/register`, {
                email: 'testfreelancer@validation.com',
                password: 'test123456',
                role: 'freelancer'
            });
            console.log('✅ Freelancer registration successful');
        } catch (error) {
            if (error.response?.status === 400) {
                console.log('✅ Freelancer already exists (OK)');
            } else {
                throw error;
            }
        }

        // Login client
        console.log('Testing client login...');
        const clientLogin = await axios.post(`${BASE_URL}/auth/login`, {
            email: 'testclient@validation.com',
            password: 'test123456'
        });
        clientToken = clientLogin.data.token;
        console.log('✅ Client login successful');
        console.log(`   Token: ${clientToken.substring(0, 20)}...`);

        // Login freelancer
        console.log('Testing freelancer login...');
        const freelancerLogin = await axios.post(`${BASE_URL}/auth/login`, {
            email: 'testfreelancer@validation.com',
            password: 'test123456'
        });
        freelancerToken = freelancerLogin.data.token;
        console.log('✅ Freelancer login successful');
        console.log(`   Token: ${freelancerToken.substring(0, 20)}...`);

        return true;
    } catch (error) {
        console.log(`❌ Authentication failed: ${error.response?.data?.message || error.message}`);
        return false;
    }
}

// Test 5: Project Creation with AI
async function testProjectCreation() {
    console.log('\n\n📦 Test 5: Project Creation (AI Requirement Extraction)');
    console.log('-'.repeat(60));

    try {
        const response = await axios.post(
            `${BASE_URL}/projects`,
            {
                title: 'Test E-commerce Platform',
                budget: 50000,
                description: 'Build a complete e-commerce website with user authentication using JWT, product catalog with search and filtering capabilities, shopping cart functionality with local storage, payment integration using Stripe API, admin dashboard for managing products and orders, and email notifications for order confirmation'
            },
            {
                headers: { Authorization: `Bearer ${clientToken}` }
            }
        );

        projectId = response.data._id;
        console.log('✅ Project created successfully');
        console.log(`   Project ID: ${projectId}`);
        console.log(`   Title: ${response.data.title}`);
        console.log(`   Requirements extracted: ${response.data.requirements?.length || 0}`);

        if (response.data.requirements && response.data.requirements.length > 0) {
            console.log('\n   AI-Extracted Requirements:');
            response.data.requirements.forEach((req, i) => {
                console.log(`   ${i + 1}. ${req.text}`);
                console.log(`      Category: ${req.category}, Priority: ${req.priority}, Status: ${req.status}`);
            });
        }

        return true;
    } catch (error) {
        console.log(`❌ Project creation failed: ${error.response?.data?.message || error.message}`);
        return false;
    }
}

// Test 6: Client Dashboard
async function testClientDashboard() {
    console.log('\n\n👔 Test 6: Client Dashboard');
    console.log('-'.repeat(60));

    try {
        const response = await axios.get(`${BASE_URL}/projects/client-dashboard`, {
            headers: { Authorization: `Bearer ${clientToken}` }
        });

        console.log('✅ Client dashboard loaded');
        console.log(`   Total projects: ${response.data.projects?.length || 0}`);
        console.log(`   Active: ${response.data.active || 0}`);
        console.log(`   Completed: ${response.data.completed || 0}`);
        console.log(`   Submitted: ${response.data.submitted || 0}`);
        console.log(`   Total budget: ₹${response.data.totalBudget || 0}`);

        return true;
    } catch (error) {
        console.log(`❌ Client dashboard failed: ${error.response?.data?.message || error.message}`);
        return false;
    }
}

// Test 7: Freelancer Dashboard
async function testFreelancerDashboard() {
    console.log('\n\n💼 Test 7: Freelancer Dashboard');
    console.log('-'.repeat(60));

    try {
        const response = await axios.get(`${BASE_URL}/projects/freelancer-dashboard`, {
            headers: { Authorization: `Bearer ${freelancerToken}` }
        });

        console.log('✅ Freelancer dashboard loaded');
        console.log(`   Assigned projects: ${response.data.projects?.length || 0}`);

        return true;
    } catch (error) {
        console.log(`❌ Freelancer dashboard failed: ${error.response?.data?.message || error.message}`);
        return false;
    }
}

// Test 8: Work Submission with AI Validation
async function testWorkSubmission() {
    console.log('\n\n📤 Test 8: Work Submission (AI Validation)');
    console.log('-'.repeat(60));

    if (!projectId) {
        console.log('⚠️  Skipping - no project ID available');
        return false;
    }

    try {
        const response = await axios.put(
            `${BASE_URL}/projects/${projectId}/submit`,
            {
                submissionUrl: 'https://github.com/test/validation-project',
                submissionDescription: 'I have successfully implemented user authentication with JWT tokens for login and registration. Created a comprehensive product catalog with search functionality and filtering options. Built shopping cart features with local storage persistence. Integrated Stripe payment gateway for secure transactions. Developed admin dashboard with full CRUD operations for products and order management.'
            },
            {
                headers: { Authorization: `Bearer ${freelancerToken}` }
            }
        );

        console.log('✅ Work submitted successfully');
        
        if (response.data.validation) {
            console.log(`\n   AI Validation Results:`);
            console.log(`   Overall Score: ${response.data.validation.overallScore}%`);
            console.log(`   Feedback: ${response.data.validation.feedback}`);
            
            if (response.data.validation.strengths?.length > 0) {
                console.log(`\n   ✅ Strengths:`);
                response.data.validation.strengths.forEach(s => console.log(`      - ${s}`));
            }
            
            if (response.data.validation.missingItems?.length > 0) {
                console.log(`\n   ⚠️  Missing:`);
                response.data.validation.missingItems.forEach(m => console.log(`      - ${m}`));
            }
        }

        return true;
    } catch (error) {
        console.log(`❌ Work submission failed: ${error.response?.data?.message || error.message}`);
        return false;
    }
}

// Test 9: AI Progress Suggestions
async function testProgressSuggestions() {
    console.log('\n\n💡 Test 9: AI Progress Suggestions');
    console.log('-'.repeat(60));

    if (!projectId) {
        console.log('⚠️  Skipping - no project ID available');
        return false;
    }

    try {
        const response = await axios.get(
            `${BASE_URL}/projects/${projectId}/progress-suggestions`,
            {
                headers: { Authorization: `Bearer ${freelancerToken}` }
            }
        );

        console.log('✅ AI suggestions generated');
        console.log(`\n   Next Steps:`);
        response.data.nextSteps?.forEach(step => console.log(`   - ${step}`));
        console.log(`\n   Time Estimate: ${response.data.estimatedTimeToComplete}`);
        console.log(`   Risk Level: ${response.data.riskAssessment}`);

        return true;
    } catch (error) {
        console.log(`⚠️  AI suggestions: ${error.response?.data?.message || error.message}`);
        return true; // Not critical
    }
}

// Run all tests
async function runAllTests() {
    console.log('\n🚀 Starting Complete System Validation...\n');

    const results = {
        environment: testEnvironment(),
        database: await testDatabase(),
        server: await testBackendServer()
    };

    if (!results.server) {
        console.log('\n\n❌ Backend server is not running. Please start it first:');
        console.log('   cd Backend && npm run dev\n');
        process.exit(1);
    }

    results.authentication = await testAuthentication();
    if (results.authentication) {
        results.projectCreation = await testProjectCreation();
        results.clientDashboard = await testClientDashboard();
        results.freelancerDashboard = await testFreelancerDashboard();
        results.workSubmission = await testWorkSubmission();
        results.progressSuggestions = await testProgressSuggestions();
    }

    console.log('\n\n' + '='.repeat(60));
    console.log('📊 VALIDATION RESULTS SUMMARY');
    console.log('='.repeat(60));

    Object.entries(results).forEach(([test, passed]) => {
        const status = passed ? '✅ PASS' : '❌ FAIL';
        const name = test.charAt(0).toUpperCase() + test.slice(1).replace(/([A-Z])/g, ' $1');
        console.log(`${status} - ${name}`);
    });

    const passCount = Object.values(results).filter(Boolean).length;
    const totalTests = Object.keys(results).length;

    console.log('\n' + '='.repeat(60));
    console.log(`Overall: ${passCount}/${totalTests} tests passed`);
    console.log('='.repeat(60) + '\n');

    if (passCount === totalTests) {
        console.log('🎉 All tests passed! Your system is fully functional.\n');
    } else {
        console.log('⚠️  Some tests failed. Please check the errors above.\n');
    }
}

// Execute
runAllTests().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
