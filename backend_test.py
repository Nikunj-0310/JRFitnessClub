#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for Fitness Manager
Tests all authentication, user management, fee collection, and dashboard endpoints
"""

import requests
import json
import base64
from datetime import datetime, timedelta
import uuid
import sys

# Configuration
BASE_URL = "https://fit-user-manager.preview.emergentagent.com/api"
AUTH_USERNAME = "admin"
AUTH_PASSWORD = "password123"

class FitnessManagerAPITester:
    def __init__(self):
        self.base_url = BASE_URL
        self.auth = (AUTH_USERNAME, AUTH_PASSWORD)
        self.test_users = []
        self.test_fees = []
        self.results = {
            "passed": 0,
            "failed": 0,
            "errors": []
        }
    
    def log_result(self, test_name, success, message=""):
        if success:
            self.results["passed"] += 1
            print(f"✅ {test_name}: PASSED {message}")
        else:
            self.results["failed"] += 1
            self.results["errors"].append(f"{test_name}: {message}")
            print(f"❌ {test_name}: FAILED - {message}")
    
    def test_authentication(self):
        """Test authentication endpoints"""
        print("\n=== Testing Authentication ===")
        
        # Test login endpoint
        try:
            response = requests.post(f"{self.base_url}/auth/login", auth=self.auth)
            if response.status_code == 200:
                data = response.json()
                if "message" in data and data["message"] == "Login successful":
                    self.log_result("POST /auth/login", True, "Login successful")
                else:
                    self.log_result("POST /auth/login", False, f"Unexpected response: {data}")
            else:
                self.log_result("POST /auth/login", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_result("POST /auth/login", False, f"Exception: {str(e)}")
        
        # Test verify endpoint
        try:
            response = requests.get(f"{self.base_url}/auth/verify", auth=self.auth)
            if response.status_code == 200:
                data = response.json()
                if data.get("authenticated") == True and data.get("username") == AUTH_USERNAME:
                    self.log_result("GET /auth/verify", True, "Authentication verified")
                else:
                    self.log_result("GET /auth/verify", False, f"Unexpected response: {data}")
            else:
                self.log_result("GET /auth/verify", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_result("GET /auth/verify", False, f"Exception: {str(e)}")
        
        # Test invalid credentials
        try:
            response = requests.post(f"{self.base_url}/auth/login", auth=("wrong", "credentials"))
            if response.status_code == 401:
                self.log_result("POST /auth/login (invalid creds)", True, "Correctly rejected invalid credentials")
            else:
                self.log_result("POST /auth/login (invalid creds)", False, f"Should return 401, got {response.status_code}")
        except Exception as e:
            self.log_result("POST /auth/login (invalid creds)", False, f"Exception: {str(e)}")
    
    def test_user_management(self):
        """Test user CRUD operations"""
        print("\n=== Testing User Management ===")
        
        # Test data for users
        test_users_data = [
            {
                "name": "Rajesh Kumar",
                "dob": "1990-05-15",
                "age": 33,
                "weight": 75.5,
                "height": 175.0,
                "aadhar": "123456789012",
                "address": "123 MG Road, Bangalore, Karnataka",
                "phone_number": "9876543210",
                "whatsapp_number": "9876543210",
                "joining_date": "2024-01-15"
            },
            {
                "name": "Priya Sharma",
                "dob": "1985-08-22",
                "age": 38,
                "weight": 62.0,
                "height": 165.0,
                "aadhar": "987654321098",
                "address": "456 Brigade Road, Bangalore, Karnataka",
                "phone_number": "8765432109",
                "whatsapp_number": "8765432109",
                "joining_date": "2024-02-01"
            },
            {
                "name": "Amit Patel",
                "dob": "1992-12-10",
                "age": 31,
                "weight": 80.0,
                "height": 180.0,
                "aadhar": "456789123456",
                "address": "789 Commercial Street, Bangalore, Karnataka",
                "phone_number": "7654321098",
                "whatsapp_number": "7654321098",
                "joining_date": "2024-01-20"
            }
        ]
        
        # Test creating users
        for i, user_data in enumerate(test_users_data):
            try:
                response = requests.post(f"{self.base_url}/users", json=user_data, auth=self.auth)
                if response.status_code == 200:
                    user = response.json()
                    if "id" in user and user["name"] == user_data["name"]:
                        self.test_users.append(user)
                        self.log_result(f"POST /users (User {i+1})", True, f"Created user: {user['name']}")
                    else:
                        self.log_result(f"POST /users (User {i+1})", False, f"Invalid response structure: {user}")
                else:
                    self.log_result(f"POST /users (User {i+1})", False, f"Status: {response.status_code}, Response: {response.text}")
            except Exception as e:
                self.log_result(f"POST /users (User {i+1})", False, f"Exception: {str(e)}")
        
        # Test getting all users
        try:
            response = requests.get(f"{self.base_url}/users", auth=self.auth)
            if response.status_code == 200:
                users = response.json()
                if isinstance(users, list) and len(users) >= len(self.test_users):
                    self.log_result("GET /users", True, f"Retrieved {len(users)} users")
                else:
                    self.log_result("GET /users", False, f"Expected list with at least {len(self.test_users)} users, got: {users}")
            else:
                self.log_result("GET /users", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_result("GET /users", False, f"Exception: {str(e)}")
        
        # Test search functionality
        if self.test_users:
            try:
                search_name = self.test_users[0]["name"].split()[0]  # First name
                response = requests.get(f"{self.base_url}/users?search={search_name}", auth=self.auth)
                if response.status_code == 200:
                    users = response.json()
                    if isinstance(users, list) and len(users) > 0:
                        found = any(search_name.lower() in user["name"].lower() for user in users)
                        if found:
                            self.log_result("GET /users (search)", True, f"Search for '{search_name}' returned {len(users)} results")
                        else:
                            self.log_result("GET /users (search)", False, f"Search didn't return expected user")
                    else:
                        self.log_result("GET /users (search)", False, f"Search returned empty or invalid result: {users}")
                else:
                    self.log_result("GET /users (search)", False, f"Status: {response.status_code}, Response: {response.text}")
            except Exception as e:
                self.log_result("GET /users (search)", False, f"Exception: {str(e)}")
        
        # Test getting single user
        if self.test_users:
            user_id = self.test_users[0]["id"]
            try:
                response = requests.get(f"{self.base_url}/users/{user_id}", auth=self.auth)
                if response.status_code == 200:
                    user = response.json()
                    if user["id"] == user_id:
                        self.log_result("GET /users/{id}", True, f"Retrieved user: {user['name']}")
                    else:
                        self.log_result("GET /users/{id}", False, f"User ID mismatch: expected {user_id}, got {user.get('id')}")
                else:
                    self.log_result("GET /users/{id}", False, f"Status: {response.status_code}, Response: {response.text}")
            except Exception as e:
                self.log_result("GET /users/{id}", False, f"Exception: {str(e)}")
        
        # Test updating user
        if self.test_users:
            user_id = self.test_users[0]["id"]
            update_data = {"weight": 77.0, "height": 176.0}
            try:
                response = requests.put(f"{self.base_url}/users/{user_id}", json=update_data, auth=self.auth)
                if response.status_code == 200:
                    user = response.json()
                    if user["weight"] == 77.0 and user["height"] == 176.0:
                        self.log_result("PUT /users/{id}", True, f"Updated user weight and height")
                    else:
                        self.log_result("PUT /users/{id}", False, f"Update not reflected: {user}")
                else:
                    self.log_result("PUT /users/{id}", False, f"Status: {response.status_code}, Response: {response.text}")
            except Exception as e:
                self.log_result("PUT /users/{id}", False, f"Exception: {str(e)}")
        
        # Test getting non-existent user
        try:
            fake_id = str(uuid.uuid4())
            response = requests.get(f"{self.base_url}/users/{fake_id}", auth=self.auth)
            if response.status_code == 404:
                self.log_result("GET /users/{id} (not found)", True, "Correctly returned 404 for non-existent user")
            else:
                self.log_result("GET /users/{id} (not found)", False, f"Should return 404, got {response.status_code}")
        except Exception as e:
            self.log_result("GET /users/{id} (not found)", False, f"Exception: {str(e)}")
    
    def test_fee_collection(self):
        """Test fee collection system"""
        print("\n=== Testing Fee Collection ===")
        
        if not self.test_users:
            self.log_result("Fee Collection Tests", False, "No test users available for fee collection tests")
            return
        
        # Test data for fee collections
        fee_collections_data = [
            {
                "user_id": self.test_users[0]["id"],
                "amount": 1500.0,
                "payment_type": "Monthly",
                "payment_date": datetime.now().strftime("%Y-%m-%d")
            },
            {
                "user_id": self.test_users[1]["id"] if len(self.test_users) > 1 else self.test_users[0]["id"],
                "amount": 15000.0,
                "payment_type": "Yearly",
                "payment_date": (datetime.now() - timedelta(days=10)).strftime("%Y-%m-%d")
            }
        ]
        
        # Test creating fee collections
        for i, fee_data in enumerate(fee_collections_data):
            try:
                response = requests.post(f"{self.base_url}/fee-collections", json=fee_data, auth=self.auth)
                if response.status_code == 200:
                    fee = response.json()
                    if "id" in fee and fee["amount"] == fee_data["amount"]:
                        self.test_fees.append(fee)
                        # Check if receipt image is generated
                        if fee.get("receipt_image") and fee["receipt_image"].startswith("data:image/png;base64,"):
                            self.log_result(f"POST /fee-collections (Fee {i+1})", True, f"Created fee collection with receipt: ₹{fee['amount']}")
                        else:
                            self.log_result(f"POST /fee-collections (Fee {i+1})", False, f"Receipt image not generated properly")
                    else:
                        self.log_result(f"POST /fee-collections (Fee {i+1})", False, f"Invalid response structure: {fee}")
                else:
                    self.log_result(f"POST /fee-collections (Fee {i+1})", False, f"Status: {response.status_code}, Response: {response.text}")
            except Exception as e:
                self.log_result(f"POST /fee-collections (Fee {i+1})", False, f"Exception: {str(e)}")
        
        # Test getting all fee collections
        try:
            response = requests.get(f"{self.base_url}/fee-collections", auth=self.auth)
            if response.status_code == 200:
                fees = response.json()
                if isinstance(fees, list) and len(fees) >= len(self.test_fees):
                    self.log_result("GET /fee-collections", True, f"Retrieved {len(fees)} fee collections")
                else:
                    self.log_result("GET /fee-collections", False, f"Expected list with at least {len(self.test_fees)} fees, got: {fees}")
            else:
                self.log_result("GET /fee-collections", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_result("GET /fee-collections", False, f"Exception: {str(e)}")
        
        # Test getting fee collections by user_id
        if self.test_users and self.test_fees:
            user_id = self.test_users[0]["id"]
            try:
                response = requests.get(f"{self.base_url}/fee-collections?user_id={user_id}", auth=self.auth)
                if response.status_code == 200:
                    fees = response.json()
                    if isinstance(fees, list):
                        user_fees = [f for f in fees if f["user_id"] == user_id]
                        if len(user_fees) > 0:
                            self.log_result("GET /fee-collections (by user_id)", True, f"Retrieved {len(user_fees)} fees for user")
                        else:
                            self.log_result("GET /fee-collections (by user_id)", False, f"No fees found for user {user_id}")
                    else:
                        self.log_result("GET /fee-collections (by user_id)", False, f"Invalid response: {fees}")
                else:
                    self.log_result("GET /fee-collections (by user_id)", False, f"Status: {response.status_code}, Response: {response.text}")
            except Exception as e:
                self.log_result("GET /fee-collections (by user_id)", False, f"Exception: {str(e)}")
        
        # Test getting single fee collection
        if self.test_fees:
            fee_id = self.test_fees[0]["id"]
            try:
                response = requests.get(f"{self.base_url}/fee-collections/{fee_id}", auth=self.auth)
                if response.status_code == 200:
                    fee = response.json()
                    if fee["id"] == fee_id:
                        self.log_result("GET /fee-collections/{id}", True, f"Retrieved fee collection: ₹{fee['amount']}")
                    else:
                        self.log_result("GET /fee-collections/{id}", False, f"Fee ID mismatch: expected {fee_id}, got {fee.get('id')}")
                else:
                    self.log_result("GET /fee-collections/{id}", False, f"Status: {response.status_code}, Response: {response.text}")
            except Exception as e:
                self.log_result("GET /fee-collections/{id}", False, f"Exception: {str(e)}")
        
        # Test creating fee collection for non-existent user
        try:
            fake_user_id = str(uuid.uuid4())
            fee_data = {
                "user_id": fake_user_id,
                "amount": 1000.0,
                "payment_type": "Monthly",
                "payment_date": datetime.now().strftime("%Y-%m-%d")
            }
            response = requests.post(f"{self.base_url}/fee-collections", json=fee_data, auth=self.auth)
            if response.status_code == 404:
                self.log_result("POST /fee-collections (invalid user)", True, "Correctly rejected fee collection for non-existent user")
            else:
                self.log_result("POST /fee-collections (invalid user)", False, f"Should return 404, got {response.status_code}")
        except Exception as e:
            self.log_result("POST /fee-collections (invalid user)", False, f"Exception: {str(e)}")
    
    def test_user_status(self):
        """Test user status calculation"""
        print("\n=== Testing User Status ===")
        
        if not self.test_users:
            self.log_result("User Status Tests", False, "No test users available for status tests")
            return
        
        # Test getting user status
        for i, user in enumerate(self.test_users):
            try:
                response = requests.get(f"{self.base_url}/users/{user['id']}/status", auth=self.auth)
                if response.status_code == 200:
                    status = response.json()
                    required_fields = ["user_id", "status"]
                    if all(field in status for field in required_fields):
                        self.log_result(f"GET /users/{user['id']}/status", True, f"Status: {status['status']}")
                    else:
                        self.log_result(f"GET /users/{user['id']}/status", False, f"Missing required fields: {status}")
                else:
                    self.log_result(f"GET /users/{user['id']}/status", False, f"Status: {response.status_code}, Response: {response.text}")
            except Exception as e:
                self.log_result(f"GET /users/{user['id']}/status", False, f"Exception: {str(e)}")
        
        # Test status for non-existent user
        try:
            fake_id = str(uuid.uuid4())
            response = requests.get(f"{self.base_url}/users/{fake_id}/status", auth=self.auth)
            if response.status_code == 404:
                self.log_result("GET /users/{id}/status (not found)", True, "Correctly returned 404 for non-existent user")
            else:
                self.log_result("GET /users/{id}/status (not found)", False, f"Should return 404, got {response.status_code}")
        except Exception as e:
            self.log_result("GET /users/{id}/status (not found)", False, f"Exception: {str(e)}")
    
    def test_dashboard_stats(self):
        """Test dashboard statistics"""
        print("\n=== Testing Dashboard Statistics ===")
        
        try:
            response = requests.get(f"{self.base_url}/dashboard/stats", auth=self.auth)
            if response.status_code == 200:
                stats = response.json()
                required_fields = ["total_users", "active_users", "inactive_users", "deactivated_users", "recent_collections"]
                if all(field in stats for field in required_fields):
                    # Verify the numbers make sense
                    total = stats["active_users"] + stats["inactive_users"] + stats["deactivated_users"]
                    if total <= stats["total_users"]:  # Allow for some users without status
                        self.log_result("GET /dashboard/stats", True, f"Stats: {stats['total_users']} total, {stats['active_users']} active, {stats['recent_collections']} recent collections")
                    else:
                        self.log_result("GET /dashboard/stats", False, f"Status counts don't add up correctly: {stats}")
                else:
                    self.log_result("GET /dashboard/stats", False, f"Missing required fields: {stats}")
            else:
                self.log_result("GET /dashboard/stats", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_result("GET /dashboard/stats", False, f"Exception: {str(e)}")
    
    def test_delete_operations(self):
        """Test delete operations (cleanup)"""
        print("\n=== Testing Delete Operations ===")
        
        # Delete test users (this will also delete associated fee collections)
        for i, user in enumerate(self.test_users):
            try:
                response = requests.delete(f"{self.base_url}/users/{user['id']}", auth=self.auth)
                if response.status_code == 200:
                    result = response.json()
                    if "message" in result:
                        self.log_result(f"DELETE /users/{user['id']}", True, f"Deleted user: {user['name']}")
                    else:
                        self.log_result(f"DELETE /users/{user['id']}", False, f"Unexpected response: {result}")
                else:
                    self.log_result(f"DELETE /users/{user['id']}", False, f"Status: {response.status_code}, Response: {response.text}")
            except Exception as e:
                self.log_result(f"DELETE /users/{user['id']}", False, f"Exception: {str(e)}")
        
        # Test deleting non-existent user
        try:
            fake_id = str(uuid.uuid4())
            response = requests.delete(f"{self.base_url}/users/{fake_id}", auth=self.auth)
            if response.status_code == 404:
                self.log_result("DELETE /users/{id} (not found)", True, "Correctly returned 404 for non-existent user")
            else:
                self.log_result("DELETE /users/{id} (not found)", False, f"Should return 404, got {response.status_code}")
        except Exception as e:
            self.log_result("DELETE /users/{id} (not found)", False, f"Exception: {str(e)}")
    
    def run_all_tests(self):
        """Run all test suites"""
        print(f"🚀 Starting Fitness Manager API Tests")
        print(f"📍 Base URL: {self.base_url}")
        print(f"🔐 Authentication: {AUTH_USERNAME}/{'*' * len(AUTH_PASSWORD)}")
        
        # Run test suites in order
        self.test_authentication()
        self.test_user_management()
        self.test_fee_collection()
        self.test_user_status()
        self.test_dashboard_stats()
        self.test_delete_operations()
        
        # Print summary
        print(f"\n{'='*50}")
        print(f"📊 TEST SUMMARY")
        print(f"{'='*50}")
        print(f"✅ Passed: {self.results['passed']}")
        print(f"❌ Failed: {self.results['failed']}")
        print(f"📈 Success Rate: {(self.results['passed'] / (self.results['passed'] + self.results['failed']) * 100):.1f}%")
        
        if self.results['errors']:
            print(f"\n🔍 FAILED TESTS:")
            for error in self.results['errors']:
                print(f"   • {error}")
        
        return self.results['failed'] == 0

if __name__ == "__main__":
    tester = FitnessManagerAPITester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)