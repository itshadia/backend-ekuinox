const http = require('http');
const https = require('https');

// Simple HTTP client for testing
class SimpleHTTPClient {
  static request(options, data = null) {
    return new Promise((resolve, reject) => {
      const protocol = options.url.startsWith('https') ? https : http;
      
      const urlObj = new URL(options.url);
      const requestOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      };

      if (data && (options.method === 'POST' || options.method === 'PUT')) {
        const postData = JSON.stringify(data);
        requestOptions.headers['Content-Length'] = Buffer.byteLength(postData);
      }

      const req = protocol.request(requestOptions, (res) => {
        let body = '';
        res.setEncoding('utf8');
        
        res.on('data', (chunk) => {
          body += chunk;
        });
        
        res.on('end', () => {
          try {
            const response = {
              status: res.statusCode,
              headers: res.headers,
              data: body ? JSON.parse(body) : null
            };
            resolve(response);
          } catch (error) {
            resolve({
              status: res.statusCode,
              headers: res.headers,
              data: body,
              error: 'Invalid JSON response'
            });
          }
        });
      });

      req.on('error', (error) => {
        reject(new Error(`Request failed: ${error.message}`));
      });

      if (data && (options.method === 'POST' || options.method === 'PUT')) {
        req.write(JSON.stringify(data));
      }

      req.end();
    });
  }

  static get(url, headers = {}) {
    return this.request({ url, method: 'GET', headers });
  }

  static post(url, data, headers = {}) {
    return this.request({ url, method: 'POST', headers }, data);
  }

  static put(url, data, headers = {}) {
    return this.request({ url, method: 'PUT', headers }, data);
  }
}

// API Tester Class
class APITester {
  constructor() {
    this.baseURL = 'http://localhost:5001/api';
    this.healthURL = 'http://localhost:5001/health';
    this.token = null;
    this.adminToken = null;
    this.results = [];
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString().substring(11, 19);
    const emoji = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : '📋';
    console.log(`${emoji} [${timestamp}] ${message}`);
  }

  async runTest(testName, testFunction) {
    try {
      this.log(`Running: ${testName}`);
      const result = await testFunction();
      
      if (result && result.status >= 200 && result.status < 300) {
        this.log(`${testName} - SUCCESS (${result.status})`, 'success');
        this.results.push({ name: testName, status: 'success', httpStatus: result.status });
        return result;
      } else {
        this.log(`${testName} - FAILED (${result?.status || 'No response'})`, 'error');
        this.results.push({ name: testName, status: 'failed', httpStatus: result?.status });
        return result;
      }
    } catch (error) {
      this.log(`${testName} - ERROR: ${error.message}`, 'error');
      this.results.push({ name: testName, status: 'error', error: error.message });
      return null;
    }
  }

  async testHealth() {
    return await this.runTest('Health Check', async () => {
      const response = await SimpleHTTPClient.get(this.healthURL);
      console.log('Health Response:', JSON.stringify(response.data, null, 2));
      return response;
    });
  }

  async testUserRegistration() {
    return await this.runTest('User Registration', async () => {
      const userData = {
        name: 'API Test User',
        email: 'apitest@example.com',
        password: 'Test123!',
        confirmPassword: 'Test123!',
        phone: '+1234567890'
      };
      
      const response = await SimpleHTTPClient.post(`${this.baseURL}/auth/register`, userData);
      console.log('Registration Response:', JSON.stringify(response.data, null, 2));
      
      if (response.data && response.data.token) {
        this.token = response.data.token;
        this.log(`Token received: ${this.token.substring(0, 30)}...`);
      }
      
      return response;
    });
  }

  async testUserLogin() {
    return await this.runTest('User Login', async () => {
      const loginData = {
        email: 'apitest@example.com',
        password: 'Test123!'
      };
      
      const response = await SimpleHTTPClient.post(`${this.baseURL}/auth/login`, loginData);
      console.log('Login Response:', JSON.stringify(response.data, null, 2));
      
      if (response.data && response.data.token) {
        this.token = response.data.token;
        this.log(`Login token received: ${this.token.substring(0, 30)}...`);
      }
      
      return response;
    });
  }

  async testGetProfile() {
    if (!this.token) {
      this.log('No token available for profile test', 'warning');
      return null;
    }

    return await this.runTest('Get User Profile', async () => {
      const response = await SimpleHTTPClient.get(`${this.baseURL}/auth/me`, {
        'Authorization': `Bearer ${this.token}`
      });
      console.log('Profile Response:', JSON.stringify(response.data, null, 2));
      return response;
    });
  }

  async testGetProducts() {
    return await this.runTest('Get Products', async () => {
      const response = await SimpleHTTPClient.get(`${this.baseURL}/products?page=1&limit=3`);
      console.log('Products Response:', JSON.stringify(response.data, null, 2));
      return response;
    });
  }

  async testCreateProduct() {
    if (!this.token) {
      this.log('No token available for create product test', 'warning');
      return null;
    }

    return await this.runTest('Create Product', async () => {
      const productData = {
        name: 'API Test Product',
        description: 'This product was created via API test',
        category: 'Electronics',
        price: 199.99,
        quantity: 25,
        sku: 'API-TEST-PROD-001',
        status: 'active'
      };
      
      const response = await SimpleHTTPClient.post(`${this.baseURL}/products`, productData, {
        'Authorization': `Bearer ${this.token}`
      });
      console.log('Create Product Response:', JSON.stringify(response.data, null, 2));
      return response;
    });
  }

  async testAdminInit() {
    return await this.runTest('Admin Initialization', async () => {
      const response = await SimpleHTTPClient.post(`${this.baseURL}/admin/init`, {});
      console.log('Admin Init Response:', JSON.stringify(response.data, null, 2));
      return response;
    });
  }

  async testAdminLogin() {
    return await this.runTest('Admin Login', async () => {
      const adminData = {
        email: 'admin@ekuinox.com',
        password: 'admin123'
      };
      
      const response = await SimpleHTTPClient.post(`${this.baseURL}/auth/login`, adminData);
      console.log('Admin Login Response:', JSON.stringify(response.data, null, 2));
      
      if (response.data && response.data.token) {
        this.adminToken = response.data.token;
        this.log(`Admin token received: ${this.adminToken.substring(0, 30)}...`);
      }
      
      return response;
    });
  }

  async testAdminDashboard() {
    if (!this.adminToken) {
      this.log('No admin token available for dashboard test', 'warning');
      return null;
    }

    return await this.runTest('Admin Dashboard', async () => {
      const response = await SimpleHTTPClient.get(`${this.baseURL}/admin/dashboard`, {
        'Authorization': `Bearer ${this.adminToken}`
      });
      console.log('Dashboard Response:', JSON.stringify(response.data, null, 2));
      return response;
    });
  }

  async testGetCountries() {
    return await this.runTest('Get Countries', async () => {
      const response = await SimpleHTTPClient.get(`${this.baseURL}/countries`);
      console.log('Countries Response:', JSON.stringify(response.data, null, 2));
      return response;
    });
  }

  printSummary() {
    console.log('\n' + '='.repeat(50));
    console.log('📊 API TEST SUMMARY');
    console.log('='.repeat(50));
    
    const successful = this.results.filter(r => r.status === 'success').length;
    const failed = this.results.filter(r => r.status === 'failed').length;
    const errors = this.results.filter(r => r.status === 'error').length;
    
    console.log(`✅ Successful Tests: ${successful}`);
    console.log(`❌ Failed Tests: ${failed}`);
    console.log(`🚨 Error Tests: ${errors}`);
    console.log(`📊 Total Tests: ${this.results.length}`);
    
    if (failed > 0 || errors > 0) {
      console.log('\n📋 Failed/Error Details:');
      this.results.filter(r => r.status !== 'success').forEach(result => {
        console.log(`  - ${result.name}: ${result.error || `HTTP ${result.httpStatus}`}`);
      });
    }
    
    console.log('\n🎉 Testing Complete!');
    console.log('Server running at: http://localhost:5001');
    console.log('API Base URL: http://localhost:5001/api');
  }

  async runAllTests() {
    console.log('🚀 Starting Ekuinox Backend API Tests');
    console.log('Server: http://localhost:5001');
    console.log('Started at:', new Date().toISOString());
    console.log('='.repeat(50));

    // Run all tests
    await this.testHealth();
    await this.testUserRegistration();
    
    // If registration failed (user exists), try login
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

    this.printSummary();
  }
}

// Run the tests
console.log('🔍 Initializing API Tester...');

// Give server time to start if needed
setTimeout(async () => {
  const tester = new APITester();
  try {
    await tester.runAllTests();
  } catch (error) {
    console.error('❌ Test runner failed:', error.message);
    process.exit(1);
  }
}, 1000);