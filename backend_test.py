import requests
import sys
from datetime import datetime, timedelta
import json

class PumpFitCRMTester:
    def __init__(self, base_url="https://client-scheduler-crm.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.client_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.client_id = None
        self.package_id = None
        self.session_id = None
        self.sale_id = None
        self.referral_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json()
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json()
                    print(f"   Error: {error_detail}")
                except:
                    print(f"   Response: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_init_admin(self):
        """Test admin initialization"""
        success, response = self.run_test(
            "Initialize Admin",
            "POST",
            "init/admin",
            200
        )
        return success

    def test_login(self):
        """Test login with admin credentials"""
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data={"email": "admin@pumpfit.com", "password": "admin123"}
        )
        if success and 'token' in response:
            self.token = response['token']
            print(f"   Token obtained: {self.token[:20]}...")
            return True
        return False

    def test_get_me(self):
        """Test get current user"""
        success, response = self.run_test(
            "Get Current User",
            "GET",
            "auth/me",
            200
        )
        return success

    def test_dashboard_stats(self):
        """Test dashboard statistics"""
        success, response = self.run_test(
            "Dashboard Stats",
            "GET",
            "dashboard/stats",
            200
        )
        if success:
            print(f"   Stats: {response}")
        return success

    def test_create_client(self):
        """Test client creation"""
        client_data = {
            "name": f"Test Client {datetime.now().strftime('%H%M%S')}",
            "email": f"test{datetime.now().strftime('%H%M%S')}@test.com",
            "phone": "5551234567",
            "birth_date": "1990-01-01",
            "emergency_contact": "Emergency Contact",
            "emergency_phone": "5559876543"
        }
        success, response = self.run_test(
            "Create Client",
            "POST",
            "clients",
            200,
            data=client_data
        )
        if success and 'client' in response:
            self.client_id = response['client']['id']
            print(f"   Client ID: {self.client_id}")
        return success

    def test_get_clients(self):
        """Test get clients list"""
        success, response = self.run_test(
            "Get Clients",
            "GET",
            "clients",
            200
        )
        if success:
            print(f"   Found {len(response)} clients")
        return success

    def test_get_client_detail(self):
        """Test get client detail"""
        if not self.client_id:
            print("❌ No client ID available for detail test")
            return False
        
        success, response = self.run_test(
            "Get Client Detail",
            "GET",
            f"clients/{self.client_id}",
            200
        )
        return success

    def test_get_package_types(self):
        """Test get package types with new pricing structure"""
        success, response = self.run_test(
            "Get Package Types (New Pricing)",
            "GET",
            "packages/types",
            200
        )
        if success:
            packages = response.get('packages', {})
            inscription_price = response.get('inscription_price')
            nutrition_price = response.get('nutrition_plan_price')
            
            print(f"   Inscription Price: ${inscription_price}")
            print(f"   Nutrition Plan Price: ${nutrition_price}")
            
            # Verify new package structure
            expected_packages = ["8", "24", "50", "annual"]
            for pkg_type in expected_packages:
                if pkg_type in packages:
                    pkg = packages[pkg_type]
                    print(f"   {pkg['name']}: Promo ${pkg['promo_price']} / Normal ${pkg['normal_price']}")
                else:
                    print(f"   ❌ Missing package type: {pkg_type}")
                    return False
            
            # Verify specific prices from requirements
            if packages.get('8', {}).get('promo_price') != 2700:
                print(f"   ❌ 8 sessions promo price should be $2700, got ${packages.get('8', {}).get('promo_price')}")
                return False
            if packages.get('8', {}).get('normal_price') != 4000:
                print(f"   ❌ 8 sessions normal price should be $4000, got ${packages.get('8', {}).get('normal_price')}")
                return False
                
        return success

    def test_create_package(self):
        """Test package creation with new pricing"""
        if not self.client_id:
            print("❌ No client ID available for package test")
            return False
        
        package_data = {
            "client_id": self.client_id,
            "package_type": "8",
            "use_promo_price": True,
            "notes": "Test package with promo pricing"
        }
        success, response = self.run_test(
            "Create Package (Promo Price)",
            "POST",
            "packages",
            200,
            data=package_data
        )
        if success and 'package_id' in response:
            self.package_id = response['package_id']
            expected_price = 2700  # 8 sessions promo price
            actual_price = response.get('price')
            print(f"   Package ID: {self.package_id}")
            print(f"   Price: ${actual_price} (expected ${expected_price})")
            if actual_price != expected_price:
                print(f"   ❌ Price mismatch!")
                return False
        return success

    def test_get_packages(self):
        """Test get packages"""
        success, response = self.run_test(
            "Get Packages",
            "GET",
            "packages",
            200
        )
        if success:
            print(f"   Found {len(response)} packages")
        return success

    def test_get_time_slots(self):
        """Test get time slots - should return 30-minute intervals"""
        success, response = self.run_test(
            "Get Time Slots (30-min intervals)",
            "GET",
            "sessions/time-slots",
            200
        )
        if success:
            print(f"   Found {len(response)} time slots")
            # Verify 30-minute intervals
            if len(response) > 0:
                print(f"   First slot: {response[0]}")
                print(f"   Last slot: {response[-1]}")
                # Should have slots from 9:00 to 18:30 (30-min intervals)
                expected_count = 20  # (19:00 - 9:00) / 0.5 hours
                if len(response) != expected_count:
                    print(f"   ❌ Expected {expected_count} slots for 30-min intervals, got {len(response)}")
                    return False
        return success

    def test_create_session(self):
        """Test session creation - should validate only 2 suits available"""
        if not self.client_id or not self.package_id:
            print("❌ No client or package ID available for session test")
            return False
        
        # Get tomorrow's date
        tomorrow = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')
        
        session_data = {
            "client_id": self.client_id,
            "package_id": self.package_id,
            "date": tomorrow,
            "time": "09:00",
            "suit_number": 1
        }
        success, response = self.run_test(
            "Create Session (Suit 1)",
            "POST",
            "sessions",
            200,
            data=session_data
        )
        if success and 'session_id' in response:
            self.session_id = response['session_id']
            print(f"   Session ID: {self.session_id}")
        
        # Test invalid suit number (should only allow 1-2)
        invalid_session_data = {
            "client_id": self.client_id,
            "package_id": self.package_id,
            "date": tomorrow,
            "time": "09:30",
            "suit_number": 3  # Invalid - only 2 suits available
        }
        invalid_success, invalid_response = self.run_test(
            "Create Session (Invalid Suit 3)",
            "POST",
            "sessions",
            400,  # Should fail
            data=invalid_session_data
        )
        
        return success and invalid_success

    def test_get_sessions(self):
        """Test get sessions"""
        success, response = self.run_test(
            "Get Sessions",
            "GET",
            "sessions",
            200
        )
        if success:
            print(f"   Found {len(response)} sessions")
        return success

    def test_create_sale(self):
        """Test sale creation"""
        if not self.client_id:
            print("❌ No client ID available for sale test")
            return False
        
        sale_data = {
            "client_id": self.client_id,
            "description": "Test manual sale",
            "amount": 500.0,
            "payment_method": "cash"
        }
        success, response = self.run_test(
            "Create Sale",
            "POST",
            "sales",
            200,
            data=sale_data
        )
        if success and 'sale_id' in response:
            self.sale_id = response['sale_id']
            print(f"   Sale ID: {self.sale_id}")
        return success

    def test_get_sales(self):
        """Test get sales"""
        success, response = self.run_test(
            "Get Sales",
            "GET",
            "sales",
            200
        )
        if success:
            print(f"   Found {len(response)} sales")
        return success

    def test_sales_summary(self):
        """Test sales summary"""
        success, response = self.run_test(
            "Sales Summary",
            "GET",
            "sales/summary?period=month",
            200
        )
        if success:
            print(f"   Summary: {response}")
        return success

    def test_complete_session(self):
        """Test complete session"""
        if not self.session_id:
            print("❌ No session ID available for completion test")
            return False
        
        success, response = self.run_test(
            "Complete Session",
            "PUT",
            f"sessions/{self.session_id}/complete",
            200
        )
        return success

    def test_pay_inscription(self):
        """Test inscription payment - $599"""
        if not self.client_id:
            print("❌ No client ID available for inscription test")
            return False
        
        success, response = self.run_test(
            "Pay Inscription ($599)",
            "POST",
            f"clients/{self.client_id}/pay-inscription?payment_method=cash",
            200
        )
        if success:
            expected_amount = 599
            actual_amount = response.get('amount')
            print(f"   Inscription amount: ${actual_amount} (expected ${expected_amount})")
            if actual_amount != expected_amount:
                print(f"   ❌ Amount mismatch!")
                return False
        return success

    def test_add_nutrition_plan(self):
        """Test adding nutrition plan - $500"""
        if not self.client_id:
            print("❌ No client ID available for nutrition plan test")
            return False
        
        success, response = self.run_test(
            "Add Nutrition Plan ($500)",
            "POST",
            f"clients/{self.client_id}/nutrition-plan?payment_method=cash",
            200
        )
        if success:
            expected_amount = 500
            actual_amount = response.get('amount')
            print(f"   Nutrition plan amount: ${actual_amount} (expected ${expected_amount})")
            if actual_amount != expected_amount:
                print(f"   ❌ Amount mismatch!")
                return False
        return success

    def test_activate_client_profile(self):
        """Test client profile activation by admin"""
        if not self.client_id:
            print("❌ No client ID available for activation test")
            return False
        
        success, response = self.run_test(
            "Activate Client Profile",
            "POST",
            f"clients/{self.client_id}/activate",
            200
        )
        return success

    def test_add_referral(self):
        """Test adding referral contact"""
        if not self.client_id:
            print("❌ No client ID available for referral test")
            return False
        
        referral_data = {
            "name": "Juan Pérez",
            "phone": "5551234567",
            "email": "juan.perez@test.com",
            "notes": "Interesado en bajar de peso"
        }
        success, response = self.run_test(
            "Add Referral Contact",
            "POST",
            f"clients/{self.client_id}/referrals",
            200,
            data=referral_data
        )
        if success and 'referral_id' in response:
            self.referral_id = response['referral_id']
            print(f"   Referral ID: {self.referral_id}")
        return success

    def test_get_referrals(self):
        """Test getting client referrals"""
        if not self.client_id:
            print("❌ No client ID available for referrals test")
            return False
        
        success, response = self.run_test(
            "Get Client Referrals",
            "GET",
            f"clients/{self.client_id}/referrals",
            200
        )
        if success:
            print(f"   Found {len(response)} referrals")
        return success

    def test_client_login(self):
        """Test client login with existing credentials"""
        success, response = self.run_test(
            "Client Login",
            "POST",
            "auth/login",
            200,
            data={"email": "maria.garcia@test.com", "password": "test123"}
        )
        if success and 'token' in response:
            self.client_token = response['token']
            print(f"   Client token obtained: {self.client_token[:20]}...")
            return True
        return False

    def test_client_portal_info(self):
        """Test client portal info endpoint"""
        if not self.client_token:
            print("❌ No client token available for portal test")
            return False
        
        # Temporarily switch to client token
        original_token = self.token
        self.token = self.client_token
        
        success, response = self.run_test(
            "Client Portal Info",
            "GET",
            "portal/my-info",
            200
        )
        
        # Restore admin token
        self.token = original_token
        
        if success:
            profile_active = response.get('profile_active', False)
            print(f"   Profile active: {profile_active}")
        return success

def main():
    print("🚀 Starting Pump Fit CRM Backend Tests")
    print("=" * 50)
    
    tester = PumpFitCRMTester()
    
    # Test sequence
    tests = [
        ("Initialize Admin", tester.test_init_admin),
        ("Login", tester.test_login),
        ("Get Current User", tester.test_get_me),
        ("Dashboard Stats", tester.test_dashboard_stats),
        ("Get Package Types", tester.test_get_package_types),
        ("Create Client", tester.test_create_client),
        ("Get Clients", tester.test_get_clients),
        ("Get Client Detail", tester.test_get_client_detail),
        ("Pay Inscription", tester.test_pay_inscription),
        ("Add Nutrition Plan", tester.test_add_nutrition_plan),
        ("Activate Client Profile", tester.test_activate_client_profile),
        ("Add Referral", tester.test_add_referral),
        ("Get Referrals", tester.test_get_referrals),
        ("Create Package", tester.test_create_package),
        ("Get Packages", tester.test_get_packages),
        ("Get Time Slots", tester.test_get_time_slots),
        ("Create Session", tester.test_create_session),
        ("Get Sessions", tester.test_get_sessions),
        ("Create Sale", tester.test_create_sale),
        ("Get Sales", tester.test_get_sales),
        ("Sales Summary", tester.test_sales_summary),
        ("Complete Session", tester.test_complete_session),
        ("Client Login", tester.test_client_login),
        ("Client Portal Info", tester.test_client_portal_info),
    ]
    
    failed_tests = []
    
    for test_name, test_func in tests:
        try:
            if not test_func():
                failed_tests.append(test_name)
        except Exception as e:
            print(f"❌ {test_name} - Exception: {str(e)}")
            failed_tests.append(test_name)
    
    # Print results
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} passed")
    
    if failed_tests:
        print(f"\n❌ Failed Tests ({len(failed_tests)}):")
        for test in failed_tests:
            print(f"   - {test}")
    else:
        print("\n✅ All tests passed!")
    
    success_rate = (tester.tests_passed / tester.tests_run) * 100 if tester.tests_run > 0 else 0
    print(f"\n📈 Success Rate: {success_rate:.1f}%")
    
    return 0 if len(failed_tests) == 0 else 1

if __name__ == "__main__":
    sys.exit(main())