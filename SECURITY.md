# Security Policy

## Supported Versions

The following versions of the project are currently being supported with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability within this project, please send an e-mail to security@nftmarketplace.com. All security vulnerabilities will be promptly addressed.

## Automated Security Auditing Pipeline

This project uses an automated security auditing pipeline integrated into GitHub Actions to ensure code security on every commit.

### Tools Used

1.  **Slither**: A Solidity static analysis framework written in Python. It detects vulnerabilities like reentrancy, uninitialized variables, and more.
2.  **Aderyn**: A Rust-based static analyzer for Solidity. It provides fast feedback on common vulnerabilities.
3.  **Hardhat Security Tests**: Custom invariant tests written in TypeScript using Viem to ensure critical contract states remain valid.

### Workflow

The security workflow runs on every push and pull request to the `main` branch. It performs the following steps:

1.  **Checkout & Install**: Sets up the environment and installs dependencies.
2.  **Compile Contracts**: Compiles the Solidity contracts using Hardhat.
3.  **Run Slither**: Executes Slither on the `packages/contracts` directory.
    *   **Configuration**: `packages/contracts/slither.config.json` filters for high and medium impact vulnerabilities.
    *   **Output**: A Markdown report is automatically posted as a comment on Pull Requests.
    *   **Failure Condition**: The build fails if any "High" severity vulnerabilities are found.
4.  **Run Aderyn**: Executes Aderyn for a secondary fast check.
    *   **Output**: A report is generated and uploaded as an artifact.
5.  **Hardhat Invariant Tests**: (Run as part of the standard test suite) Checks that contract invariants (e.g., balance consistency) hold true.

### Interpreting Output

*   **Slither Report**: Look for the "High" severity section. These must be fixed before merging. "Medium" and "Low" issues should be reviewed but may not block the build depending on configuration.
*   **Aderyn Report**: Check the uploaded artifact or the console output for any flagged issues.
*   **Invariant Tests**: If these fail, it means a core assumption about the contract's state has been violated.

### Local Execution

To run the security checks locally:

**Slither:**
```bash
cd packages/contracts
slither .
```

**Aderyn:**
```bash
cd packages/contracts
aderyn .
```

**Invariant Tests:**
```bash
cd packages/contracts
npx hardhat test test/security/Invariant.test.ts
```
