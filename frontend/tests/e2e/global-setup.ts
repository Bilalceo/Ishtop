import { request } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

type Json = Record<string, any>;

// In the app we commonly use NEXT_PUBLIC_API_URL as ".../api/v1".
// For seeding, we need the backend origin (no "/api/v1" suffix).
const RAW_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
const API_URL = RAW_API_URL.replace(/\/api\/v1\/?$/, '');
const ROOT_DIR = path.resolve(process.cwd(), '..');
const BACKEND_DIR = path.join(ROOT_DIR, 'backend');
const E2E_SEED_FILE = path.join(process.cwd(), 'test-results', 'e2e-seed.json');
const WEAK_SECRET_KEYS = new Set([
  '',
  'your-super-secret-key-change-in-production',
  'CHANGE-THIS-TO-RANDOM-32-CHAR-STRING-USE-COMMAND-BELOW',
  'generate-a-secure-random-key-here',
  'secret',
  'changeme',
  'change-me',
  'test-secret',
  'test-secret-key-for-ci',
]);

function isStrongSecretKey(secretKey: string): boolean {
  return secretKey.length >= 32 && !WEAK_SECRET_KEYS.has(secretKey);
}

function resolveSeedSecretKey(): string {
  const envSecret = (process.env.SECRET_KEY || '').trim();
  if (isStrongSecretKey(envSecret)) {
    return envSecret;
  }

  // Deterministic across the same repo/branch context while avoiding weak defaults.
  const deterministicSeed = [
    'ishtop-e2e-admin-seed-secret-v1',
    process.env.GITHUB_REPOSITORY || '',
    process.env.GITHUB_REF || '',
    ROOT_DIR,
  ].join('|');

  return createHash('sha256').update(deterministicSeed).digest('hex');
}

function resolveSmokeAdminCredentials() {
  const runId = [
    process.env.E2E_RUN_ID,
    process.env.GITHUB_RUN_ID,
    process.env.BUILD_BUILDID,
    `${Date.now()}-${process.pid}`,
  ].find(Boolean) as string;
  const safeRunId = runId.toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '');

  return {
    email: (process.env.E2E_ADMIN_EMAIL || `admin.e2e.${safeRunId}@ishtop.uz`).toLowerCase(),
    password: process.env.E2E_ADMIN_PASSWORD || 'Admin123!',
  };
}

function writeSeedFile(seed: Json) {
  mkdirSync(path.dirname(E2E_SEED_FILE), { recursive: true });
  writeFileSync(E2E_SEED_FILE, `${JSON.stringify(seed, null, 2)}\n`, 'utf8');
}

function discoverLocalBackendSqliteDatabaseUrl(): string | null {
  try {
    const listener = execFileSync('lsof', ['-nP', '-iTCP:8000', '-sTCP:LISTEN', '-Fp'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    const pid = listener
      .split('\n')
      .find((line) => /^p\d+$/.test(line))
      ?.slice(1);

    if (!pid) return null;

    const openFiles = execFileSync('lsof', ['-nP', '-p', pid], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    const dbPath = openFiles
      .split('\n')
      .map((line) => line.match(/(\/\S+\.db)\b/)?.[1])
      .find((value): value is string => Boolean(value));

    return dbPath ? `sqlite:///${dbPath}` : null;
  } catch {
    return null;
  }
}

function ensureAdminAccount(email: string, password: string) {
  const script = `
import os
import sys
from uuid import uuid4

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, ".")

from app.config import settings
from app.models.user import User

ADMIN_EMAIL = os.environ["E2E_ADMIN_EMAIL"].lower()
ADMIN_PASSWORD = os.environ["E2E_ADMIN_PASSWORD"]
ADMIN_ROLE_VALUE = "admin"
ADMIN_SUB_ROLE_VALUE = "super_admin"

engine = create_engine(os.environ.get("DATABASE_URL") or str(settings.DATABASE_URL), echo=False)
SessionLocal = sessionmaker(bind=engine)
is_postgres = engine.dialect.name == "postgresql"

# Only ensure the users table exists. Creating the entire metadata can fail in fresh
# Postgres (e.g. FK type mismatches) and would silently fall back to sqlite.
User.__table__.create(bind=engine, checkfirst=True)

inspector = inspect(engine)
user_columns = {column["name"] for column in inspector.get_columns("users")}
has_admin_role_column = "admin_role" in user_columns
has_subscription_tier_column = "subscription_tier" in user_columns

db = SessionLocal()
try:
    password_source = User(
        email=ADMIN_EMAIL,
        full_name="System Admin",
    )
    password_source.set_password(ADMIN_PASSWORD)
    password_hash = password_source.password_hash

    existing_admin_row = db.execute(
        text("SELECT id FROM users WHERE email = :email LIMIT 1"),
        {"email": ADMIN_EMAIL},
    ).first()

    role_sql = "CAST(:role AS user_role_enum)" if is_postgres else ":role"

    if existing_admin_row is not None:
        update_fields = [
            "full_name = :full_name",
            "phone = :phone",
            "password_hash = :password_hash",
            f"role = {role_sql}",
            "is_active = :is_active",
            "is_verified = :is_verified",
            "is_deleted = :is_deleted",
            "deleted_at = NULL",
            "updated_at = CURRENT_TIMESTAMP",
        ]
        if has_admin_role_column:
            update_fields.append("admin_role = :admin_role")
        if has_subscription_tier_column:
            update_fields.append("subscription_tier = :subscription_tier")

        db.execute(
            text(
                "UPDATE users "
                "SET " + ", ".join(update_fields) + " "
                "WHERE id = :id"
            ),
            {
                "id": str(existing_admin_row[0]),
                "full_name": "System Admin",
                "phone": "+998901111111",
                "password_hash": password_hash,
                "role": ADMIN_ROLE_VALUE,
                "admin_role": ADMIN_SUB_ROLE_VALUE,
                "subscription_tier": "enterprise",
                "is_active": True,
                "is_verified": True,
                "is_deleted": False,
            },
        )
    else:
        insert_columns = [
            "id",
            "email",
            "full_name",
            "phone",
            "password_hash",
            "role",
            "is_active",
            "is_verified",
            "is_deleted",
        ]
        insert_values = [
            "CAST(:id AS uuid)" if is_postgres else ":id",
            ":email",
            ":full_name",
            ":phone",
            ":password_hash",
            role_sql,
            ":is_active",
            ":is_verified",
            ":is_deleted",
        ]

        if has_admin_role_column:
            insert_columns.append("admin_role")
            insert_values.append(":admin_role")
        if has_subscription_tier_column:
            insert_columns.append("subscription_tier")
            insert_values.append(":subscription_tier")

        db.execute(
            text(
                "INSERT INTO users (" + ", ".join(insert_columns) + ") "
                "VALUES (" + ", ".join(insert_values) + ")"
            ),
            {
                "id": str(uuid4()),
                "email": ADMIN_EMAIL,
                "full_name": "System Admin",
                "phone": "+998901111111",
                "password_hash": password_hash,
                "role": ADMIN_ROLE_VALUE,
                "admin_role": ADMIN_SUB_ROLE_VALUE,
                "subscription_tier": "enterprise",
                "is_active": True,
                "is_verified": True,
                "is_deleted": False,
            },
        )

    db.commit()
finally:
    db.close()
`;

  const isCi = Boolean(process.env.CI) || process.env.GITHUB_ACTIONS === 'true';
  const localDiscoveredDatabaseUrl = process.env.DATABASE_URL
    ? null
    : discoverLocalBackendSqliteDatabaseUrl();
  const candidateDatabaseUrls = Array.from(
    new Set(
      isCi
        ? [process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/ishtop_test']
        : [process.env.DATABASE_URL || localDiscoveredDatabaseUrl || '', ''],
    ),
  );

  let lastError: unknown = null;
  const seedSecretKey = resolveSeedSecretKey();
  const candidatePythonBinaries = [
    process.env.PYTHON,
    path.join(BACKEND_DIR, '.venv311local', 'bin', 'python'),
    path.join(BACKEND_DIR, '.venv311', 'bin', 'python'),
    path.join(BACKEND_DIR, '.venv311-mac', 'bin', 'python'),
    path.join(BACKEND_DIR, '.venv', 'bin', 'python'),
    'python',
    'python3',
  ].filter((value): value is string => Boolean(value));

  const hasCompatiblePythonVersion = (pythonBinary: string): boolean => {
    try {
      execFileSync(
        pythonBinary,
        [
          '-c',
          'import sys; raise SystemExit(0 if sys.version_info >= (3, 10) else 1)',
        ],
        { cwd: BACKEND_DIR, stdio: 'ignore', env: process.env as NodeJS.ProcessEnv }
      );
      return true;
    } catch {
      return false;
    }
  };

  for (const databaseUrl of candidateDatabaseUrls) {
    for (const pythonBinary of candidatePythonBinaries) {
      // Skip local absolute paths that do not exist on this machine.
      if (pythonBinary.includes(path.sep) && !existsSync(pythonBinary)) {
        continue;
      }
      if (!hasCompatiblePythonVersion(pythonBinary)) {
        continue;
      }

      try {
        execFileSync(pythonBinary, ['-X', 'utf8', '-c', script], {
          cwd: BACKEND_DIR,
          stdio: 'pipe',
          env: {
            ...process.env,
            ...(databaseUrl ? { DATABASE_URL: databaseUrl } : {}),
            SECRET_KEY: seedSecretKey,
            E2E_ADMIN_EMAIL: email,
            E2E_ADMIN_PASSWORD: password,
            PYTHONUTF8: '1',
          },
        });
        return;
      } catch (error) {
        lastError = error;
      }
    }
  }

  if (lastError instanceof Error) {
    throw lastError;
  }

  throw new Error('Failed to seed admin account');
}

async function postJson(ctx: any, path: string, body?: Json, headers?: Record<string, string>) {
  return await ctx.post(`${API_URL}${path}`, {
    data: body ?? {},
    headers: {
      'content-type': 'application/json',
      ...(headers ?? {}),
    },
  });
}

async function ensureRegistered(ctx: any, payload: Json) {
  const res = await postJson(ctx, '/api/v1/auth/register', payload);
  // 201: created, 409: already exists
  if (![201, 409].includes(res.status())) {
    const text = await res.text();
    throw new Error(`Register failed (${res.status()}): ${text}`);
  }
}

async function login(ctx: any, email: string, password: string): Promise<string> {
  const maxAttempts = 6;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const res = await postJson(ctx, '/api/v1/auth/login', { email, password });
    if (res.status() === 200) {
      const data = (await res.json()) as Json;
      const token = data?.access_token as string | undefined;
      if (!token) throw new Error('Login response missing access_token');
      return token;
    }

    // In local runs, the backend may have rate limiting enabled.
    // Retry politely on 429 to avoid flaky E2E setups.
    if (res.status() === 429 && attempt < maxAttempts) {
      const retryAfterHeader = res.headers()['retry-after'];
      let waitSeconds = retryAfterHeader ? parseInt(String(retryAfterHeader), 10) : NaN;

      if (!Number.isFinite(waitSeconds)) {
        const text = await res.text();
        const m = text.match(/try again in\\s+(\\d+)\\s+seconds/i);
        waitSeconds = m ? parseInt(m[1], 10) : 3;
      }

      await new Promise((r) => setTimeout(r, Math.max(1, waitSeconds) * 1000));
      continue;
    }

    const text = await res.text();
    throw new Error(`Login failed (${res.status()}): ${text}`);
  }

  throw new Error('Login failed: exceeded retry attempts');
}

async function createJob(ctx: any, token: string, job: Json): Promise<string> {
  const res = await postJson(ctx, '/api/v1/jobs', job, { authorization: `Bearer ${token}` });
  if (res.status() === 409) {
    const data = (await res.json()) as Json;
    const existingId = data?.error?.details?.existing_job_id as string | undefined;
    if (existingId) return existingId;
  }
  if (res.status() !== 201) {
    const text = await res.text();
    throw new Error(`Create job failed (${res.status()}): ${text}`);
  }
  const data = (await res.json()) as Json;
  const id = (data?.id ?? data?.job?.id) as string | undefined;
  if (!id) throw new Error('Create job response missing id');
  return id;
}

async function createResume(ctx: any, token: string, resume: Json): Promise<string> {
  const res = await postJson(ctx, '/api/v1/resumes/create', resume, { authorization: `Bearer ${token}` });
  if (res.status() !== 201) {
    const text = await res.text();
    throw new Error(`Create resume failed (${res.status()}): ${text}`);
  }
  const data = (await res.json()) as Json;
  const id = data?.id as string | undefined;
  if (!id) throw new Error('Create resume response missing id');
  return id;
}

async function publishResume(ctx: any, token: string, resumeId: string) {
  const res = await postJson(
    ctx,
    `/api/v1/resumes/${resumeId}/publish`,
    {},
    { authorization: `Bearer ${token}` }
  );
  // 200 OK is expected; 409/400 can happen if already published, tolerate.
  if (![200, 400, 409].includes(res.status())) {
    const text = await res.text();
    throw new Error(`Publish resume failed (${res.status()}): ${text}`);
  }
}

async function applyToJob(ctx: any, token: string, jobId: string, resumeId: string) {
  const res = await postJson(
    ctx,
    '/api/v1/applications/apply',
    { job_id: jobId, resume_id: resumeId, cover_letter: 'E2E seed application.' },
    { authorization: `Bearer ${token}` }
  );
  // 201 created, 409 already applied.
  if (![201, 409].includes(res.status())) {
    const text = await res.text();
    throw new Error(`Apply failed (${res.status()}): ${text}`);
  }
}

export default async function globalSetup() {
  const ctx = await request.newContext();
  const smokeAdmin = resolveSmokeAdminCredentials();

  try {
    ensureAdminAccount(smokeAdmin.email, smokeAdmin.password);
    writeSeedFile({ smokeAdmin });
  } catch (error) {
    const health = await ctx.get(`${API_URL}/health`).catch(() => null);
    if (!health?.ok()) {
      throw error;
    }
    throw new Error(
      `E2E global setup: failed to seed smoke admin account (${smokeAdmin.email}) while the backend API is healthy. ` +
        `The admin smoke test requires a freshly seeded admin to avoid shared login lockout contamination. ` +
        `Original error: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  // Fixed seed accounts used by Playwright specs.
  const studentEmail = 'john@example.com';
  const studentPassword = 'Student123!';
  const negativeStudentEmail = 'negative.student@example.com';
  const negativeStudentPassword = 'Student123!';
  const companyEmail = 'acme.hr@example.com';
  const companyPassword = 'Company123!';

  await ensureRegistered(ctx, {
    email: studentEmail,
    password: studentPassword,
    full_name: 'John Doe',
    phone: '+998901234567',
    role: 'student',
  });

  // Separate student account used for negative auth scenarios (wrong password attempts).
  await ensureRegistered(ctx, {
    email: negativeStudentEmail,
    password: negativeStudentPassword,
    full_name: 'Negative Student',
    phone: '+998901111999',
    role: 'student',
  });

  await ensureRegistered(ctx, {
    email: companyEmail,
    password: companyPassword,
    full_name: 'Acme HR',
    phone: '+998907654321',
    role: 'company',
    company_name: 'Acme Inc',
    company_website: 'https://acme.example',
  });

  const companyToken = await login(ctx, companyEmail, companyPassword);

  // Create one older job we pre-apply to, and one newer job for the "apply" test.
  const jobAId = await createJob(ctx, companyToken, {
    title: 'Senior Software Engineer',
    description:
      'We are looking for a Senior Software Engineer to build scalable services and APIs. ' +
      'You will collaborate with a cross-functional team and ship reliable features.',
    requirements: ['Python', 'FastAPI', 'PostgreSQL'],
    responsibilities: ['Build APIs', 'Write tests', 'Review code'],
    location: 'Tashkent',
    job_type: 'full_time',
    experience_level: 'senior',
    is_remote_allowed: true,
  });

  const jobBId = await createJob(ctx, companyToken, {
    title: 'Python Developer',
    description:
      'We are hiring a Python Developer to work on web services, data processing, and integrations. ' +
      'You will own features end-to-end and improve performance and reliability.',
    requirements: ['Python', 'SQL', 'Git'],
    responsibilities: ['Implement features', 'Fix bugs', 'Collaborate with product'],
    location: 'Tashkent',
    job_type: 'full_time',
    experience_level: 'mid',
    is_remote_allowed: false,
  });

  const studentToken = await login(ctx, studentEmail, studentPassword);

  const resumeId = await createResume(ctx, studentToken, {
    title: 'John Doe Resume',
    content: {
      personal_info: {
        name: 'John Doe',
        email: studentEmail,
      },
      skills: {
        technical: ['Python', 'FastAPI', 'SQL'],
      },
    },
  });

  await publishResume(ctx, studentToken, resumeId);
  await applyToJob(ctx, studentToken, jobAId, resumeId);

  // Keep jobBId unused so UI can apply successfully in tests.
  void jobBId;

  await ctx.dispose();
}
