import requests
import sys
from datetime import datetime
import json

class AquaTrackAPITester:
    def __init__(self, base_url="https://aquatrack-58.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.admin_user = None
        self.receptionist_user = None
        self.scanner_user = None
        self.created_tickets = []
        self.categories = []
        self.prices = []

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
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

    def test_login(self, email, password):
        """Test login and get token"""
        success, response = self.run_test(
            f"Login ({email})",
            "POST",
            "auth/login",
            200,
            data={"email": email, "password": password}
        )
        if success and 'access_token' in response:
            self.token = response['access_token']
            return True, response['user']
        return False, {}

    def test_auth_me(self):
        """Test getting current user info"""
        success, response = self.run_test(
            "Get Current User (/auth/me)",
            "GET",
            "auth/me",
            200
        )
        return success, response

    def test_get_categories(self):
        """Test getting categories"""
        success, response = self.run_test(
            "Get Categories",
            "GET",
            "categories",
            200
        )
        if success:
            self.categories = response
            print(f"   Found {len(response)} categories")
        return success, response

    def test_get_prices(self):
        """Test getting prices"""
        success, response = self.run_test(
            "Get Prices",
            "GET",
            "prices",
            200
        )
        if success:
            self.prices = response
            print(f"   Found {len(response)} prices")
        return success, response

    def test_create_user(self, email, name, role, password):
        """Test creating a new user"""
        success, response = self.run_test(
            f"Create User ({role})",
            "POST",
            "users",
            200,
            data={
                "email": email,
                "name": name,
                "role": role,
                "password": password
            }
        )
        return success, response

    def test_get_users(self):
        """Test getting all users"""
        success, response = self.run_test(
            "Get Users",
            "GET",
            "users",
            200
        )
        if success:
            print(f"   Found {len(response)} users")
        return success, response

    def test_update_price(self, category_id, new_price):
        """Test updating price for a category"""
        success, response = self.run_test(
            f"Update Price (Category: {category_id})",
            "POST",
            "prices",
            200,
            data={
                "category_id": category_id,
                "price": new_price
            }
        )
        return success, response

    def test_create_ticket_batch(self, tickets_data):
        """Test creating a batch of tickets"""
        success, response = self.run_test(
            "Create Ticket Batch",
            "POST",
            "tickets/batch",
            200,
            data={"tickets": tickets_data}
        )
        if success:
            self.created_tickets.extend(response.get('tickets', []))
            print(f"   Created {response.get('total_tickets', 0)} tickets")
        return success, response

    def test_get_tickets(self):
        """Test getting tickets"""
        success, response = self.run_test(
            "Get Tickets",
            "GET",
            "tickets",
            200
        )
        if success:
            print(f"   Found {len(response)} tickets")
        return success, response

    def test_scan_ticket(self, ticket_id):
        """Test scanning a ticket"""
        success, response = self.run_test(
            f"Scan Ticket ({ticket_id[:8]}...)",
            "POST",
            "tickets/scan",
            200,
            data={"ticket_id": ticket_id}
        )
        if success:
            print(f"   Scan result: {response.get('status')} - {response.get('message')}")
        return success, response

    def test_daily_report(self):
        """Test getting daily report"""
        success, response = self.run_test(
            "Get Daily Report",
            "GET",
            "reports/daily",
            200
        )
        if success:
            print(f"   Tickets sold: {response.get('tickets_sold', 0)}")
            print(f"   Revenue: {response.get('total_revenue', 0)}")
        return success, response

def main():
    print("🏊 AquaTrack Swimming Pool Management System - API Testing")
    print("=" * 60)
    
    tester = AquaTrackAPITester()
    
    # Test 1: Admin Login
    print("\n📋 PHASE 1: AUTHENTICATION TESTING")
    success, admin_user = tester.test_login("admin@aquaflow.com", "admin123")
    if not success:
        print("❌ Admin login failed, stopping tests")
        return 1
    
    tester.admin_user = admin_user
    print(f"   Admin user: {admin_user.get('name')} ({admin_user.get('role')})")
    
    # Test auth/me endpoint
    tester.test_auth_me()
    
    # Test 2: Get Categories and Prices
    print("\n📋 PHASE 2: BASIC DATA RETRIEVAL")
    tester.test_get_categories()
    tester.test_get_prices()
    
    # Test 3: User Management (Admin only)
    print("\n📋 PHASE 3: USER MANAGEMENT TESTING")
    tester.test_get_users()
    
    # Create receptionist user
    timestamp = datetime.now().strftime("%H%M%S")
    receptionist_email = f"receptionist{timestamp}@test.com"
    success, receptionist = tester.test_create_user(
        receptionist_email, 
        "Test Receptionist", 
        "RECEPTIONIST", 
        "test123"
    )
    if success:
        tester.receptionist_user = receptionist
    
    # Create scanner user
    scanner_email = f"scanner{timestamp}@test.com"
    success, scanner = tester.test_create_user(
        scanner_email, 
        "Test Scanner", 
        "SCANNER", 
        "test123"
    )
    if success:
        tester.scanner_user = scanner
    
    # Test 4: Price Management
    print("\n📋 PHASE 4: PRICE MANAGEMENT TESTING")
    if tester.categories:
        # Find "Umum" category and update its price
        umum_category = next((cat for cat in tester.categories if cat['name'] == 'Umum'), None)
        if umum_category:
            tester.test_update_price(umum_category['id'], 50000)
            # Refresh prices to see the update
            tester.test_get_prices()
    
    # Test 5: Ticket Operations (as Admin first)
    print("\n📋 PHASE 5: TICKET OPERATIONS TESTING")
    if tester.categories:
        # Create test tickets
        umum_cat = next((cat for cat in tester.categories if cat['name'] == 'Umum'), None)
        mahasiswa_cat = next((cat for cat in tester.categories if cat['name'] == 'Mahasiswa'), None)
        
        if umum_cat and mahasiswa_cat:
            tickets_data = [
                {"category_id": umum_cat['id'], "quantity": 2},
                {"category_id": mahasiswa_cat['id'], "quantity": 1, "nim": "12345678"}
            ]
            tester.test_create_ticket_batch(tickets_data)
    
    tester.test_get_tickets()
    
    # Test 6: Receptionist Login and Operations
    print("\n📋 PHASE 6: RECEPTIONIST ROLE TESTING")
    if tester.receptionist_user:
        # Login as receptionist
        success, _ = tester.test_login(receptionist_email, "test123")
        if success:
            print("   Receptionist login successful")
            # Test receptionist can create tickets
            if tester.categories:
                umum_cat = next((cat for cat in tester.categories if cat['name'] == 'Umum'), None)
                if umum_cat:
                    tickets_data = [{"category_id": umum_cat['id'], "quantity": 1}]
                    tester.test_create_ticket_batch(tickets_data)
            
            # Test receptionist can view their tickets
            tester.test_get_tickets()
    
    # Test 7: Scanner Login and Operations
    print("\n📋 PHASE 7: SCANNER ROLE TESTING")
    if tester.scanner_user:
        # Login as scanner
        success, _ = tester.test_login(scanner_email, "test123")
        if success:
            print("   Scanner login successful")
            
            # Test ticket scanning if we have tickets
            if tester.created_tickets:
                test_ticket = tester.created_tickets[0]
                ticket_id = test_ticket['id']
                
                # First scan - should be VALID
                tester.test_scan_ticket(ticket_id)
                
                # Second scan - should be USED
                tester.test_scan_ticket(ticket_id)
                
                # Test invalid ticket ID
                tester.test_scan_ticket("invalid-ticket-id")
    
    # Test 8: Reports (Admin only)
    print("\n📋 PHASE 8: REPORTS TESTING")
    # Login back as admin for reports
    tester.test_login("admin@aquaflow.com", "admin123")
    tester.test_daily_report()
    
    # Print final results
    print("\n" + "=" * 60)
    print(f"📊 FINAL TEST RESULTS")
    print(f"Tests passed: {tester.tests_passed}/{tester.tests_run}")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print(f"⚠️  {tester.tests_run - tester.tests_passed} tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())