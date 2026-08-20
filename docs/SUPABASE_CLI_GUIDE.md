# 📚 Supabase CLI Guide — Ramesh Polisetty

## Table of Contents

1. [Installation](#installation)
2. [Authentication](#authentication)
3. [Project Management](#project-management)
4. [Database Operations](#database-operations)
5. [Storage Operations](#storage-operations)
6. [Troubleshooting](#troubleshooting)

---

## Installation

### Windows (PowerShell)

```powershell
npm install -g supabase
```

### macOS

```bash
brew install supabase/tap/supabase
```

### Linux

```bash
npx supabase init
```

### Verify Installation

```bash
supabase --version
```

---

## Authentication

### Login

```bash
supabase login
```

Opens browser for OAuth authentication. A token is stored locally.

### Check Login Status

```bash
supabase projects list
```

If this works, you're logged in.

### Logout

```bash
supabase logout
```

---

## Project Management

### List Your Projects

```bash
supabase projects list
```

### Link to a Project

```bash
supabase link --project-ref YOUR_PROJECT_ID
```

Find your Project ID in: Dashboard → Settings → General

### Check Status

```bash
supabase status
```

### Unlink Project

```bash
supabase unlink
```

---

## Database Operations

### Push Migrations

Deploy all pending migrations to your remote database:

```bash
supabase db push
```

### Pull Remote Schema

Download the current remote schema to local:

```bash
supabase db pull
```

### Diff Changes

See what changes would be applied:

```bash
supabase db diff
```

### Reset Local Database

⚠️ **Requires Docker** — resets local database to migration state:

```bash
supabase db reset
```

### Dump Database

Create a backup:

```bash
supabase db dump > backup.sql
```

### List Migrations

```bash
supabase migration list
```

### Create New Migration

```bash
supabase migration new create_users_table
```

This creates a timestamped SQL file in `supabase/migrations/`.

---

## Storage Operations

### List Objects in Bucket

```bash
supabase storage ls photos/
```

### Copy Object

```bash
supabase storage cp local-file.jpg photos/remote-file.jpg
```

### Move Object

```bash
supabase storage mv photos/old-name.jpg photos/new-name.jpg
```

### Remove Object

```bash
supabase storage rm photos/file-to-delete.jpg
```

### Create Bucket

⚠️ **CLI doesn't support bucket creation** — use Dashboard:

1. Go to Storage in Dashboard
2. Click "New bucket"
3. Set name: `photos`
4. Set public: Yes
5. Click Create

---

## Environment Variables

### Set Project Secrets

```bash
supabase secrets set MY_SECRET=value
```

### List Secrets

```bash
supabase secrets list
```

### Delete Secret

```bash
supabase secrets delete MY_SECRET
```

---

## Edge Functions

### Deploy Function

```bash
supabase functions deploy my-function
```

### Invoke Function

```bash
supabase functions invoke my-function --body '{"key": "value"}'
```

### List Functions

```bash
supabase functions list
```

---

## Local Development

### Start Local Stack

```bash
supabase start
```

Requires Docker Desktop running. Starts:
- PostgreSQL on port 54322
- API on port 54321
- Studio on port 54323

### Stop Local Stack

```bash
supabase stop
```

### Stop and Delete Data

```bash
supabase stop --no-backup
```

---

## Organization Management

### List Organizations

```bash
supabase orgs list
```

### Switch Organization

```bash
supabase orgs switch ORG_ID
```

---

## Troubleshooting

### "failed to inspect service"

This usually means Docker isn't running (for local development):

```bash
# Start Docker Desktop, then:
supabase start
```

### "not linked to a project"

```bash
supabase link --project-ref YOUR_PROJECT_ID
```

### "unauthorized"

```bash
supabase logout
supabase login
```

### "migration already applied"

Check migration status:

```bash
supabase migration list
```

To repair migration state:

```bash
supabase migration repair --status applied MIGRATION_NAME
```

### Debug Mode

Add `--debug` to any command for verbose output:

```bash
supabase db push --debug
```

---

## Common Workflows

### Add a New Table

1. Create migration file:
   ```bash
   supabase migration new create_profiles_table
   ```

2. Edit the generated file in `supabase/migrations/`

3. Push to remote:
   ```bash
   supabase db push
   ```

### Update RLS Policies

1. Edit migration file with new policies
2. Push changes:
   ```bash
   supabase db push
   ```

### Backup Database

```bash
supabase db dump > backup_$(date +%Y%m%d).sql
```

### Deploy Storage Rules

Storage rules are configured in `supabase/config.toml` and applied via migrations.

---

## Useful Links

- [Supabase CLI Documentation](https://supabase.com/docs/reference/cli)
- [Supabase Dashboard](https://app.supabase.com)
- [Supabase GitHub](https://github.com/supabase/cli)
