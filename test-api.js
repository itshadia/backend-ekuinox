const axios = require('axios');

const BASE_URL = 'http://localhost:5001/api';
const HEALTH_URL = 'http://localhost:5001/health';

// API Test Suite
class APITester {
  constructor() {
    this.results = [];
    this.token = null;
    this.adminToken = null;
  }

  log(message, status = 'info') {
    const timestamp = new Date().toISOString();
    const emoji = status === 'success' ? '✅' : status === 'error' ? '❌' : '📋';
    console.log(`${emoji} [${timestamp}] ${message}`);
  }

  async test(name, testFunction) {
    try {
      this.log(`Testing: ${name}`, 'info');
      const result = await testFunction();
      this.log(`${name} - SUCCESS`, 'success');
      this.results.push({ name, status: 'success', result });
      return result;
    } catch (error) {
      this.log(`${name} - ERROR: ${error.message}`, 'error');
      this.results.push({ name, status: 'error', error: error.message });
      return null;
    }
  }

  async testHealthEndpoint() {
    return await this.test('Health Endpoint', async () => {
      const response = await axios.get(HEALTH_URL);
      console.log('Health Response:', JSON.stringify(response.data, null, 2));
      return response.data;
    });
  }

  async testUserRegistration() {
    return await this.test('User Registration', async () => {
      const payload = {
        name: 'Test User',
        email: 'testuser@example.com',
        password: 'Test123!',
        confirmPassword: 'Test123!',
        phone: '+1234567890'
      };
      
      const response = await axios.post(`${BASE_URL}/auth/register`, payload);
      console.log('Registration Response:', JSON.stringify(response.data, null, 2));
      
      if (response.data.token) {
        this.token = response.data.token;
        this.log(`Token received: ${this.token.substring(0, 20)}...`);
      }
      
      return response.data;
    });
  }

  async testUserLogin() {
    return await this.test('User Login', async () => {
      const payload = {
        email: 'testuser@example.com',
        password: 'Test123!'
      };
      
      const response = await axios.post(`${BASE_URL}/auth/login`, payload);
      console.log('Login Response:', JSON.stringify(response.data, null, 2));
      
      if (response.data.token) {
        this.token = response.data.token;
        this.log(`Login token received: ${this.token.substring(0, 20)}...`);
      }
      
      return response.data;
    });
  }

  async testGetProfile() {
    if (!this.token) {
      this.log('No token available, skipping profile test', 'error');
      return null;
    }

    return await this.test('Get User Profile', async () => {
      const response = await axios.get(`${BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${this.token}` }
      });
      console.log('Profile Response:', JSON.stringify(response.data, null, 2));
      return response.data;
    });
  }

  async testGetProducts() {
    return await this.test('Get Products', async () => {
      const response = await axios.get(`${BASE_URL}/products?page=1&limit=5`);
      console.log('Products Response:', JSON.stringify(response.data, null, 2));
      return response.data;
    });
  }

  async testCreateProduct() {
    if (!this.token) {
      this.log('No token available, skipping create product test', 'error');
      return null;
    }

    return await this.test('Create Product', async () => {
      const payload = {
        name: 'API Test Product',
        description: 'Product created via API test',
        category: 'Electronics',
        subcategory: 'Smartphones',
        brand: 'TestBrand',
        price: 299.99,
        comparePrice: 399.99,
        costPrice: 150.00,
        sku: 'API-TEST-001',
        quantity: 50,
        status: 'active',
        tags: ['api', 'test', 'demo'],
        images: [{
          url: 'https://via.placeholder.com/400x400.png',
          alt: 'Test Product Image',
          isPrimary: true
        }]
      };
      
      const response = await axios.post(`${BASE_URL}/products`, payload, {
        headers: { Authorization: `Bearer ${this.token}` }
      });
      console.log('Create Product Response:', JSON.stringify(response.data, null, 2));
      return response.data;
    });
  }

  async testAdminInit() {
    return await this.test('Admin Initialization', async () => {
      const response = await axios.post(`${BASE_URL}/admin/init`);
      console.log('Admin Init Response:', JSON.stringify(response.data, null, 2));
      return response.data;
    });
  }

  async testAdminLogin() {
    return await this.test('Admin Login', async () => {
      const payload = {
        email: 'admin@ekuinox.com',
        password: 'admin123'
      };
      
      const response = await axios.post(`${BASE_URL}/auth/login`, payload);
      console.log('Admin Login Response:', JSON.stringify(response.data, null, 2));
      
      if (response.data.token) {
        this.adminToken = response.data.token;
        this.log(`Admin token received: ${this.adminToken.substring(0, 20)}...`);
      }
      
      return response.data;
    });
  }

  async testAdminDashboard() {
    if (!this.adminToken) {
      this.log('No admin token available, skipping dashboard test', 'error');
      return null;
    }

    return await this.test('Admin Dashboard', async () => {
      const response = await axios.get(`${BASE_URL}/admin/dashboard`, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });
      console.log('Dashboard Response:', JSON.stringify(response.data, null, 2));
      return response.data;
    });
  }

  async testGetCountries() {
    return await this.test('Get Countries', async () => {
      const response = await axios.get(`${BASE_URL}/countries`);
      console.log('Countries Response:', JSON.stringify(response.data, null, 2));
      return response.data;
    });
  }

  async runAllTests() {
    console.log('\n🚀 Starting Ekuinox Backend API Tests...');
    console.log('===========================================\n');

    // Run tests in sequence
    await this.testHealthEndpoint();
    await this.testUserRegistration();
    
    // If registration failed, try login
    if (!this.token) {
      await this.testUserLogin();
    }
    
    await this.testGetProfile();
    await this.testGetProducts();
    await this.testCreateProduct();
    await this.testGetCountries();
    await this.testAdminInit();
    await this.testAdminLogin();
    await this.testAdminDashboard();

    // Print summary
    console.log('\n===========================================');
    console.log('📊 Test Results Summary:');
    console.log('===========================================');
    
    const successful = this.results.filter(r => r.status === 'success').length;
    const failed = this.results.filter(r => r.status === 'error').length;
    
    console.log(`✅ Successful: ${successful}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📊 Total: ${this.results.length}`);
    
    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.results.filter(r => r.status === 'error').forEach(test => {
        console.log(`  - ${test.name}: ${test.error}`);
      });
    }
    
    console.log('\n🎉 API Testing Complete!');
  }
}

// Run the tests
const tester = new APITester();
tester.runAllTests().catch(error => {
  console.error('Test runner error:', error.message);
  process.exit(1);
});