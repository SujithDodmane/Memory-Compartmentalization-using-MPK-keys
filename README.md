# Hybrid Fine-Grained In-Process Memory Compartmentalization (ASLR + MPK)

## 📌 Project Overview

This project demonstrates a novel **Hybrid Protection System** that effectively combines **Address Space Layout Randomization (ASLR)** with **Memory Protection Keys (MPK)** simulations. The goal is to enforce fine-grained, in-process memory isolation to neutralize buffer overflow and pointer corruption attacks, even when traditional defenses like ASLR are bypassed.

### The Problem
Classic memory defenses are insufficient against modern attacks:
- **Buffer Overflows**: allow attackers to overwrite adjacent memory control structures.
- **ASLR Weakness**: Randomized addresses can be bypassed if a single pointer is leaked (e.g., via format string vulnerabilities), rendering the protection useless.
- **Coarse Granularity**: Standard page-permissions (`mprotect`) are too slow for frequent context switches.

### The Solution
This project implements a "Zero-Trust" architecture within a single process. By using simulated MPK gates, we ensure that **knowing the address (ASLR bypass) is not enough to access the data**. The attacker must also hold the correct "key" (hardware permission), effectively blocking unauthorized access even after a successful exploit.

---

## 🚀 Features

- **Vulnerable Application**: A C program intentionally designed with stack-based buffer overflows.
- **ASLR Demonstration**: Shows how memory randomization works and how it fails against pointer leaks.
- **Hybrid Protection**: A robust defense layer that uses "Guard Zones" and permission checks to trap illegal access.
- **Attack Simulation**: Automated Python scripts that act as a "Red Team" to generate payloads, calculate offsets, and execute exploits.
- **Real-Time Dashboard**: A "Cyberpunk"-themed web interface (Flask + EventSource) that visualizes RAM memory, buffer fills, pointer corruption, and defense activation in real-time.
- **Performance Benchmark**: Tools to measure the overhead of the protection mechanism.

---

## 🛠 Prerequisites

Before running the project, ensure your environment handles the following dependencies:

### System Requirements
- **Operating System**: Linux (Recommended: Ubuntu/Debian based)
- **Shell**: Bash

### Software Dependencies
- **GCC**: GNU Compiler Collection (for compiling C programs).
- **Make**: Build automation tool.
- **Python 3**: For exploit generation and the dashboard server.
- **Pip**: Python package manager.

### Python Libraries
The dashboard requires `Flask`. It will attempt to verify/install it automatically, but you can install it manually:
```bash
pip3 install flask
```

### Optional Tools
- **xdg-open**: To automatically open the dashboard in your default browser.

---

## 📦 Installation

1.  **Clone the Repository**
    ```bash
    git clone https://github.com/SujithDodmane/Memory-Compartmentalization-using-MPK-keys.git
    cd Memory-Compartmentalization-using-MPK-keys
    ```

2.  **Install System Dependencies (Ubuntu/Debian)**
    If you don't have `gcc` or `python3` installed, run:
    ```bash
    sudo apt update
    sudo apt install build-essential python3 python3-pip
    ```

3.  **Verify Environment**
    Ensure you have `gcc` and `python3`:
    ```bash
    gcc --version
    python3 --version
    ```

---

## ▶️ How to Run

You can run the project in **Terminal Mode** (for quick verification) or **Dashboard Mode** (for the full visual experience).

### Option 1: Full Automated Demo (Terminal)
This script builds the project and runs through all attack scenarios (Baseline, ASLR, Protected) sequentially.

```bash
./run_full_demo.sh
```

**What you will see:**
1.  **Phase 2 (Baseline)**: Attack succeeds; "Secret Leaked".
2.  **Phase 3 (ASLR)**: Attack succeeds; ASLR is bypassed via a leak.
3.  **Phase 6 (Protected)**: Attack BLOCKED; The program crashes safely (Segfault) instead of leaking data.

### Option 2: Interactive Dashboard (GUI)
This is the recommended way to present the project. It launches a web server and visualizes memory in real-time.

1.  **Start the Dashboard**
    ```bash
    ./start_dashboard.sh
    ```
    *This will start the Flask server and try to open your web browser to `http://127.0.0.1:5000`.*

2.  **Use the Dashboard**
    - Click **"Run Baseline Attack"**: Watch the red buffer overflow corrupt memory.
    - Click **"Run ASLR Attack"**: See the memory addresses change (randomization) but still get compromised.
    - Click **"Run Protected Attack"**: Watch the "Shield" icon activate and block the access.

### Option 3: Manual Execution
If you want to run specific steps manually:

1.  **Build the executables**
    ```bash
    make clean
    make all aslr_app protected_app
    ```

2.  **Run a specific attack**
    *   **Baseline Attack**:
        ```bash
        make run_attack
        ```
    *   **ASLR Attack**:
        ```bash
        python3 run_exploit.py ./aslr_app
        ```
    *   **Protected Attack**:
        ```bash
        python3 run_exploit.py ./protected_app
        ```

3.  **Run Benchmarks**
    ```bash
    gcc -o benchmark src/benchmark.c src/mpk_lib.c -I.
    ./benchmark
    ```

---

## 📂 Project Structure

```plaintext
├── src/
│   ├── vulnerable_app.c   # Baseline vulnerable application
│   ├── aslr_app.c         # Application with ASLR enabled
│   ├── protected_app.c    # Application with Hybrid MPK protection
│   ├── mpk_lib.c          # Library for simulated MPK functions
│   ├── exploit_gen.py     # Python script to generate malicious payloads
│   └── output.c           # Helper for formatted terminal output
├── gui/
│   ├── app.py             # Flask backend for the dashboard
│   ├── templates/         # HTML frontend
│   └── static/            # CSS/JS assets
├── run_full_demo.sh       # Automated demo script
├── start_dashboard.sh     # Launcher for the GUI dashboard
├── Makefile               # Build configuration
└── Detailed_Project_Report.md # Full technical report
```

---

## 📊 Evaluation Results

| Scenario | Defense | Outcome | Note |
| :--- | :--- | :--- | :--- |
| **Baseline** | None | ❌ **Compromised** | Buffer overflow trivially overwrites data. |
| **ASLR Only** | Randomization | ❌ **Compromised** | Bypassed using a simulated address leak. |
| **Protected** | **ASLR + MPK** | ✅ **SECURE** | **Access Denied**. The hardware simulation blocked the unauthorized read. |

## 🤝 Contributing
Feel free to submit issues or pull requests if you find bugs or want to improve the visualization.

## 📜 License
This project is open-source.
