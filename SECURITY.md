# Security Policy

## Supported Versions

Only the latest published version of `kyos-cli` receives security fixes.

| Version | Supported |
| ------- | --------- |
| latest  | Yes       |
| older   | No        |

## Reporting a Vulnerability

Please **do not** open a public GitHub issue for security vulnerabilities.

Use GitHub's private vulnerability reporting:

1. Go to the [Security tab](https://github.com/ajesskit/kyos/security).
2. Click **"Report a vulnerability"**.
3. Fill in the details and submit.

You will receive a response within **7 days**.

## Scope

Relevant vulnerability classes for this tool:

- Path traversal or arbitrary file writes
- Command injection via CLI arguments
- Malicious catalog entries that produce unsafe output files
