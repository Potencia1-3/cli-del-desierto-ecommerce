import requests
import sys
from datetime import datetime, timedelta
import json

class ClientPortalTester:
    def __init__(self, base_url="https://agenda-ventas.preview.emergentagent.com"):
        self.base_url = base_url
        self.client_token = None
        self.admin_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.client_id = None
        self.test_email = f"testclient{datetime.now().strftime('%H%M%S')}@test.com"

    def run_test(self, name, method, endpoint, expected_status, data=None, token=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if token:
            headers['Authorization'] = f'Bearer {token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)

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

    def test_admin_login(self):
        """Login as admin to setup test data"""
        success, response = self.run_test(
            "Admin Login (Setup)",
            "POST",
            "auth/login",
            200,
            data={"email": "admin@pumpfit.com", "password": "admin123"}
        )
        if success and 'token' in response:
            self.admin_token = response['token']
            return True
        return False

    def test_client_register(self):
        """Test client registration"""
        client_data = {
            "email": self.test_email,
            "password": "test123",
            "name": "Test Client Portal",
            "phone": "5551234567",
            "birth_date": "1990-01-01"
        }
        success, response = self.run_test(
            "Client Registration",
            "POST",
            "portal/register",
            200,
            data=client_data
        )
        if success and 'token' in response:
            self.client_token = response['token']
            self.client_id = response.get('client_id')
            print(f"   Client Token: {self.client_token[:20]}...")
            print(f"   Client ID: {self.client_id}")
            return True
        return False

    def test_client_login(self):
        """Test client login with existing credentials"""
        success, response = self.run_test(
            "Client Login",
            "POST",
            "auth/login",
            200,
            data={"email": self.test_email, "password": "test123"}
        )
        if success and 'token' in response:
            print(f"   Login successful for: {response.get('user', {}).get('email')}")
            return True
        return False

    def test_get_my_info(self):
        """Test get client info"""
        success, response = self.run_test(
            "Get My Client Info",
            "GET",
            "portal/my-info",
            200,
            token=self.client_token
        )
        if success:
            print(f"   Client Name: {response.get('name')}")
            print(f"   Active Packages: {len(response.get('active_packages', []))}")
            print(f"   Upcoming Sessions: {len(response.get('upcoming_sessions', []))}")
        return success

    def test_get_my_progress(self):
        """Test get client progress"""
        success, response = self.run_test(
            "Get My Progress",
            "GET",
            "portal/my-progress",
            200,
            token=self.client_token
        )
        if success:
            print(f"   Completed Sessions: {response.get('completed_sessions', 0)}")
            print(f"   Remaining Sessions: {response.get('remaining_sessions', 0)}")
            print(f"   Measurements: {len(response.get('measurements', []))}")
        return success

    def test_available_slots(self):
        """Test get available slots"""
        tomorrow = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')
        success, response = self.run_test(
            "Get Available Slots",
            "GET",
            f"portal/available-slots?date={tomorrow}",
            200,
            token=self.client_token
        )
        if success:
            print(f"   Available slots for {tomorrow}: {len(response)} time slots")
            if response:
                first_slot = list(response.keys())[0]
                print(f"   First slot: {first_slot} with {len(response[first_slot])} suits")
        return success

    def setup_test_package(self):
        """Create a test package for the client"""
        if not self.client_id or not self.admin_token:
            print("❌ Cannot create package - missing client ID or admin token")
            return False
        
        package_data = {
            "client_id": self.client_id,
            "package_type": "8",
            "price": 1500.0,
            "notes": "Test package for client portal"
        }
        success, response = self.run_test(
            "Create Test Package (Setup)",
            "POST",
            "packages",
            200,
            data=package_data,
            token=self.admin_token
        )
        return success

    def test_existing_client_login(self):
        """Test login with provided test credentials"""
        success, response = self.run_test(
            "Test Client Login (maria.garcia)",
            "POST",
            "auth/login",
            200,
            data={"email": "maria.garcia@test.com", "password": "test123"}
        )
        if success:
            test_token = response.get('token')
            print(f"   Login successful for existing client")
            
            # Test getting info for existing client
            success2, response2 = self.run_test(
                "Get Existing Client Info",
                "GET",
                "portal/my-info",
                200,
                token=test_token
            )
            if success2:
                print(f"   Existing client name: {response2.get('name')}")
        return success

def main():
    print("🚀 Starting Client Portal Tests")
    print("=" * 50)
    
    tester = ClientPortalTester()
    
    # Test sequence
    tests = [
        ("Admin Login (Setup)", tester.test_admin_login),
        ("Client Registration", tester.test_client_register),
        ("Setup Test Package", tester.setup_test_package),
        ("Client Login", tester.test_client_login),
        ("Get My Info", tester.test_get_my_info),
        ("Get My Progress", tester.test_get_my_progress),
        ("Get Available Slots", tester.test_available_slots),
        ("Test Existing Client Login", tester.test_existing_client_login),
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
        print("\n✅ All client portal tests passed!")
    
    success_rate = (tester.tests_passed / tester.tests_run) * 100 if tester.tests_run > 0 else 0
    print(f"\n📈 Success Rate: {success_rate:.1f}%")
    
    return 0 if len(failed_tests) == 0 else 1

if __name__ == "__main__":
    sys.exit(main())