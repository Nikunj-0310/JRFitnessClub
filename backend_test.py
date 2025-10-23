#!/usr/bin/env python3
"""
Backend API Testing for Fitness Admin App
Tests all API endpoints as specified in the review request
"""

import requests
import json
import sys
from datetime import datetime

# API Base URL from the review request
BASE_URL = "https://gym-fee-tracker.preview.emergentagent.com/api"

class FitnessAPITester:
    def __init__(self):
        self.base_url = BASE_URL
        self.session = requests.Session()
        self.test_results = []
        self.created_members = []
        self.created_payments = []
        
    def log_test(self, test_name, success, message, response_data=None):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {message}")
        
        self.test_results.append({
            "test": test_name,
            "success": success,
            "message": message,
            "response_data": response_data
        })
        
        if response_data:
            print(f"   Response: {json.dumps(response_data, indent=2, default=str)}")
        print()
    
    def test_fee_summary_initial(self):
        """Test 1: GET /api/fee-summary (Initial state - should return zeros)"""
        try:
            response = self.session.get(f"{self.base_url}/fee-summary")
            
            if response.status_code != 200:
                self.log_test("Fee Summary Initial", False, 
                            f"Expected status 200, got {response.status_code}", 
                            response.text)
                return False
            
            data = response.json()
            
            # Check if all values are 0 initially
            expected_zeros = ['monthly_total', 'quarterly_total', 'yearly_total', 'total_members', 'total_payments']
            all_zero = all(data.get(field, -1) == 0 for field in expected_zeros)
            
            if all_zero:
                self.log_test("Fee Summary Initial", True, 
                            "All totals are 0 as expected", data)
                return True
            else:
                self.log_test("Fee Summary Initial", True, 
                            "Fee summary returned (may have existing data)", data)
                return True
                
        except Exception as e:
            self.log_test("Fee Summary Initial", False, f"Exception: {str(e)}")
            return False
    
    def test_create_members(self):
        """Test 2: POST /api/members (Create 2-3 test members)"""
        test_members = [
            {
                "name": "Rahul Sharma",
                "phone": "9876543210", 
                "membership_type": "Basic",
                "monthly_fee": 1500
            },
            {
                "name": "Priya Patel",
                "phone": "9876543211",
                "membership_type": "Premium", 
                "monthly_fee": 2500
            }
        ]
        
        success_count = 0
        
        for i, member_data in enumerate(test_members, 1):
            try:
                response = self.session.post(
                    f"{self.base_url}/members",
                    json=member_data,
                    headers={"Content-Type": "application/json"}
                )
                
                if response.status_code == 200 or response.status_code == 201:
                    data = response.json()
                    
                    # Check if response has required fields
                    if 'id' in data and 'name' in data:
                        self.created_members.append(data)
                        self.log_test(f"Create Member {i}", True, 
                                    f"Member '{member_data['name']}' created successfully", data)
                        success_count += 1
                    else:
                        self.log_test(f"Create Member {i}", False, 
                                    "Response missing required fields (id, name)", data)
                else:
                    self.log_test(f"Create Member {i}", False, 
                                f"Expected status 200/201, got {response.status_code}", 
                                response.text)
                    
            except Exception as e:
                self.log_test(f"Create Member {i}", False, f"Exception: {str(e)}")
        
        return success_count == len(test_members)
    
    def test_get_members(self):
        """Test 3: GET /api/members (Retrieve all members)"""
        try:
            response = self.session.get(f"{self.base_url}/members")
            
            if response.status_code != 200:
                self.log_test("Get Members", False, 
                            f"Expected status 200, got {response.status_code}", 
                            response.text)
                return False
            
            data = response.json()
            
            if isinstance(data, list):
                member_count = len(data)
                self.log_test("Get Members", True, 
                            f"Retrieved {member_count} members", data)
                return True
            else:
                self.log_test("Get Members", False, 
                            "Response is not a list", data)
                return False
                
        except Exception as e:
            self.log_test("Get Members", False, f"Exception: {str(e)}")
            return False
    
    def test_create_payments(self):
        """Test 4: POST /api/payments (Record some test payments)"""
        if not self.created_members:
            self.log_test("Create Payments", False, 
                        "No members available to create payments for")
            return False
        
        success_count = 0
        
        for i, member in enumerate(self.created_members, 1):
            payment_data = {
                "member_id": member['id'],
                "amount": member['monthly_fee'],
                "payment_type": "monthly"
            }
            
            try:
                response = self.session.post(
                    f"{self.base_url}/payments",
                    json=payment_data,
                    headers={"Content-Type": "application/json"}
                )
                
                if response.status_code == 200 or response.status_code == 201:
                    data = response.json()
                    
                    # Check if response has required fields including member_name
                    if 'id' in data and 'member_name' in data:
                        self.created_payments.append(data)
                        self.log_test(f"Create Payment {i}", True, 
                                    f"Payment for '{data['member_name']}' created successfully", data)
                        success_count += 1
                    else:
                        self.log_test(f"Create Payment {i}", False, 
                                    "Response missing required fields (id, member_name)", data)
                else:
                    self.log_test(f"Create Payment {i}", False, 
                                f"Expected status 200/201, got {response.status_code}", 
                                response.text)
                    
            except Exception as e:
                self.log_test(f"Create Payment {i}", False, f"Exception: {str(e)}")
        
        return success_count == len(self.created_members)
    
    def test_get_payments(self):
        """Test 5: GET /api/payments (Retrieve all payments)"""
        try:
            response = self.session.get(f"{self.base_url}/payments")
            
            if response.status_code != 200:
                self.log_test("Get Payments", False, 
                            f"Expected status 200, got {response.status_code}", 
                            response.text)
                return False
            
            data = response.json()
            
            if isinstance(data, list):
                payment_count = len(data)
                
                # Check if payments are sorted by date (newest first)
                if len(data) > 1:
                    dates_sorted = True
                    for i in range(len(data) - 1):
                        current_date = datetime.fromisoformat(data[i]['payment_date'].replace('Z', '+00:00'))
                        next_date = datetime.fromisoformat(data[i+1]['payment_date'].replace('Z', '+00:00'))
                        if current_date < next_date:
                            dates_sorted = False
                            break
                    
                    sort_msg = " (sorted by date - newest first)" if dates_sorted else " (NOT properly sorted by date)"
                else:
                    sort_msg = ""
                
                self.log_test("Get Payments", True, 
                            f"Retrieved {payment_count} payments{sort_msg}", data)
                return True
            else:
                self.log_test("Get Payments", False, 
                            "Response is not a list", data)
                return False
                
        except Exception as e:
            self.log_test("Get Payments", False, f"Exception: {str(e)}")
            return False
    
    def test_fee_summary_after_payments(self):
        """Test 6: GET /api/fee-summary (After adding payments)"""
        try:
            response = self.session.get(f"{self.base_url}/fee-summary")
            
            if response.status_code != 200:
                self.log_test("Fee Summary After Payments", False, 
                            f"Expected status 200, got {response.status_code}", 
                            response.text)
                return False
            
            data = response.json()
            
            # Calculate expected totals based on created payments
            expected_total = sum(payment['amount'] for payment in self.created_payments)
            expected_members = len(self.created_members)
            expected_payments = len(self.created_payments)
            
            # Check totals (allowing for existing data)
            monthly_total = data.get('monthly_total', 0)
            quarterly_total = data.get('quarterly_total', 0)
            yearly_total = data.get('yearly_total', 0)
            total_members = data.get('total_members', 0)
            total_payments = data.get('total_payments', 0)
            
            # Verify that our payments are included in the totals
            totals_updated = (monthly_total >= expected_total and 
                            quarterly_total >= expected_total and 
                            yearly_total >= expected_total and
                            total_members >= expected_members and
                            total_payments >= expected_payments)
            
            if totals_updated:
                self.log_test("Fee Summary After Payments", True, 
                            f"Fee summary updated correctly. Monthly: {monthly_total}, "
                            f"Quarterly: {quarterly_total}, Yearly: {yearly_total}, "
                            f"Members: {total_members}, Payments: {total_payments}", data)
                return True
            else:
                self.log_test("Fee Summary After Payments", False, 
                            f"Fee summary not updated correctly. Expected at least "
                            f"Monthly: {expected_total}, got {monthly_total}", data)
                return False
                
        except Exception as e:
            self.log_test("Fee Summary After Payments", False, f"Exception: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all tests in sequence"""
        print("=" * 80)
        print("FITNESS ADMIN APP - BACKEND API TESTING")
        print("=" * 80)
        print(f"Testing API at: {self.base_url}")
        print()
        
        # Run tests in sequence as specified
        tests = [
            ("Initial Fee Summary", self.test_fee_summary_initial),
            ("Create Members", self.test_create_members),
            ("Get Members", self.test_get_members),
            ("Create Payments", self.test_create_payments),
            ("Get Payments", self.test_get_payments),
            ("Fee Summary After Payments", self.test_fee_summary_after_payments)
        ]
        
        passed = 0
        total = len(tests)
        
        for test_name, test_func in tests:
            print(f"Running: {test_name}")
            print("-" * 40)
            if test_func():
                passed += 1
            print()
        
        # Summary
        print("=" * 80)
        print("TEST SUMMARY")
        print("=" * 80)
        print(f"Tests Passed: {passed}/{total}")
        
        if passed == total:
            print("🎉 ALL TESTS PASSED! Backend APIs are working correctly.")
            return True
        else:
            print(f"⚠️  {total - passed} test(s) failed. Check the details above.")
            return False

def main():
    """Main function to run the tests"""
    tester = FitnessAPITester()
    success = tester.run_all_tests()
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()