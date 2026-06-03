 #!/usr/bin/env python3
"""
Security Scan Script
Checks for common security vulnerabilities
"""

import os
import re
import json
from pathlib import Path
from typing import List, Dict
from datetime import datetime

# Color codes
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'
BOLD = '\033[1m'


class SecurityScanner:
    def __init__(self):
        self.vulnerabilities = []
        self.warnings = []
        self.passed = 0
    
    def section(self, title: str):
        """Print section header"""
        print(f"\n{BOLD}{BLUE}{'='*60}{RESET}")
        print(f"{BOLD}{BLUE}{title}{RESET}")
        print(f"{BOLD}{BLUE}{'='*60}{RESET}\n")
    
    def vulnerability(self, severity: str, title: str, description: str, 
                     file_path: str = "", line_number: int = 0):
        """Record a vulnerability"""
        color = RED if severity == "HIGH" else YELLOW
        
        print(f"{color}[{severity}]{RESET} {title}")
        print(f"  {description}")
        if file_path:
            print(f"  Location: {file_path}:{line_number}")
        print()
        
        if severity == "HIGH":
            self.vulnerabilities.append({
                "severity": severity,
                "title": title,
                "description": description,
                "file": file_path,
                "line": line_number
            })
        else:
            self.warnings.append({
                "severity": severity,
                "title": title,
                "description": description,
                "file": file_path,
                "line": line_number
            })
    
    def success(self, title: str):
        """Record a passed check"""
        print(f"{GREEN}[PASS]{RESET} {title}")
        self.passed += 1
    
    def scan_secrets_in_code(self):
        """Scan for hardcoded secrets"""
        self.section("1. HARDCODED SECRETS CHECK")
        
        patterns = {
            "API Key": r'api[_-]?key\s*=\s*["\']([A-Za-z0-9]{20,})["\']',
            "Password": r'password\s*=\s*["\']([^"\']+)["\']',
            "Secret": r'secret\s*=\s*["\']([A-Za-z0-9]{20,})["\']',
            "Token": r'token\s*=\s*["\']([A-Za-z0-9]{20,})["\']',
            "AWS Key": r'(AKIA[0-9A-Z]{16})',
            "Stripe Key": r'(sk_live_[0-9a-zA-Z]{24,})',
        }
        
        found_secrets = False
        
        # Scan Python files
        for py_file in Path("app").rglob("*.py"):
            content = py_file.read_text(errors='ignore')
            
            for secret_type, pattern in patterns.items():
                matches = re.finditer(pattern, content, re.IGNORECASE)
                for match in matches:
                    # Skip comments
                    line_start = content.rfind('\n', 0, match.start()) + 1
                    line = content[line_start:content.find('\n', match.start())]
                    if line.strip().startswith('#'):
                        continue
                    
                    # Calculate line number
                    line_number = content[:match.start()].count('\n') + 1
                    
                    self.vulnerability(
                        "HIGH",
                        f"Hardcoded {secret_type}",
                        f"Found potential hardcoded secret: {match.group(1)[:20]}...",
                        str(py_file),
                        line_number
                    )
                    found_secrets = True
        
        if not found_secrets:
            self.success("No hardcoded secrets found")
    
    def scan_sql_injection(self):
        """Check for SQL injection vulnerabilities"""
        self.section("2. SQL INJECTION CHECK")
        
        dangerous_patterns = [
            r'f"SELECT.*{.*}"',
            r'f\'SELECT.*{.*}\'',
            r'\.execute\([^)]*%[^)]*\)',
            r'\.execute\([^)]*\+[^)]*\)',
        ]
        
        found_vulnerabilities = False
        
        for py_file in Path("app").rglob("*.py"):
            content = py_file.read_text(errors='ignore')
            
            for pattern in dangerous_patterns:
                matches = re.finditer(pattern, content)
                for match in matches:
                    line_number = content[:match.start()].count('\n') + 1
                    
                    self.vulnerability(
                        "HIGH",
                        "Potential SQL Injection",
                        "Unsafe SQL query construction detected",
                        str(py_file),
                        line_number
                    )
                    found_vulnerabilities = True
        
        if not found_vulnerabilities:
            self.success("No SQL injection vulnerabilities found")
    
    def scan_debug_statements(self):
        """Check for debug statements"""
        self.section("3. DEBUG CODE CHECK")
        
        debug_patterns = [
            r'\bprint\s*\(',
            r'\bpdb\.set_trace\(',
            r'\bbreakpoint\(',
            r'\bconsole\.log\(',
        ]
        
        found_debug = False
        
        for py_file in Path("app").rglob("*.py"):
            content = py_file.read_text(errors='ignore')
            
            for pattern in debug_patterns:
                matches = re.finditer(pattern, content)
                for match in matches:
                    # Skip if in comment
                    line_start = content.rfind('\n', 0, match.start()) + 1
                    line = content[line_start:content.find('\n', match.start())]
                    if line.strip().startswith('#'):
                        continue
                    
                    line_number = content[:match.start()].count('\n') + 1
                    
                    self.vulnerability(
                        "MEDIUM",
                        "Debug Statement",
                        f"Debug code found: {match.group(0)}",
                        str(py_file),
                        line_number
                    )
                    found_debug = True
        
        if not found_debug:
            self.success("No debug statements found")
    
    def scan_environment_config(self):
        """Check environment configuration"""
        self.section("4. ENVIRONMENT CONFIGURATION")
        
        # Check if .env exists
        if os.path.exists(".env"):
            self.vulnerability(
                "HIGH",
                ".env file exists",
                ".env should not be committed to version control!",
                ".env"
            )
        else:
            self.success(".env file not in repository")
        
        # Check .gitignore
        if os.path.exists(".gitignore"):
            gitignore = Path(".gitignore").read_text()
            if ".env" in gitignore:
                self.success(".env is in .gitignore")
            else:
                self.vulnerability(
                    "HIGH",
                    ".env not in .gitignore",
                    "Add .env to .gitignore to prevent accidental commits",
                    ".gitignore"
                )
        else:
            self.vulnerability(
                "MEDIUM",
                ".gitignore missing",
                "Create .gitignore to prevent committing sensitive files"
            )
    
    def scan_cors_config(self):
        """Check CORS configuration"""
        self.section("5. CORS CONFIGURATION")
        
        found_issue = False
        
        # Check main.py for CORS config
        main_file = Path("app/main.py")
        if main_file.exists():
            content = main_file.read_text()
            
            # Check for allow_origins=["*"]
            if 'allow_origins=["*"]' in content or "allow_origins=['*']" in content:
                self.vulnerability(
                    "HIGH",
                    "Insecure CORS Configuration",
                    "CORS allows all origins (*) - security risk!",
                    str(main_file)
                )
                found_issue = True
            
            # Check for allow_credentials with wildcard
            if ('allow_credentials=True' in content and 
                ('allow_origins=["*"]' in content or "allow_origins=['*']" in content)):
                self.vulnerability(
                    "HIGH",
                    "Dangerous CORS Configuration",
                    "allow_credentials=True with allow_origins=[*] is dangerous",
                    str(main_file)
                )
                found_issue = True
        
        if not found_issue:
            self.success("CORS configuration looks secure")
    
    def scan_dependency_vulnerabilities(self):
        """Check for known vulnerable dependencies"""
        self.section("6. DEPENDENCY VULNERABILITIES")
        
        # This would require 'safety' package
        # Just check if it's installed and suggest running it
        
        try:
            import safety
            print(f"{YELLOW}Run 'safety check' to scan dependencies{RESET}")
            self.success("Safety package available")
        except ImportError:
            self.vulnerability(
                "MEDIUM",
                "Safety not installed",
                "Install 'safety' to scan for vulnerable dependencies: pip install safety"
            )
    
    def scan_file_permissions(self):
        """Check file permissions"""
        self.section("7. FILE PERMISSIONS")
        
        sensitive_files = [
            "app/config.py",
            ".env",
            "alembic.ini",
        ]
        
        issues_found = False
        
        for file_path in sensitive_files:
            if os.path.exists(file_path):
                # On Unix systems, check if file is world-readable
                if hasattr(os, 'stat'):
                    import stat
                    file_stat = os.stat(file_path)
                    mode = file_stat.st_mode
                    
                    # Check if file is world-readable or world-writable
                    if mode & stat.S_IROTH or mode & stat.S_IWOTH:
                        self.vulnerability(
                            "MEDIUM",
                            "Insecure File Permissions",
                            f"{file_path} is world-readable/writable",
                            file_path
                        )
                        issues_found = True
        
        if not issues_found:
            self.success("File permissions look secure")
    
    def generate_report(self):
        """Generate security report"""
        self.section("SECURITY SCAN REPORT")
        
        total = len(self.vulnerabilities) + len(self.warnings) + self.passed
        
        print(f"\n{BOLD}Summary:{RESET}")
        print(f"  {GREEN}Passed:{RESET} {self.passed}")
        print(f"  {RED}High Severity:{RESET} {len(self.vulnerabilities)}")
        print(f"  {YELLOW}Medium Severity:{RESET} {len(self.warnings)}")
        
        # Verdict
        print(f"\n{BOLD}Security Score:{RESET}")
        if len(self.vulnerabilities) == 0:
            if len(self.warnings) == 0:
                print(f"{GREEN}{BOLD}A+ EXCELLENT!{RESET}")
                verdict = "EXCELLENT"
            elif len(self.warnings) <= 2:
                print(f"{GREEN}{BOLD}A VERY GOOD{RESET}")
                verdict = "VERY GOOD"
            else:
                print(f"{YELLOW}{BOLD}B GOOD{RESET}")
                verdict = "GOOD"
        elif len(self.vulnerabilities) <= 2:
            print(f"{YELLOW}{BOLD}C NEEDS IMPROVEMENT{RESET}")
            verdict = "NEEDS IMPROVEMENT"
        else:
            print(f"{RED}{BOLD}D POOR - FIX IMMEDIATELY!{RESET}")
            verdict = "POOR"
        
        # Recommendations
        if self.vulnerabilities:
            print(f"\n{BOLD}{RED}Critical Issues to Fix:{RESET}")
            for vuln in self.vulnerabilities[:5]:  # Show top 5
                print(f"  - {vuln['title']}")
                if vuln.get('file'):
                    print(f"    {vuln['file']}:{vuln.get('line', 0)}")
        
        # Save report
        report = {
            "timestamp": datetime.now().isoformat(),
            "summary": {
                "passed": self.passed,
                "high_severity": len(self.vulnerabilities),
                "medium_severity": len(self.warnings),
                "verdict": verdict
            },
            "vulnerabilities": self.vulnerabilities,
            "warnings": self.warnings
        }
        
        report_file = "security_scan_report.json"
        with open(report_file, "w") as f:
            json.dump(report, f, indent=2)
        
        print(f"\n{BLUE}Report saved to:{RESET} {report_file}")
        
        return len(self.vulnerabilities) == 0
    
    def run(self):
        """Run all security scans"""
        print(f"\n{BOLD}{BLUE}{'='*60}{RESET}")
        print(f"{BOLD}{BLUE}SMARTCAREER AI - SECURITY SCAN{RESET}")
        print(f"{BOLD}{BLUE}{'='*60}{RESET}")
        print(f"{BLUE}Started:{RESET} {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        
        self.scan_secrets_in_code()
        self.scan_sql_injection()
        self.scan_debug_statements()
        self.scan_environment_config()
        self.scan_cors_config()
        self.scan_dependency_vulnerabilities()
        self.scan_file_permissions()
        
        success = self.generate_report()
        
        return success


if __name__ == "__main__":
    import sys
    
    # Change to backend directory if needed
    if os.path.exists("backend"):
        os.chdir("backend")
    
    scanner = SecurityScanner()
    success = scanner.run()
    
    sys.exit(0 if success else 1)
