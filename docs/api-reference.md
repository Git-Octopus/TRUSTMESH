# TrustMesh API Reference

## Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - User login & JWT issuance
- `POST /api/auth/verify-otp` - Verify email/phone OTP

## Profiles
- `GET /api/profile` - Get user profile & trust score
- `PUT /api/profile` - Update profile metadata

## Claims
- `POST /api/claims` - Create a new claim
- `GET /api/claims` - List user claims
- `GET /api/claims/:id` - Get claim details

## Verifications
- `POST /api/verification/verify` - Submit claim verification (Verifier role)
- `GET /api/verification/history` - Get verification audit trail

## Verifiers
- `GET /api/verifiers` - List active verifiers (Admin)
- `POST /api/verifiers` - Add new verifier (Admin)
