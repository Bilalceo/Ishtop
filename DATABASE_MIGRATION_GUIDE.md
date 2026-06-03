# 🗄️ DATABASE MIGRATION GUIDE

**SQLite → PostgreSQL for Production**  
**Generated:** 2026-01-19

---

## 🎯 WHY MIGRATE?

### SQLite (Development):
- ✅ Easy setup
- ✅ No server needed
- ❌ No concurrent writes
- ❌ Limited scalability
- ❌ No advanced features

### PostgreSQL (Production):
- ✅ High performance
- ✅ Concurrent connections
- ✅ Advanced features (JSON, full-text search)
- ✅ Scales to millions of rows
- ✅ Production-ready

---

## 📋 MIGRATION OPTIONS

### Option 1: Railway (Recommended - Easy!)
**Free PostgreSQL included!**

### Option 2: Render
**Paid: $7/month for PostgreSQL**

### Option 3: Supabase
**Free tier: 500 MB**

### Option 4: Self-Hosted
**Advanced users only**

---

## 🚀 OPTION 1: RAILWAY (RECOMMENDED)

### Step 1: Create Railway Project

```bash
# 1. Sign up: https://railway.app
# 2. Click "New Project"
# 3. Select "Provision PostgreSQL"
# 4. Done! Database created automatically
```

### Step 2: Get Database URL

```bash
# Railway Dashboard:
# 1. Click PostgreSQL service
# 2. Go to "Variables" tab
# 3. Copy DATABASE_URL

# Example:
postgresql://user:pass@host.railway.internal:5432/railway
```

### Step 3: Update Environment

```bash
# backend/.env
DATABASE_URL=postgresql://user:pass@host:5432/dbname
```

### Step 4: Export Data from SQLite

```bash
cd backend

# Install dependencies
pip install psycopg2-binary

# Export data
python -c "
from app.database import engine, Base
from app import models
import pandas as pd

# Export each table
tables = ['users', 'jobs', 'resumes', 'universities', 'scholarships']
for table in tables:
    try:
        df = pd.read_sql_table(table, engine)
        df.to_csv(f'{table}.csv', index=False)
        print(f'Exported {table}: {len(df)} rows')
    except Exception as e:
        print(f'Error exporting {table}: {e}')
"
```

### Step 5: Run Migrations on PostgreSQL

```bash
# backend/.env should now have PostgreSQL URL

cd backend

# Run migrations
alembic upgrade head

# Verify
alembic current
```

### Step 6: Import Data

```python
# backend/import_data.py
import pandas as pd
from app.database import SessionLocal
from app import models

db = SessionLocal()

# Import users
try:
    users_df = pd.read_csv('users.csv')
    for _, row in users_df.iterrows():
        user = models.User(**row.to_dict())
        db.merge(user)  # merge instead of add to handle duplicates
    db.commit()
    print(f"Imported {len(users_df)} users")
except Exception as e:
    print(f"Error importing users: {e}")
    db.rollback()

# Import jobs
try:
    jobs_df = pd.read_csv('jobs.csv')
    for _, row in jobs_df.iterrows():
        job = models.Job(**row.to_dict())
        db.merge(job)
    db.commit()
    print(f"Imported {len(jobs_df)} jobs")
except Exception as e:
    print(f"Error importing jobs: {e}")
    db.rollback()

# Repeat for other tables...

db.close()
```

```bash
# Run import
python import_data.py
```

### Step 7: Verify Migration

```python
# backend/verify_migration.py
from app.database import SessionLocal
from app import models

db = SessionLocal()

print("Users:", db.query(models.User).count())
print("Jobs:", db.query(models.Job).count())
print("Resumes:", db.query(models.Resume).count())
print("Universities:", db.query(models.University).count())
print("Scholarships:", db.query(models.Scholarship).count())

db.close()
```

---

## 🚀 OPTION 2: RENDER

### Step 1: Create Database

```bash
# 1. Go to: https://render.com
# 2. New → PostgreSQL
# 3. Name: ishtop-db
# 4. Plan: Starter ($7/month)
# 5. Create Database
```

### Step 2: Get Connection Details

```bash
# Render Dashboard → PostgreSQL → Connections

# Internal URL (for backend on Render):
postgresql://user:pass@host.internal:5432/db

# External URL (for local development):
postgresql://user:pass@host.com:5432/db
```

### Step 3: Follow Steps 4-7 from Option 1

---

## 🚀 OPTION 3: SUPABASE

### Step 1: Create Project

```bash
# 1. Go to: https://supabase.com
# 2. New Project
# 3. Name: ishtop
# 4. Database Password: (strong password)
# 5. Region: Closest to your users
# 6. Create Project
```

### Step 2: Get Connection String

```bash
# Supabase Dashboard → Settings → Database

# Connection string:
postgresql://postgres:password@db.xxx.supabase.co:5432/postgres

# Or use connection pooling (recommended):
postgresql://postgres:password@db.xxx.supabase.co:6543/postgres?pgbouncer=true
```

### Step 3: Follow Steps 4-7 from Option 1

---

## 🔧 ADVANCED: pgloader (Automated Migration)

**Fastest way to migrate with data!**

### Install pgloader:

```bash
# macOS
brew install pgloader

# Ubuntu
sudo apt-get install pgloader

# Windows
# Use Docker:
docker pull dimitri/pgloader
```

### Migrate with pgloader:

```bash
# backend/migrate.load
LOAD DATABASE
    FROM sqlite://./ishtop.db
    INTO postgresql://user:pass@host:5432/dbname
    
    WITH include drop, create tables, create indexes, reset sequences
    
    SET work_mem to '16MB',
        maintenance_work_mem to '512 MB';
```

```bash
# Run migration
pgloader migrate.load

# Or with Docker:
docker run --rm -v $(pwd):/data dimitri/pgloader \
  pgloader /data/migrate.load
```

**Done in 1 command!** 🚀

---

## 📊 COMPARISON

| Method | Time | Difficulty | Data Loss Risk |
|--------|------|------------|----------------|
| Manual Export/Import | 30 min | Medium | Low |
| pgloader | 5 min | Easy | Very Low |
| Fresh Start | 2 min | Easy | 100% |

**Recommendation:**
- **With data:** pgloader
- **No data/dev:** Fresh start

---

## 🔍 VERIFICATION CHECKLIST

After migration, verify:

- [ ] All tables created
- [ ] Row counts match
- [ ] Data types correct
- [ ] Foreign keys working
- [ ] Indexes created
- [ ] Sequences reset
- [ ] No duplicate IDs
- [ ] JSON fields work
- [ ] Dates in correct timezone
- [ ] Backend connects successfully
- [ ] API endpoints work
- [ ] Login works
- [ ] Create/Update/Delete works

### Verification Script:

```python
# backend/verify_full.py
from app.database import SessionLocal
from app import models
from sqlalchemy import inspect

db = SessionLocal()
inspector = inspect(db.get_bind())

print("TABLES:")
for table_name in inspector.get_table_names():
    print(f"  {table_name}")
    
    # Get row count
    try:
        model = getattr(models, table_name.capitalize().rstrip('s'))
        count = db.query(model).count()
        print(f"    Rows: {count}")
    except:
        pass
    
    # Get indexes
    indexes = inspector.get_indexes(table_name)
    if indexes:
        print(f"    Indexes: {len(indexes)}")

print("\nFOREIGN KEYS:")
for table_name in inspector.get_table_names():
    fks = inspector.get_foreign_keys(table_name)
    if fks:
        print(f"  {table_name}: {len(fks)} FK(s)")

db.close()
```

---

## 🚨 TROUBLESHOOTING

### Error: "SSL connection required"

```python
# backend/app/config.py
DATABASE_URL = os.getenv("DATABASE_URL")

# Fix SSL
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
if DATABASE_URL and "sslmode" not in DATABASE_URL:
    DATABASE_URL += "?sslmode=require"
```

### Error: "UUID type not found"

```python
# Install UUID extension in PostgreSQL
from sqlalchemy import text

with engine.connect() as conn:
    conn.execute(text('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"'))
    conn.commit()
```

### Error: "Sequence out of sync"

```sql
-- Reset sequences after import
SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));
SELECT setval('jobs_id_seq', (SELECT MAX(id) FROM jobs));
-- Repeat for all tables with auto-increment IDs
```

### Error: "Too many connections"

```python
# Increase connection pool
DB_POOL_SIZE=20
DB_MAX_OVERFLOW=10

# Or use PgBouncer connection pooling
DATABASE_URL=postgresql://user:pass@host:6543/db?pgbouncer=true
```

---

## 🎯 MIGRATION SCRIPT (All-in-One)

```bash
# backend/scripts/migrate_to_postgres.sh
#!/bin/bash

set -e

echo "🚀 Starting migration to PostgreSQL..."

# 1. Check PostgreSQL connection
echo "1. Checking PostgreSQL connection..."
python -c "
from sqlalchemy import create_engine
import os
engine = create_engine(os.getenv('DATABASE_URL'))
with engine.connect() as conn:
    result = conn.execute('SELECT version()')
    print(f'   Connected: {result.fetchone()[0][:50]}...')
"

# 2. Run migrations
echo "2. Running migrations..."
cd backend
alembic upgrade head

# 3. Export data from SQLite
echo "3. Exporting data from SQLite..."
python -c "
from app.database import engine
from sqlalchemy import create_engine
import os

# Use SQLite
sqlite_engine = create_engine('sqlite:///./ishtop.db')

# Export to CSV
import pandas as pd
tables = ['users', 'jobs', 'resumes', 'universities', 'scholarships']
for table in tables:
    try:
        df = pd.read_sql_table(table, sqlite_engine)
        df.to_csv(f'{table}.csv', index=False)
        print(f'   Exported {table}: {len(df)} rows')
    except Exception as e:
        print(f'   Skipped {table}: {e}')
"

# 4. Import to PostgreSQL
echo "4. Importing to PostgreSQL..."
python import_data.py

# 5. Verify
echo "5. Verifying migration..."
python verify_migration.py

echo "✅ Migration complete!"
```

```bash
# Run migration
chmod +x backend/scripts/migrate_to_postgres.sh
bash backend/scripts/migrate_to_postgres.sh
```

---

## 📝 ROLLBACK PLAN

**If something goes wrong:**

### Quick Rollback:

```bash
# 1. Switch back to SQLite
# backend/.env
DATABASE_URL=sqlite:///./ishtop.db

# 2. Restart backend
# Your data is still in ishtop.db!
```

### Keep Backups:

```bash
# Before migration:
cp ishtop.db ishtop.db.backup
cp backend/.env backend/.env.backup

# If needed:
mv ishtop.db.backup ishtop.db
mv backend/.env.backup backend/.env
```

---

## ✅ POST-MIGRATION

### Update Documentation:

```markdown
# README.md
## Database
- Development: SQLite
- Production: PostgreSQL on Railway
```

### Update Backup Scripts:

```bash
# Use PostgreSQL backup instead of SQLite
# See: backend/scripts/backup_database.sh
```

### Monitor Performance:

```sql
-- Check slow queries
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

---

## 🎯 CHECKLIST

### Pre-Migration:
- [ ] PostgreSQL database created
- [ ] DATABASE_URL obtained
- [ ] SQLite data backed up
- [ ] Migration script ready

### Migration:
- [ ] Migrations run successfully
- [ ] Data exported from SQLite
- [ ] Data imported to PostgreSQL
- [ ] Data verified (row counts)

### Post-Migration:
- [ ] Backend connects to PostgreSQL
- [ ] All API endpoints work
- [ ] Frontend works correctly
- [ ] No errors in logs
- [ ] Performance is good
- [ ] Backups configured
- [ ] SQLite backup kept (just in case)

---

**Status:** 🗄️ Migration Guide Ready  
**Time:** 30-60 minutes  
**Priority:** 🔴 REQUIRED for production

**TAYYOR!** 🚀
