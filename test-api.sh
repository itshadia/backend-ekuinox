#!/bin/bash

# Ekuinox Backend API Testing Script
# This script tests all API endpoints with sample payloads

BASE_URL="http://localhost:5001/api"
HEALTH_URL="http://localhost:5001/health"

echo "🚀 Starting Ekuinox Backend API Tests..."
echo "Base URL: $BASE_URL"
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print test results
print_test() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
    fi
}

# Test 1: Health Check
echo -e "\n${BLUE}1️⃣ Testing Health Endpoint${NC}"
HEALTH_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" "$HEALTH_URL")
HTTP_CODE=$(echo $HEALTH_RESPONSE | grep -o "HTTPSTATUS:.*" | cut -d: -f2)
HEALTH_BODY=$(echo $HEALTH_RESPONSE | sed 's/HTTPSTATUS:.*//')

if [ "$HTTP_CODE" = "200" ]; then
    print_test 0 "Health check passed"
    echo "$HEALTH_BODY" | jq . 2>/dev/null || echo "$HEALTH_BODY"
else
    print_test 1 "Health check failed (HTTP $HTTP_CODE)"
fi

# Test 2: User Registration
echo -e "\n${BLUE}2️⃣ Testing User Registration${NC}"
REGISTER_PAYLOAD='{
  "name": "Test User",
  "email": "testuser@example.com",
  "password": "Test123!",
  "confirmPassword": "Test123!",
  "phone": "+1234567890"
}'

REGISTER_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "$REGISTER_PAYLOAD")

HTTP_CODE=$(echo $REGISTER_RESPONSE | grep -o "HTTPSTATUS:.*" | cut -d: -f2)
REGISTER_BODY=$(echo $REGISTER_RESPONSE | sed 's/HTTPSTATUS:.*//')

if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "200" ]; then
    print_test 0 "User registration successful"
    echo "$REGISTER_BODY" | jq . 2>/dev/null || echo "$REGISTER_BODY"
    
    # Extract token for future tests
    TOKEN=$(echo "$REGISTER_BODY" | jq -r '.token // empty' 2>/dev/null)
    if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
        echo -e "${YELLOW}⚠️ No token received, will test login instead${NC}"
    fi
else
    print_test 1 "User registration failed (HTTP $HTTP_CODE)"
    echo "$REGISTER_BODY"
fi

# Test 3: User Login (if registration failed or no token)
if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
    echo -e "\n${BLUE}3️⃣ Testing User Login${NC}"
    LOGIN_PAYLOAD='{
      "email": "testuser@example.com",
      "password": "Test123!"
    }'
    
    LOGIN_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" -X POST "$BASE_URL/auth/login" \
      -H "Content-Type: application/json" \
      -d "$LOGIN_PAYLOAD")
    
    HTTP_CODE=$(echo $LOGIN_RESPONSE | grep -o "HTTPSTATUS:.*" | cut -d: -f2)
    LOGIN_BODY=$(echo $LOGIN_RESPONSE | sed 's/HTTPSTATUS:.*//')
    
    if [ "$HTTP_CODE" = "200" ]; then
        print_test 0 "User login successful"
        echo "$LOGIN_BODY" | jq . 2>/dev/null || echo "$LOGIN_BODY"
        TOKEN=$(echo "$LOGIN_BODY" | jq -r '.token // empty' 2>/dev/null)
    else
        print_test 1 "User login failed (HTTP $HTTP_CODE)"
        echo "$LOGIN_BODY"
    fi
fi

# Test 4: Get User Profile (Protected Route)
if [ ! -z "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
    echo -e "\n${BLUE}4️⃣ Testing Get User Profile (Protected)${NC}"
    PROFILE_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" -X GET "$BASE_URL/auth/me" \
      -H "Authorization: Bearer $TOKEN")
    
    HTTP_CODE=$(echo $PROFILE_RESPONSE | grep -o "HTTPSTATUS:.*" | cut -d: -f2)
    PROFILE_BODY=$(echo $PROFILE_RESPONSE | sed 's/HTTPSTATUS:.*//')
    
    if [ "$HTTP_CODE" = "200" ]; then
        print_test 0 "Get user profile successful"
        echo "$PROFILE_BODY" | jq . 2>/dev/null || echo "$PROFILE_BODY"
    else
        print_test 1 "Get user profile failed (HTTP $HTTP_CODE)"
        echo "$PROFILE_BODY"
    fi
fi

# Test 5: Get Products (Public)
echo -e "\n${BLUE}5️⃣ Testing Get Products (Public)${NC}"
PRODUCTS_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" -X GET "$BASE_URL/products?page=1&limit=5")

HTTP_CODE=$(echo $PRODUCTS_RESPONSE | grep -o "HTTPSTATUS:.*" | cut -d: -f2)
PRODUCTS_BODY=$(echo $PRODUCTS_RESPONSE | sed 's/HTTPSTATUS:.*//')

if [ "$HTTP_CODE" = "200" ]; then
    print_test 0 "Get products successful"
    echo "$PRODUCTS_BODY" | jq . 2>/dev/null || echo "$PRODUCTS_BODY"
else
    print_test 1 "Get products failed (HTTP $HTTP_CODE)"
    echo "$PRODUCTS_BODY"
fi

# Test 6: Create Product (Admin Required)
if [ ! -z "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
    echo -e "\n${BLUE}6️⃣ Testing Create Product (Admin Required)${NC}"
    PRODUCT_PAYLOAD='{
      "name": "Test Product",
      "description": "This is a test product created via API",
      "category": "Electronics",
      "subcategory": "Smartphones",
      "brand": "TestBrand",
      "price": 299.99,
      "comparePrice": 399.99,
      "costPrice": 150.00,
      "sku": "TEST-001",
      "quantity": 50,
      "status": "active",
      "tags": ["test", "api", "demo"],
      "images": [
        {
          "url": "https://via.placeholder.com/400x400.png",
          "alt": "Test Product Image",
          "isPrimary": true
        }
      ]
    }'
    
    CREATE_PRODUCT_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" -X POST "$BASE_URL/products" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $TOKEN" \
      -d "$PRODUCT_PAYLOAD")
    
    HTTP_CODE=$(echo $CREATE_PRODUCT_RESPONSE | grep -o "HTTPSTATUS:.*" | cut -d: -f2)
    CREATE_PRODUCT_BODY=$(echo $CREATE_PRODUCT_RESPONSE | sed 's/HTTPSTATUS:.*//')
    
    if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "200" ]; then
        print_test 0 "Create product successful"
        echo "$CREATE_PRODUCT_BODY" | jq . 2>/dev/null || echo "$CREATE_PRODUCT_BODY"
        
        # Extract product ID for further tests
        PRODUCT_ID=$(echo "$CREATE_PRODUCT_BODY" | jq -r '.data._id // empty' 2>/dev/null)
    else
        print_test 1 "Create product failed (HTTP $HTTP_CODE) - This is expected if user is not admin"
        echo "$CREATE_PRODUCT_BODY"
    fi
fi

# Test 7: Get Countries
echo -e "\n${BLUE}7️⃣ Testing Get Countries${NC}"
COUNTRIES_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" -X GET "$BASE_URL/countries")

HTTP_CODE=$(echo $COUNTRIES_RESPONSE | grep -o "HTTPSTATUS:.*" | cut -d: -f2)
COUNTRIES_BODY=$(echo $COUNTRIES_RESPONSE | sed 's/HTTPSTATUS:.*//')

if [ "$HTTP_CODE" = "200" ]; then
    print_test 0 "Get countries successful"
    echo "$COUNTRIES_BODY" | jq . 2>/dev/null || echo "$COUNTRIES_BODY"
else
    print_test 1 "Get countries failed (HTTP $HTTP_CODE)"
    echo "$COUNTRIES_BODY"
fi

# Test 8: Create Country (Admin Required)
if [ ! -z "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
    echo -e "\n${BLUE}8️⃣ Testing Create Country (Admin Required)${NC}"
    COUNTRY_PAYLOAD='{
      "name": "Test Country",
      "code": "TC",
      "currency": "USD",
      "timezone": "UTC"
    }'
    
    CREATE_COUNTRY_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" -X POST "$BASE_URL/countries" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $TOKEN" \
      -d "$COUNTRY_PAYLOAD")
    
    HTTP_CODE=$(echo $CREATE_COUNTRY_RESPONSE | grep -o "HTTPSTATUS:.*" | cut -d: -f2)
    CREATE_COUNTRY_BODY=$(echo $CREATE_COUNTRY_RESPONSE | sed 's/HTTPSTATUS:.*//')
    
    if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "200" ]; then
        print_test 0 "Create country successful"
        echo "$CREATE_COUNTRY_BODY" | jq . 2>/dev/null || echo "$CREATE_COUNTRY_BODY"
    else
        print_test 1 "Create country failed (HTTP $HTTP_CODE) - This is expected if user is not admin"
        echo "$CREATE_COUNTRY_BODY"
    fi
fi

# Test 9: Initialize Admin (One-time setup)
echo -e "\n${BLUE}9️⃣ Testing Admin Initialization${NC}"
ADMIN_INIT_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" -X POST "$BASE_URL/admin/init")

HTTP_CODE=$(echo $ADMIN_INIT_RESPONSE | grep -o "HTTPSTATUS:.*" | cut -d: -f2)
ADMIN_INIT_BODY=$(echo $ADMIN_INIT_RESPONSE | sed 's/HTTPSTATUS:.*//')

if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "200" ]; then
    print_test 0 "Admin initialization successful"
    echo "$ADMIN_INIT_BODY" | jq . 2>/dev/null || echo "$ADMIN_INIT_BODY"
elif [ "$HTTP_CODE" = "400" ]; then
    print_test 0 "Admin already exists (expected)"
    echo "$ADMIN_INIT_BODY" | jq . 2>/dev/null || echo "$ADMIN_INIT_BODY"
else
    print_test 1 "Admin initialization failed (HTTP $HTTP_CODE)"
    echo "$ADMIN_INIT_BODY"
fi

# Test 10: Login as Admin
echo -e "\n${BLUE}🔟 Testing Admin Login${NC}"
ADMIN_LOGIN_PAYLOAD='{
  "email": "admin@ekuinox.com",
  "password": "admin123"
}'

ADMIN_LOGIN_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "$ADMIN_LOGIN_PAYLOAD")

HTTP_CODE=$(echo $ADMIN_LOGIN_RESPONSE | grep -o "HTTPSTATUS:.*" | cut -d: -f2)
ADMIN_LOGIN_BODY=$(echo $ADMIN_LOGIN_RESPONSE | sed 's/HTTPSTATUS:.*//')

if [ "$HTTP_CODE" = "200" ]; then
    print_test 0 "Admin login successful"
    echo "$ADMIN_LOGIN_BODY" | jq . 2>/dev/null || echo "$ADMIN_LOGIN_BODY"
    ADMIN_TOKEN=$(echo "$ADMIN_LOGIN_BODY" | jq -r '.token // empty' 2>/dev/null)
else
    print_test 1 "Admin login failed (HTTP $HTTP_CODE)"
    echo "$ADMIN_LOGIN_BODY"
fi

# Test 11: Admin Dashboard (Admin Required)
if [ ! -z "$ADMIN_TOKEN" ] && [ "$ADMIN_TOKEN" != "null" ]; then
    echo -e "\n${BLUE}1️⃣1️⃣ Testing Admin Dashboard${NC}"
    DASHBOARD_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" -X GET "$BASE_URL/admin/dashboard" \
      -H "Authorization: Bearer $ADMIN_TOKEN")
    
    HTTP_CODE=$(echo $DASHBOARD_RESPONSE | grep -o "HTTPSTATUS:.*" | cut -d: -f2)
    DASHBOARD_BODY=$(echo $DASHBOARD_RESPONSE | sed 's/HTTPSTATUS:.*//')
    
    if [ "$HTTP_CODE" = "200" ]; then
        print_test 0 "Admin dashboard successful"
        echo "$DASHBOARD_BODY" | jq . 2>/dev/null || echo "$DASHBOARD_BODY"
    else
        print_test 1 "Admin dashboard failed (HTTP $HTTP_CODE)"
        echo "$DASHBOARD_BODY"
    fi
fi

echo -e "\n${GREEN}================================================${NC}"
echo -e "${GREEN}✅ API Testing Complete!${NC}"
echo -e "${GREEN}================================================${NC}"

echo -e "\n${YELLOW}📋 Summary:${NC}"
echo "- Health endpoint tested"
echo "- User registration and login tested"  
echo "- Protected routes tested"
echo "- Product management tested"
echo "- Country management tested"
echo "- Admin initialization tested"
echo "- Admin dashboard tested"

echo -e "\n${BLUE}🔗 Available endpoints:${NC}"
echo "Health: http://localhost:5001/health"
echo "API Base: http://localhost:5001/api"
echo "Swagger Docs (if available): http://localhost:5001/docs"