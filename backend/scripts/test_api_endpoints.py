#!/usr/bin/env python3
"""
API Endpoint Testing Script
Tests all critical API endpoints for health and functionality
"""

import requests
import json
import time
from typing import Dict, List, Optional
from datetime import datetime
import sys

# Color codes
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'
BOLD = '\033[1m'


class APITester:
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url.rstrip("/")
        self.passed = 0
        self.failed = 0
        self.total_time = 0
        self.results = []
        self.auth_token = None
    
    def test(self, name: str, method: str, endpoint: str, 
             expected_status: int = 200, headers: Optional[Dict] = None,
             data: Optional[Dict] = None, check_response: Optional[callable] = None):
        """Test an API endpoint"""
        
        url = f"{self.base_url}{endpoint}"
        
        if headers is None:
            headers = {}
        
        # Add auth token if available
        if self.auth_token and "Authorization" not in headers:
            headers["Authorization"] = f"Bearer {self.auth_token}"
        
        try:
            start_time = time.time()
            
            if method == "GET":
                response = requests.get(url, headers=headers, timeout=10)
            elif method == "POST":
                response = requests.post(url, headers=headers, json=data, timeout=10)
            elif method == "PUT":
                response = requests.put(url, headers=headers, json=data, timeout=10)
            elif method == "DELETE":
                response = requests.delete(url, headers=headers, timeout=10)
            else:
                raise ValueError(f"Unknown method: {method}")
            
            elapsed = time.time() - start_time
            self.total_time += elapsed
            
            # Check status code
            status_ok = response.status_code == expected_status
            
            # Check response if validator provided
            response_ok = True
            response_msg = ""
            if check_response and status_ok:
                try:
                    response_data = response.json()
                    response_ok = check_response(response_data)
                    response_msg = " + response valid" if response_ok else " - response invalid"
                except Exception as e:
                    response_ok = False
                    response_msg = f" - response check failed: {str(e)}"
            
            passed = status_ok and response_ok
            
            if passed:
                self.passed += 1
                color = GREEN
                status = "PASS"
            else:
                self.failed += 1
                color = RED
                status = "FAIL"
            
            print(f"{color}[{status}]{RESET} {name}: "
                  f"{response.status_code} (expected {expected_status}) "
                  f"in {elapsed*1000:.0f}ms{response_msg}")
            
            self.results.append({
                "name": name,
                "method": method,
                "endpoint": endpoint,
                "passed": passed,
                "status_code": response.status_code,
                "expected_status": expected_status,
                "response_time_ms": elapsed * 1000,
                "timestamp": datetime.now().isoformat()
            })
            
            return response
            
        except requests.exceptions.RequestException as e:
            self.failed += 1
            print(f"{RED}[FAIL]{RESET} {name}: Connection error - {str(e)}")
            self.results.append({
                "name": name,
                "method": method,
                "endpoint": endpoint,
                "passed": False,
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            })
            return None
    
    def section(self, title: str):
        """Print section header"""
        print(f"\n{BOLD}{BLUE}{'='*60}{RESET}")
        print(f"{BOLD}{BLUE}{title}{RESET}")
        print(f"{BOLD}{BLUE}{'='*60}{RESET}\n")
    
    def test_health(self):
        """Test health check endpoint"""
        self.section("1. HEALTH CHECKS")
        
        self.test(
            "Health Check",
            "GET",
            "/health",
            expected_status=200,
            check_response=lambda r: "status" in r
        )
        
        self.test(
            "API Root",
            "GET",
            "/",
            expected_status=200
        )
    
    def test_auth(self):
        """Test authentication endpoints"""
        self.section("2. AUTHENTICATION")
        
        # Test registration (might fail if user exists - that's ok)
        test_email = f"test_{int(time.time())}@example.com"
        register_response = self.test(
            "Register",
            "POST",
            "/api/v1/auth/register",
            expected_status=201,
            data={
                "email": test_email,
                "password": "TestPassword123!",
                "full_name": "Test User"
            }
        )
        
        # Test login
        login_response = self.test(
            "Login",
            "POST",
            "/api/v1/auth/login",
            expected_status=200,
            data={
                "username": test_email,
                "password": "TestPassword123!"
            },
            check_response=lambda r: "access_token" in r
        )
        
        # Save token for other tests
        if login_response and login_response.status_code == 200:
            try:
                self.auth_token = login_response.json()["access_token"]
                print(f"{BLUE}  Auth token saved for subsequent tests{RESET}")
            except:
                pass
        
        # Test protected endpoint
        if self.auth_token:
            self.test(
                "Get Current User",
                "GET",
                "/api/v1/users/me",
                expected_status=200,
                check_response=lambda r: "email" in r
            )
    
    def test_jobs(self):
        """Test job endpoints"""
        self.section("3. JOBS API")
        
        self.test(
            "List Jobs",
            "GET",
            "/api/v1/jobs",
            expected_status=200,
            check_response=lambda r: isinstance(r, dict) and "jobs" in r
        )
        
        self.test(
            "Search Jobs",
            "GET",
            "/api/v1/jobs?search=engineer",
            expected_status=200
        )
        
        self.test(
            "Filter Jobs by Type",
            "GET",
            "/api/v1/jobs?job_type=full_time",
            expected_status=200
        )
    
    def test_resumes(self):
        """Test resume endpoints"""
        self.section("4. RESUMES API")
        
        if not self.auth_token:
            print(f"{YELLOW}  Skipped - requires authentication{RESET}")
            return
        
        self.test(
            "List Resumes",
            "GET",
            "/api/v1/resumes",
            expected_status=200
        )
        
        # Create resume
        create_response = self.test(
            "Create Resume",
            "POST",
            "/api/v1/resumes",
            expected_status=201,
            data={
                "title": "Test Resume",
                "full_name": "Test User",
                "email": "test@example.com",
                "phone": "+998901234567",
                "summary": "Test summary"
            }
        )
    
    def test_performance(self):
        """Test API performance"""
        self.section("5. PERFORMANCE")
        
        # Average response time
        if self.results:
            response_times = [r.get("response_time_ms", 0) for r in self.results if "response_time_ms" in r]
            if response_times:
                avg_time = sum(response_times) / len(response_times)
                max_time = max(response_times)
                min_time = min(response_times)
                
                print(f"  Average response time: {avg_time:.0f}ms")
                print(f"  Min response time: {min_time:.0f}ms")
                print(f"  Max response time: {max_time:.0f}ms")
                
                if avg_time < 200:
                    print(f"  {GREEN}Performance: EXCELLENT{RESET}")
                elif avg_time < 500:
                    print(f"  {GREEN}Performance: GOOD{RESET}")
                elif avg_time < 1000:
                    print(f"  {YELLOW}Performance: ACCEPTABLE{RESET}")
                else:
                    print(f"  {RED}Performance: POOR (optimization needed){RESET}")
    
    def generate_report(self):
        """Generate test report"""
        self.section("TEST REPORT")
        
        total = self.passed + self.failed
        
        print(f"\n{BOLD}Summary:{RESET}")
        print(f"  {GREEN}Passed:{RESET} {self.passed}/{total}")
        print(f"  {RED}Failed:{RESET} {self.failed}/{total}")
        print(f"  Total time: {self.total_time:.2f}s")
        
        if total > 0:
            success_rate = (self.passed / total) * 100
            print(f"  Success rate: {success_rate:.1f}%")
        
        # Verdict
        print(f"\n{BOLD}Verdict:{RESET}")
        if self.failed == 0:
            print(f"{GREEN}{BOLD}ALL TESTS PASSED!{RESET}")
        elif self.failed <= 2:
            print(f"{YELLOW}{BOLD}SOME TESTS FAILED{RESET}")
        else:
            print(f"{RED}{BOLD}MANY TESTS FAILED{RESET}")
        
        # Save report
        report = {
            "timestamp": datetime.now().isoformat(),
            "base_url": self.base_url,
            "total_tests": total,
            "passed": self.passed,
            "failed": self.failed,
            "total_time_seconds": self.total_time,
            "results": self.results
        }
        
        report_file = "api_test_report.json"
        with open(report_file, "w") as f:
            json.dump(report, f, indent=2)
        
        print(f"\n{BLUE}Report saved to:{RESET} {report_file}")
        
        return self.failed == 0
    
    def run(self):
        """Run all API tests"""
        print(f"\n{BOLD}{BLUE}{'='*60}{RESET}")
        print(f"{BOLD}{BLUE}SMARTCAREER AI - API ENDPOINT TESTS{RESET}")
        print(f"{BOLD}{BLUE}{'='*60}{RESET}")
        print(f"{BLUE}Testing:{RESET} {self.base_url}")
        print(f"{BLUE}Started:{RESET} {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        
        # Check if server is running
        try:
            requests.get(self.base_url, timeout=5)
        except requests.exceptions.RequestException:
            print(f"{RED}ERROR: Cannot connect to {self.base_url}{RESET}")
            print(f"{YELLOW}Make sure the API server is running!{RESET}")
            sys.exit(1)
        
        # Run tests
        self.test_health()
        self.test_auth()
        self.test_jobs()
        self.test_resumes()
        self.test_performance()
        
        # Generate report
        success = self.generate_report()
        
        sys.exit(0 if success else 1)


if __name__ == "__main__":
    import sys
    
    # Get base URL from command line or use default
    base_url = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8000"
    
    tester = APITester(base_url)
    tester.run()
