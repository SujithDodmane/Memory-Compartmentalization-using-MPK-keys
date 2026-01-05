# Evaluator Demonstration Guide
## Hybrid Fine-Grained In-Process Memory Compartmentalization

Use this guide to present your project step-by-step. All commands should be run from the root directory:
`/home/sujith/Projects/Memory Compartmetalization/`

### 1. Preparation
Ensure everything is clean and built before you start talking.
```bash
make clean
make all aslr_app protected_app
gcc -o benchmark src/benchmark.c src/mpk_lib.c -I.
```

---

### 2. The Demonstration Flow

#### PHASE A: The Problem (Baseline Vulnerability)
**Goal**: Show that standard C programs are unsafe and secrets can be stolen easily.

1.  **Explain**: "First, I will run the baseline application. It has a standard buffer overflow vulnerability and contains a secret password in memory."
2.  **Run**:
    ```bash
    make run_attack
    ```
3.  **Point Out**:
    *   The red `[ATTACK]` logs showing memory corruption.
    *   The final result: `Secret has been OVERWRITTEN/CORRUPTED!`.
    *   **Conclusion**: "Without protection, the attacker successfully accessed the sensitive zone."

#### PHASE B: The Insufficient Solution (ASLR Only)
**Goal**: Show that Address Space Layout Randomization (ASLR) partitions memory but can be bypassed.

1.  **Explain**: "Now, I am enabling ASLR. The secret and the buffer are in different, randomized memory zones. However, if an attacker can leak a pointer, they can still bypass this."
2.  **Run**:
    ```bash
    python3 run_exploit.py ./aslr_app
    ```
3.  **Point Out**:
    *   The `[ZONE]` logs showing randomized addresses (e.g., `0x7f...`).
    *   The `[EXPLOIT]` log showing "LEAK CAPTURED".
    *   The result: `Secret was CORRUPTED via pointer overwrite!`.
    *   **Conclusion**: "ASLR randomizes locations, but once the address is known, the protection fails."

#### PHASE C: The Solution (Hybrid Protection)
**Goal**: Show the core contribution. Even with the leak and the vulnerability, the attack fails.

1.  **Explain**: "Finally, I enable my Hybrid Protection system. It uses simulated Intel MPK to lock the Sensitive Zone. Even though the attacker performs the **exact same attack**, the CPU will reject the access."
2.  **Run**:
    ```bash
    python3 run_exploit.py ./protected_app
    ```
3.  **Point Out**:
    *   The `[SECURE] Applying Default-Deny Policy` log.
    *   The `[DENIED] Hardware blocked access` log (in Magenta/Purple).
    *   The `SEGMENTATION FAULT` result.
    *   **Conclusion**: "The system successfully contained the threat. The program crashed safely instead of leaking the secret."

#### PHASE D: Performance (Evaluation)
**Goal**: Quantify the cost of this security.

1.  **Explain**: "We evaluated the performance overhead of entering and exiting these protected zones."
2.  **Run**:
    ```bash
    ./benchmark
    ```
3.  **Point Out**:
    *   The explicit overhead time (in microseconds).
    *   **Note**: Remind them that "This uses software emulation (mprotect), so it is ~2.8µs. On real hardware, this would be nanoseconds."

---

### Summary for Evaluator
End with this sentence:
> "This project demonstrates that we can turn catastrophic security failures (data leaks) into safe system terminations using fine-grained in-process compartmentalization."
