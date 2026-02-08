# Hybrid Fine-Grained In-Process Memory Compartmentalization (ASLR + MPK)
## Project Report

### 1. Introduction
Memory safety vulnerabilities, specifically buffer overflows and pointer corruption, remain one of the most critical classes of security flaws in modern software. While traditional defenses like Address Space Layout Randomization (ASLR) provide a significant barrier, they are often bypassed through information leaks. This project implements and demonstrates a hybrid protection mechanism that combines ASLR with Memory Protection Keys (MPK)-style compartmentalization to enforce fine-grained, in-process isolation, effectively neutralizing attacks even when addresses are leaked.

### 2. Problem Definition
#### Problem Statement
Standard memory protections are insufficient against sophisticated attacks.
-   **Buffer Overflows**: Allow attackers to overwrite adjacent memory structures.
-   **ASLR Limitations**: Once a single memory address is leaked (e.g., via a format string vulnerability or side-channel), the randomization is defeated, allowing unrestricted access to the process memory.
-   **Granularity Issues**: Page-level protections (mprotect) are often too coarse and expensive for frequent in-process context switching.

#### Background Information
Historically, the "arms race" between attackers and defenders has led from stack cookies to ASLR and DEP/NX. However, techniques like Return-Oriented Programming (ROP) and Just-In-Time (JIT) spraying have continuously challenged these defenses. Intel's Memory Protection Keys (MPK/PKU) offer a hardware-based solution for thread-local permission switching, allowing for performant compartmentalization. This project simulates this architecture to demonstrate its efficacy.

### 3. Objectives
#### Primary Objectives
-   To develop a vulnerable application demonstrating classic stack-based buffer overflow and pointer hijacking.
-   To implement an ASLR-enabled scenario and demonstrate how standard ASLR is bypassed via information leaks.
-   To implement a **Hybrid Protection System** (ASLR + MPK Simulation) that prevents data theft even when the attacker knows the memory layout.

#### Secondary Objectives
-   To create a real-time **Interactive GUI Dashboard** that visualizes memory operations, attack vectors, and protection mechanisms for educational and demonstration purposes.
-   To provide a comparative analysis of the attacker's success rate across Baseline, ASLR, and Protected scenarios.

### 4. Methodology
#### 4.1 Approach
The project adopts a "Red Team vs. Blue Team" simulation approach.
1.  **Vulnerable Target**: A C application with a strictly defined memory layout (Buffer -> Canary -> Pointer -> Secret).
2.  **Attack Vector**: A Python-based exploit generator that calculates offsets, parses leaked addresses, and constructs malicious payloads.
3.  **Visual Feedback**: A web-based dashboard (Flask + EventSource) that streams execution logs and visualizes memory state changes in real-time.

**(Conceptual Flow)**
[Attacker] -> [Inject Payload] -> [Buffer Overflow] -> [Overwrite Pointer] -> [Access Secret]
                                      |
                               (Protection Check)
                                      v
                             [Block/Trust/Trap]

#### 4.2 Procedures
1.  **Baseline Implementation**: Create `vulnerable_app.c` with no protection to establish a control case.
2.  **ASLR Integration**: Modify the app to allocate memory at random offsets (`aslr_app.c`).
3.  **Protection Logic**: Implement `protected_app.c` using a "monitor" design pattern to simulate MPK checks before pointer dereferencing.
4.  **Exploit Development**: Write `run_exploit.py` to automate the attack chain (Leak -> Calculate -> Pwn).
5.  **GUI Development**: Build a Frontend (HTML/CSS/JS) to visualize the binary memory slots and attack progress.

### 5. Project Execution
#### 5.1 Planning and Design
-   **Memory Model**: more complex than a standard stack, designed with a custom struct `MemoryLayout` to facilitate easier visualization of the "Buffer Overflow to Pointer Hijack" path.
-   **Safety**: Decided to use simulated MPK logic in user-space software checks to ensure the demo runs on non-server hardware while proving the architectural concept.

#### 5.2 Implementation
-   **C Backend**: Implemented `Zone` structures. The "Protected" app separates the `Secret` execution domain from the `Buffer` domain.
-   **Python Interfacing**: Used `subprocess.Popen` for real-time interaction with the compiled binaries, capturing `stdout` to drive the GUI.
-   **GUI**: Implemented a "Cyberpunk" aesthetic dashboard to make the abstract memory concepts visually engaging. Added `EventSource` for server-sent events to stream the attack steps.

### 6. Tools and Techniques Used
#### 6.1 Tools
-   **GCC**: Compiler for the C target applications.
-   **Python 3**: For the exploit generation engine and the Flask web server.
-   **Flask**: Web framework for the dashboard backend.
-   **HTML5/CSS3/JavaScript**: For the frontend visualization (Canvas/DOM manipulation).
-   **Bash**: For orchestration scripts (`start_dashboard.sh`, `run_full_demo.sh`).

#### 6.2 Techniques
-   **Input Stream Injection**: Sending raw bytes to `stdin` of the target process to simulate network payloads.
-   **Address Leak Parsing**: Regex matching on process output to simulate the "reading" of leaked pointers.
-   **Server-Sent Events (SSE)**: For low-latency streaming of terminal logs to the browser.
-   **DOM Animation**: CSS3 animations to visualize buffer filling, overflows, and protection "shields".

### 7. Partial Results
#### 7.1 Initial Findings
-   **Baseline**: The secret was compromised 100% of the time. The dashboard correctly visualized the "overflow" turning memory slots red.
-   **ASLR**: Partially effective. Without leaked addresses, the attack crashed (Segfault). With leaks (simulated via debug output), the attack succeeded.

#### 7.2 Iterative Improvements
-   **Visualization Refinement**: Initial animations were too "game-like" (projectiles). Refined into professional "Data Flow" and "Signal Integrity" visualizations.
-   **Privacy**: Changed the secret display to be "Hidden by Default" to better represent secure memory contents.

### 8. Results and Discussion
#### 8.1 Final Results
-   **Scenario 1 (Unprotected)**: Attack Success. Secret overwritten with malicious data.
-   **Scenario 2 (ASLR Only)**: Attack Success (with leak). Address randomization was bypassed by reading the leaked pointer.
-   **Scenario 3 (Hybrid Protection)**: **Attack Blocked**. Even with the correct address and a successful buffer overflow, the dereference of the pointer triggered the simulated hardware trap (Access Denied).

#### 8.2 Discussion
The results validate the hypothesis: **Architecture > Obscurity**.
ASLR relies on the secrecy of addresses (obscurity). Once that is lost, the defense collapses. The Hybrid MPK approach relies on **Authorization**. Even if the attacker knows *where* the data is, they lack the *key* to access it. This demonstrates a Zero-Trust architecture applied to memory.

### 9. Prototype (Software Demonstration)
#### 9.1 Prototype Description
The prototype is a self-contained "Memory Defense Dashboard".
-   **Interactive Console**: Users select scenarios (Baseline, ASLR, Protected).
-   **Visualizer**: A dynamic grid representing RAM bytes, pointers, and secret zones.
-   **Real-Time Terminal**: Shows the attacker's shell output alongside the visualizer.

#### 9.2 Development Process
Built in three sprints:
1.  Core C Logic & Exploits.
2.  Basic Web Interface & Connectivity.
3.  Advanced Animations & Polish.

#### 9.3 Testing and Validation
-   Validated against generic buffer overflow payloads.
-   Verified "Fail-Closed" behavior: The protected app defaults to denying access if the key is invalid.
-   Cross-verified across multiple runs to ensure ASLR randomization was actually occurring (addresses changed every run).

### 10. Conclusion
#### 10.1 Summary
This project successfully demonstrated the limitations of current ASLR implementations and the robustness of fine-grained compartmentalization. We built a fully functional end-to-end demonstration platform that makes complex memory security concepts accessible and visible.

#### 10.2 Personal Reflection
Working on this project highlighted the fragility of low-level software. Seeing how easily a single missing bound check can compromise an entire system—and conversely, how a strong architectural guarantee (MPK) can mitigate it—was a profound learning experience. It emphasized the need for "Secure by Design" principles over patch-based security.

### 11. Visuals
*(Refer to the Dashboard for live visualizations)*
1.  **Buffer Overflow**: Illustrated by a wave of red bytes consuming the blue "safe" buffer.
2.  **Pointer Corruption**: The pointer value indicator glitches and changes to the target address.
3.  **Protection Shield**: In the Protected scenario, a lock icon pulses and rejects the incoming access attempt.
4.  **Dashboard Layout**:
    -   *Left*: Control Panel & Status.
    -   *Center*: Memory Visualizer (RAM Simulation).
    -   *Right*: Attacker Terminal Output.

### 12. Outcome of the Work
-   **Product**: A deployable educational tool (`Memory Defense Dashboard`).
-   **Codebase**: Open-source repository pushed to GitHub (`Memory-Compartmentalization-using-MPK-keys`) containing C source, Python exploits, and the visualization engine.
-   **Documentation**: Comprehensive walkthroughs and this technical report.
