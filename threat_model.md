# Threat Model: Hybrid Fine-Grained In-Process Memory Compartmentalization

## 1. Attacker Assumptions
- **Access**: The attacker has already exploited a vulnerability (e.g., buffer overflow) in the "Untrusted Zone" (Zone U) of the process.
- **Capabilities**:
    - Can overwrite memory adjacent to the vulnerable buffer.
    - Can control the instruction pointer (RIP) or data pointers within the process context.
    - **No Kernel Privileges**: The attacker cannot modify kernel structures or page tables directly.
    - **No Physical Access**: The attacker is remote or local unprivileged.
- **Goal**: Read or modify data in the "Sensitive Zone" (Zone S) or execute code with Zone S privileges.

## 2. Assets to Protect
- **Cryptographic Keys**: Private keys, session keys stored in memory.
- **User Credentials**: Passwords, tokens.
- **Control Data**: Function pointers or sensitive state flags that reside in Zone S.

## 3. Security Objectives
- **Confidentiality**: Zone S data must not be readable by code executing in Zone U context.
- **Integrity**: Zone S data must not be writable by code executing in Zone U context.
- **Containment**: Even if Zone U is completely compromised, the damage must be limited to Zone U. Zone S should remain inaccessible until explicitly and legitimately accessed by trusted code.

## 4. Defense Mechanism (Hybrid)
- **ASLR (Address Space Layout Randomization)**:
    - Randomizes the base addresses of Zone U and Zone S.
    - Makes it difficult for the attacker to hardcode addresses.
- **MPK (Memory Protection Keys)**:
    - Assigns a hardware tag (Protection Key) to Zone S pages.
    - Enforces a "Default Deny" policy.
    - Only specific, small code gadgets (gatekeepers) can temporarily enable access to Zone S.
