#!/usr/bin/env python3
"""
Performance Benchmark Script
Measures API performance under load
"""

import requests
import time
import statistics
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import List, Dict
import json
from datetime import datetime

# Color codes
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'
BOLD = '\033[1m'


class PerformanceBenchmark:
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url.rstrip("/")
        self.results = []
    
    def single_request(self, endpoint: str) -> float:
        """Make a single request and return response time"""
        try:
            start = time.time()
            response = requests.get(f"{self.base_url}{endpoint}", timeout=10)
            elapsed = time.time() - start
            
            if response.status_code == 200:
                return elapsed
            else:
                return -1  # Error
        except:
            return -1
    
    def load_test(self, endpoint: str, num_requests: int = 100, 
                  concurrent: int = 10) -> Dict:
        """Perform load test on endpoint"""
        
        print(f"{BLUE}Testing:{RESET} {endpoint}")
        print(f"  Requests: {num_requests}, Concurrent: {concurrent}")
        
        response_times = []
        errors = 0
        
        start_time = time.time()
        
        with ThreadPoolExecutor(max_workers=concurrent) as executor:
            futures = [
                executor.submit(self.single_request, endpoint)
                for _ in range(num_requests)
            ]
            
            for future in as_completed(futures):
                result = future.result()
                if result > 0:
                    response_times.append(result)
                else:
                    errors += 1
        
        total_time = time.time() - start_time
        
        # Calculate statistics
        if response_times:
            avg_time = statistics.mean(response_times)
            median_time = statistics.median(response_times)
            min_time = min(response_times)
            max_time = max(response_times)
            p95_time = sorted(response_times)[int(len(response_times) * 0.95)]
            p99_time = sorted(response_times)[int(len(response_times) * 0.99)]
        else:
            avg_time = median_time = min_time = max_time = p95_time = p99_time = 0
        
        success_rate = ((num_requests - errors) / num_requests) * 100
        requests_per_second = num_requests / total_time
        
        # Print results
        print(f"  {GREEN}Success rate:{RESET} {success_rate:.1f}%")
        print(f"  {BLUE}Requests/sec:{RESET} {requests_per_second:.1f}")
        print(f"  {BLUE}Response times (ms):{RESET}")
        print(f"    Average: {avg_time*1000:.0f}ms")
        print(f"    Median:  {median_time*1000:.0f}ms")
        print(f"    Min:     {min_time*1000:.0f}ms")
        print(f"    Max:     {max_time*1000:.0f}ms")
        print(f"    P95:     {p95_time*1000:.0f}ms")
        print(f"    P99:     {p99_time*1000:.0f}ms")
        
        # Performance grade
        if avg_time * 1000 < 100:
            grade = "A+"
            color = GREEN
        elif avg_time * 1000 < 200:
            grade = "A"
            color = GREEN
        elif avg_time * 1000 < 500:
            grade = "B"
            color = YELLOW
        elif avg_time * 1000 < 1000:
            grade = "C"
            color = YELLOW
        else:
            grade = "D"
            color = RED
        
        print(f"  {BOLD}Grade:{RESET} {color}{grade}{RESET}\n")
        
        result = {
            "endpoint": endpoint,
            "total_requests": num_requests,
            "concurrent": concurrent,
            "success_rate": success_rate,
            "errors": errors,
            "total_time_seconds": total_time,
            "requests_per_second": requests_per_second,
            "response_times_ms": {
                "average": avg_time * 1000,
                "median": median_time * 1000,
                "min": min_time * 1000,
                "max": max_time * 1000,
                "p95": p95_time * 1000,
                "p99": p99_time * 1000,
            },
            "grade": grade,
            "timestamp": datetime.now().isoformat()
        }
        
        self.results.append(result)
        return result
    
    def run_benchmarks(self):
        """Run all performance benchmarks"""
        
        print(f"\n{BOLD}{BLUE}{'='*60}{RESET}")
        print(f"{BOLD}{BLUE}SMARTCAREER AI - PERFORMANCE BENCHMARKS{RESET}")
        print(f"{BOLD}{BLUE}{'='*60}{RESET}")
        print(f"{BLUE}Target:{RESET} {self.base_url}")
        print(f"{BLUE}Started:{RESET} {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        
        # Test health endpoint (lightweight)
        print(f"{BOLD}1. HEALTH CHECK (100 requests, 10 concurrent){RESET}")
        self.load_test("/health", num_requests=100, concurrent=10)
        
        # Test jobs list (medium load)
        print(f"{BOLD}2. JOBS API (50 requests, 5 concurrent){RESET}")
        self.load_test("/api/v1/jobs", num_requests=50, concurrent=5)
        
        # Stress test health (high concurrency)
        print(f"{BOLD}3. STRESS TEST (200 requests, 20 concurrent){RESET}")
        self.load_test("/health", num_requests=200, concurrent=20)
    
    def generate_report(self):
        """Generate performance report"""
        
        print(f"{BOLD}{BLUE}{'='*60}{RESET}")
        print(f"{BOLD}{BLUE}PERFORMANCE SUMMARY{RESET}")
        print(f"{BOLD}{BLUE}{'='*60}{RESET}\n")
        
        # Overall statistics
        all_avg_times = [r["response_times_ms"]["average"] for r in self.results]
        all_rps = [r["requests_per_second"] for r in self.results]
        
        if all_avg_times:
            overall_avg = statistics.mean(all_avg_times)
            overall_rps = statistics.mean(all_rps)
            
            print(f"{BOLD}Overall Performance:{RESET}")
            print(f"  Average response time: {overall_avg:.0f}ms")
            print(f"  Average throughput: {overall_rps:.1f} req/sec")
            
            # Overall grade
            if overall_avg < 100:
                overall_grade = "A+"
                color = GREEN
                verdict = "EXCELLENT"
            elif overall_avg < 200:
                overall_grade = "A"
                color = GREEN
                verdict = "VERY GOOD"
            elif overall_avg < 500:
                overall_grade = "B"
                color = YELLOW
                verdict = "GOOD"
            elif overall_avg < 1000:
                overall_grade = "C"
                color = YELLOW
                verdict = "ACCEPTABLE"
            else:
                overall_grade = "D"
                color = RED
                verdict = "POOR"
            
            print(f"  {BOLD}Overall Grade:{RESET} {color}{overall_grade}{RESET}")
            print(f"  {BOLD}Verdict:{RESET} {color}{verdict}{RESET}")
            
            # Recommendations
            print(f"\n{BOLD}Recommendations:{RESET}")
            if overall_avg < 200:
                print(f"  {GREEN}Performance is excellent! No optimization needed.{RESET}")
            elif overall_avg < 500:
                print(f"  {YELLOW}Performance is good. Consider::{RESET}")
                print(f"    - Enable Redis caching")
                print(f"    - Add database indexes")
            else:
                print(f"  {RED}Performance needs improvement:{RESET}")
                print(f"    - Enable Redis caching (critical)")
                print(f"    - Add database indexes (critical)")
                print(f"    - Use connection pooling")
                print(f"    - Optimize database queries")
                print(f"    - Consider CDN for static assets")
        
        # Save report
        report = {
            "timestamp": datetime.now().isoformat(),
            "base_url": self.base_url,
            "results": self.results,
            "summary": {
                "overall_avg_response_ms": overall_avg,
                "overall_throughput_rps": overall_rps,
                "overall_grade": overall_grade,
                "verdict": verdict
            }
        }
        
        report_file = "performance_benchmark_report.json"
        with open(report_file, "w") as f:
            json.dump(report, f, indent=2)
        
        print(f"\n{BLUE}Report saved to:{RESET} {report_file}")


if __name__ == "__main__":
    import sys
    
    # Get base URL from command line or use default
    base_url = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8000"
    
    # Check if server is running
    try:
        requests.get(base_url, timeout=5)
    except requests.exceptions.RequestException:
        print(f"{RED}ERROR: Cannot connect to {base_url}{RESET}")
        print(f"{YELLOW}Make sure the API server is running!{RESET}")
        sys.exit(1)
    
    # Run benchmarks
    benchmark = PerformanceBenchmark(base_url)
    benchmark.run_benchmarks()
    benchmark.generate_report()
