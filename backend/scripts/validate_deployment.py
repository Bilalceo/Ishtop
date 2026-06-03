#!/usr/bin/env python3
"""
Deployment Validation Script
Checks if the application is ready for production deployment
"""

import os
import sys
import json
from typing import Dict, List, Tuple
from datetime import datetime

# Color codes for terminal output
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'
BOLD = '\033[1m'

class DeploymentValidator:
    def __init__(self):
        self.checks_passed = 0
        self.checks_failed = 0
        self.warnings = 0
        self.results = []
    
    def check(self, name: str, passed: bool, message: str, critical: bool = True):
        """Record a check result"""
        status = "PASS" if passed else "FAIL" if critical else "WARN"
        color = GREEN if passed else RED if critical else YELLOW
        
        print(f"{color}[{status}]{RESET} {name}: {message}")
        
        if passed:
            self.checks_passed += 1
        elif critical:
            self.checks_failed += 1
        else:
            self.warnings += 1
        
        self.results.append({
            "name": name,
            "passed": passed,
            "message": message,
            "critical": critical,
            "timestamp": datetime.now().isoformat()
        })
    
    def section(self, title: str):
        """Print section header"""
        print(f"\n{BOLD}{BLUE}{'='*60}{RESET}")
        print(f"{BOLD}{BLUE}{title}{RESET}")
        print(f"{BOLD}{BLUE}{'='*60}{RESET}\n")
    
    def validate_environment_variables(self):
        """Check required environment variables"""
        self.section("1. ENVIRONMENT VARIABLES")
        
        required_vars = {
            "SECRET_KEY": 64,  # Minimum length
            "DATABASE_URL": 20,
            "GEMINI_API_KEY": 20,
            "CORS_ORIGINS": 5,
            "FRONTEND_URL": 5,
        }
        
        optional_vars = {
            "SENTRY_DSN": "Error tracking",
            "SENDGRID_API_KEY": "Email service",
            "STRIPE_SECRET_KEY": "Payment processing",
            "REDIS_URL": "Caching",
        }
        
        # Check required variables
        for var, min_length in required_vars.items():
            value = os.getenv(var)
            if value and len(value) >= min_length:
                self.check(
                    var,
                    True,
                    f"Set ({len(value)} chars)",
                    critical=True
                )
            else:
                self.check(
                    var,
                    False,
                    f"Missing or too short (need {min_length}+ chars)",
                    critical=True
                )
        
        # Check optional but recommended
        for var, description in optional_vars.items():
            value = os.getenv(var)
            if value:
                self.check(
                    var,
                    True,
                    f"Set - {description}",
                    critical=False
                )
            else:
                self.check(
                    var,
                    False,
                    f"Not set - {description} disabled",
                    critical=False
                )
        
        # Check DEBUG is False
        debug = os.getenv("DEBUG", "").lower()
        self.check(
            "DEBUG=False",
            debug in ["false", "0", ""],
            f"DEBUG={debug} (must be False in production!)",
            critical=True
        )
    
    def validate_database_connection(self):
        """Test database connection"""
        self.section("2. DATABASE CONNECTION")
        
        try:
            from sqlalchemy import create_engine, text
            
            database_url = os.getenv("DATABASE_URL")
            if not database_url:
                self.check(
                    "Database URL",
                    False,
                    "DATABASE_URL not set",
                    critical=True
                )
                return
            
            # Check if using SQLite in production
            if "sqlite" in database_url.lower():
                self.check(
                    "Database Type",
                    False,
                    "Using SQLite (PostgreSQL recommended for production!)",
                    critical=False
                )
            else:
                self.check(
                    "Database Type",
                    True,
                    "Using PostgreSQL/MySQL",
                    critical=True
                )
            
            # Test connection
            try:
                engine = create_engine(database_url)
                with engine.connect() as conn:
                    result = conn.execute(text("SELECT 1"))
                    result.fetchone()
                
                self.check(
                    "Database Connection",
                    True,
                    "Successfully connected",
                    critical=True
                )
                
                # Check tables exist
                from sqlalchemy import inspect
                inspector = inspect(engine)
                tables = inspector.get_table_names()
                
                expected_tables = [
                    'users', 'jobs', 'resumes', 'applications'
                ]
                
                missing_tables = [t for t in expected_tables if t not in tables]
                
                if not missing_tables:
                    self.check(
                        "Database Tables",
                        True,
                        f"All {len(expected_tables)} tables exist",
                        critical=True
                    )
                else:
                    self.check(
                        "Database Tables",
                        False,
                        f"Missing tables: {', '.join(missing_tables)}",
                        critical=True
                    )
                
            except Exception as e:
                self.check(
                    "Database Connection",
                    False,
                    f"Failed to connect: {str(e)}",
                    critical=True
                )
        
        except ImportError as e:
            self.check(
                "Database Dependencies",
                False,
                f"Missing dependencies: {str(e)}",
                critical=True
            )
    
    def validate_api_keys(self):
        """Validate API keys"""
        self.section("3. API KEYS")
        
        # Gemini API
        gemini_key = os.getenv("GEMINI_API_KEY")
        if gemini_key and gemini_key.startswith("AIza"):
            self.check(
                "Gemini API Key",
                True,
                "Valid format",
                critical=True
            )
        else:
            self.check(
                "Gemini API Key",
                False,
                "Invalid or missing",
                critical=True
            )
        
        # Stripe API (if payments enabled)
        stripe_key = os.getenv("STRIPE_SECRET_KEY")
        if stripe_key:
            if stripe_key.startswith("sk_live_"):
                self.check(
                    "Stripe API Key",
                    True,
                    "Using LIVE key (production ready)",
                    critical=True
                )
            elif stripe_key.startswith("sk_test_"):
                self.check(
                    "Stripe API Key",
                    False,
                    "Using TEST key (switch to live for production!)",
                    critical=False
                )
            else:
                self.check(
                    "Stripe API Key",
                    False,
                    "Invalid format",
                    critical=True
                )
        else:
            self.check(
                "Stripe API Key",
                False,
                "Not set - payments disabled",
                critical=False
            )
    
    def validate_security_settings(self):
        """Check security configuration"""
        self.section("4. SECURITY SETTINGS")
        
        # SECRET_KEY strength
        secret_key = os.getenv("SECRET_KEY", "")
        if len(secret_key) >= 64:
            self.check(
                "SECRET_KEY Strength",
                True,
                f"{len(secret_key)} characters (strong)",
                critical=True
            )
        elif len(secret_key) >= 32:
            self.check(
                "SECRET_KEY Strength",
                False,
                f"{len(secret_key)} characters (weak - should be 64+)",
                critical=False
            )
        else:
            self.check(
                "SECRET_KEY Strength",
                False,
                f"{len(secret_key)} characters (very weak!)",
                critical=True
            )
        
        # Check for default/development keys
        if secret_key in ["dev", "development", "changeme", "secret"]:
            self.check(
                "SECRET_KEY Default",
                False,
                "Using default/weak key - CHANGE IMMEDIATELY!",
                critical=True
            )
        
        # CORS settings
        cors_origins = os.getenv("CORS_ORIGINS", "")
        if "*" in cors_origins:
            self.check(
                "CORS Configuration",
                False,
                "Allows all origins (*) - security risk!",
                critical=True
            )
        elif cors_origins:
            origins = cors_origins.split(",")
            self.check(
                "CORS Configuration",
                True,
                f"Restricted to {len(origins)} domain(s)",
                critical=True
            )
        else:
            self.check(
                "CORS Configuration",
                False,
                "Not configured",
                critical=True
            )
        
        # HTTPS check
        frontend_url = os.getenv("FRONTEND_URL", "")
        backend_url = os.getenv("BACKEND_URL", "")
        
        https_frontend = frontend_url.startswith("https://")
        https_backend = backend_url.startswith("https://")
        
        if https_frontend or not frontend_url:
            self.check(
                "HTTPS Frontend",
                True,
                "Using HTTPS" if https_frontend else "Not configured",
                critical=True if frontend_url else False
            )
        else:
            self.check(
                "HTTPS Frontend",
                False,
                "Using HTTP (insecure!)",
                critical=True
            )
    
    def validate_file_structure(self):
        """Check required files exist"""
        self.section("5. FILE STRUCTURE")
        
        required_files = [
            ("backend/app/main.py", "Main application"),
            ("backend/app/config.py", "Configuration"),
            ("backend/alembic.ini", "Database migrations"),
            ("backend/requirements.txt", "Dependencies"),
            ("backend/Procfile", "Deployment config"),
        ]
        
        for file_path, description in required_files:
            exists = os.path.exists(file_path)
            self.check(
                description,
                exists,
                file_path if exists else f"{file_path} missing",
                critical=True
            )
    
    def validate_dependencies(self):
        """Check Python dependencies"""
        self.section("6. DEPENDENCIES")
        
        try:
            import fastapi
            self.check("FastAPI", True, f"v{fastapi.__version__}", critical=True)
        except ImportError:
            self.check("FastAPI", False, "Not installed", critical=True)
        
        try:
            import sqlalchemy
            self.check("SQLAlchemy", True, f"v{sqlalchemy.__version__}", critical=True)
        except ImportError:
            self.check("SQLAlchemy", False, "Not installed", critical=True)
        
        try:
            import pydantic
            self.check("Pydantic", True, f"v{pydantic.__version__}", critical=True)
        except ImportError:
            self.check("Pydantic", False, "Not installed", critical=True)
        
        try:
            import uvicorn
            self.check("Uvicorn", True, f"v{uvicorn.__version__}", critical=True)
        except ImportError:
            self.check("Uvicorn", False, "Not installed", critical=True)
        
        # Optional but recommended
        try:
            import sentry_sdk
            self.check("Sentry SDK", True, f"v{sentry_sdk.__version__}", critical=False)
        except ImportError:
            self.check("Sentry SDK", False, "Not installed (monitoring disabled)", critical=False)
        
        try:
            import redis
            self.check("Redis", True, f"v{redis.__version__}", critical=False)
        except ImportError:
            self.check("Redis", False, "Not installed (caching disabled)", critical=False)
    
    def generate_report(self) -> Dict:
        """Generate final report"""
        self.section("DEPLOYMENT VALIDATION REPORT")
        
        total_checks = self.checks_passed + self.checks_failed + self.warnings
        
        print(f"\n{BOLD}Summary:{RESET}")
        print(f"  {GREEN}Passed:{RESET} {self.checks_passed}/{total_checks}")
        print(f"  {RED}Failed:{RESET} {self.checks_failed}/{total_checks}")
        print(f"  {YELLOW}Warnings:{RESET} {self.warnings}/{total_checks}")
        
        # Calculate score
        if total_checks > 0:
            score = (self.checks_passed / total_checks) * 100
        else:
            score = 0
        
        print(f"\n{BOLD}Score:{RESET} {score:.1f}%")
        
        # Verdict
        print(f"\n{BOLD}Verdict:{RESET}")
        if self.checks_failed == 0:
            print(f"{GREEN}{BOLD}READY FOR DEPLOYMENT!{RESET}")
            verdict = "PASS"
        elif self.checks_failed <= 2:
            print(f"{YELLOW}{BOLD}ALMOST READY - Fix critical issues first{RESET}")
            verdict = "WARNING"
        else:
            print(f"{RED}{BOLD}NOT READY - Too many critical issues{RESET}")
            verdict = "FAIL"
        
        # Save report
        report = {
            "timestamp": datetime.now().isoformat(),
            "total_checks": total_checks,
            "passed": self.checks_passed,
            "failed": self.checks_failed,
            "warnings": self.warnings,
            "score": score,
            "verdict": verdict,
            "results": self.results
        }
        
        report_file = "deployment_validation_report.json"
        with open(report_file, "w") as f:
            json.dump(report, f, indent=2)
        
        print(f"\n{BLUE}Report saved to:{RESET} {report_file}")
        
        return report
    
    def run(self):
        """Run all validation checks"""
        print(f"\n{BOLD}{BLUE}{'='*60}{RESET}")
        print(f"{BOLD}{BLUE}SMARTCAREER AI - DEPLOYMENT VALIDATION{RESET}")
        print(f"{BOLD}{BLUE}{'='*60}{RESET}")
        print(f"{BLUE}Started:{RESET} {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        
        # Run all checks
        self.validate_environment_variables()
        self.validate_database_connection()
        self.validate_api_keys()
        self.validate_security_settings()
        self.validate_file_structure()
        self.validate_dependencies()
        
        # Generate report
        report = self.generate_report()
        
        # Exit code
        sys.exit(0 if self.checks_failed == 0 else 1)


if __name__ == "__main__":
    # Change to backend directory if needed
    if os.path.exists("backend"):
        os.chdir("backend")
    
    # Load .env file
    try:
        from dotenv import load_dotenv
        load_dotenv()
        print("Loaded .env file")
    except ImportError:
        print("Warning: python-dotenv not installed, using system environment variables")
    
    # Run validator
    validator = DeploymentValidator()
    validator.run()
