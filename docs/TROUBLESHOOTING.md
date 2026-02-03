# Troubleshooting (Local Dev)

This document records fixes applied in this repo so the same issues do not reoccur.

## 1) Docker Desktop not running

**Symptom**

- `open //./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified`

**Fix**

- Start Docker Desktop first. The dev script now checks `docker info` and fails fast if the engine is unavailable.

## 2) Postgres connection fails with `ECONNREFUSED ::1:5433`

**Symptom**

- Backend logs show attempts to connect to `::1` (IPv6 loopback).

**Fix**

- Use IPv4 loopback in backend local env:
  - `DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5433/mercurjs?sslmode=disable`
- The dev script enforces this value for local backend runs.

## 3) Integration tests fail with `The server does not support SSL connections`

**Cause**

- Medusa test-utils enables SSL when the DB URL does not include `localhost`.

**Fix**

- Tests use `localhost:5433` with `sslmode=disable` and force IPv4 DNS resolution:
  - `NODE_OPTIONS=--dns-result-order=ipv4first`

## 4) Chat build snapshot error

**Symptom**

- `failed to prepare extraction snapshot ... parent snapshot ... does not exist`

**Fix**

- Restart Docker Desktop.
- If it persists: `docker builder prune -a` then re-run the dev script.
- You can skip chat temporarily: `powershell -ExecutionPolicy Bypass -File .\scripts\dev.ps1 -NoChat`

## 5) PowerShell parsing error in dev script

**Symptom**

- `La référence de variable n’est pas valide` when running `.\scripts\dev.ps1`

**Fix**

- Fixed in `scripts/dev.ps1` by renaming the parameter and using `${}` interpolation.
