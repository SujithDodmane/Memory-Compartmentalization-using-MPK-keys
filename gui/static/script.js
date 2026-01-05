const terminalOutput = document.getElementById('terminal-output');
const statusProtection = document.getElementById('status-protection').querySelector('.value');
const statusSystem = document.getElementById('status-system').querySelector('.value');
const scenarioDesc = document.getElementById('scenario-desc');
const visOverlay = document.getElementById('vis-overlay');

let eventSource = null;

// Initialize Visualizer Grid
function initVisualizer() {
    const bufferSlots = document.getElementById('buffer-slots');
    bufferSlots.innerHTML = '';
    // Create 64 slots for 64 bytes
    for (let i = 0; i < 64; i++) {
        const span = document.createElement('div');
        span.className = 'byte';
        bufferSlots.appendChild(span);
    }

    resetVisualizer();
}

function runScenario(scenario) {
    // 1. Reset UI
    resetVisualizer();
    clearTerminal();

    // 2. Update Status & Description
    updateStatus(scenario);

    // 3. Connect to Stream
    if (eventSource) {
        eventSource.close();
    }

    appendLog(`> [SYSTEM] Initializing scenario: ${scenario}...`);

    eventSource = new EventSource(`/stream/${scenario}`);

    // State machine for visuals
    let hasLeaked = false;
    let overflowStarted = false;
    let leakedAddress = "0xTARGET";

    eventSource.onmessage = function (e) {
        const msg = e.data;
        appendLog(msg);

        // --- VISUALIZATION TRIGGERS BASED ON LOG OUTPUT ---

        // Capture initial allocation address for reference
        if (msg.includes("Zone S allocated at")) {
            const match = msg.match(/(0x[0-9a-fA-F]+)/);
            if (match) {
                leakedAddress = match[1];
                document.getElementById('secret-addr').textContent = leakedAddress;
            }
        }

        if (msg.includes("LEAK CAPTURED")) {
            hasLeaked = true;
            highlightStep(2); // "Overwrite Ptr" implies we found the target
            visOverlay.textContent = "WARNING: ADDRESS LEAKED";
            visOverlay.style.color = "var(--neon-pink)";

            // Show Pointer Hack with ACTUAL Captured Address
            const ptrVal = document.getElementById('ptr-value');
            ptrVal.textContent = leakedAddress; // Use the real address
            ptrVal.classList.add('hacked');
        }

        if (msg.includes("Sending") && msg.includes("payload")) {
            highlightStep(1); // Inject Payload
            visualizeOverflow(); // Start filling buffer
            visOverlay.textContent = "ATTACK: PAYLOAD INJECTION";
            visOverlay.style.color = "var(--accent-red)";
        }

        if (msg.includes("Applying Default-Deny Policy")) {
            // Visualize Locking
            document.getElementById('secret-lock').style.transform = "scale(1.2)";
            document.getElementById('vis-secret').style.borderColor = "var(--accent-green)";
            document.getElementById('vis-secret').style.boxShadow = "0 0 15px rgba(35, 134, 54, 0.3)";
            visOverlay.textContent = "PROTECTION: DEFAULT DENY ACTIVE";
            visOverlay.style.color = "var(--accent-green)";
        }

        if (msg.includes("Zone U allocated at")) {
            document.getElementById('vis-buffer').classList.add('flash-blue');
            document.getElementById('vis-buffer').style.borderColor = "var(--accent-blue)";
        }

        if (msg.includes("Zone S allocated at")) {
            document.getElementById('vis-secret').classList.add('flash-green');
        }

        if (msg.includes("Dereferencing victim_ptr")) {
            highlightStep(3); // Overwrite/Dereference Step
            document.getElementById('ptr-arrow').style.opacity = '1';

            visOverlay.textContent = "STATUS: DEREFERENCING POINTER...";
            visOverlay.style.color = "var(--accent-yellow)";
        }

        if (msg.includes("DENIED") || msg.includes("Hardware blocked access")) {
            visOverlay.textContent = "ACCESS DENIED: HARDWARE TRAP";
            visOverlay.style.color = "var(--accent-green)";
            document.getElementById('secret-lock').classList.add('pulse');
        }

        if (msg.includes("Secret has been OVERWRITTEN") || msg.includes("Secret was CORRUPTED")) {
            highlightStep(4);

            // Finalize Success
            const secretContent = document.getElementById('secret-content');
            secretContent.textContent = "CORRUPTED_SECRET_DATA";
            secretContent.classList.add('leaked');
            secretContent.classList.add('visible'); // MAKE VISIBLE ON COMPROMISE

            document.getElementById('secret-lock').style.display = 'none';
            document.getElementById('vis-secret').style.borderColor = 'var(--accent-red)';

            statusSystem.textContent = "COMPROMISED";
            statusSystem.className = 'value danger';

            visOverlay.textContent = "SYSTEM COMPROMISED: ILLEGAL WRITE DETECTED";
            visOverlay.style.color = "var(--accent-red)";
        }

        if (msg.includes("SEGMENTATION FAULT")) {
            visOverlay.textContent = "ATTACK MITIGATED: SEGFAULT";
            visOverlay.style.color = "var(--accent-green)";

            statusSystem.textContent = "ATTACK BLOCKED";
            statusSystem.className = 'value safe';

            document.getElementById('secret-lock').style.transform = "scale(1.5)";
        }

        if (scenario === 'build' && msg.includes("Build Complete")) {
            const btn = document.getElementById('btn-show-secret');
            btn.disabled = false;
            btn.style.opacity = '1';
            // Default is HIDDEN, so button should allow showing
            btn.innerHTML = '<span class="icon">👁️</span> Show Secure Data';
            btn.classList.remove('active');
        }
    };

    eventSource.addEventListener('close', function (e) {
        eventSource.close();
        appendLog("> [SYSTEM] Process terminated.");
    });

    eventSource.onerror = function (e) {
        eventSource.close();
    };
}

function toggleSecret() {
    const secretContent = document.getElementById('secret-content');
    const btn = document.getElementById('btn-show-secret');

    secretContent.classList.toggle('visible');
    const isVisible = secretContent.classList.contains('visible');

    if (isVisible) {
        btn.innerHTML = '<span class="icon">🚫</span> Hide Secure Data';
        btn.classList.add('active');
    } else {
        btn.innerHTML = '<span class="icon">👁️</span> Show Secure Data';
        btn.classList.remove('active');
    }
}


function appendLog(text) {
    const line = document.createElement('div');
    line.className = 'line';
    // Basic ANSI color parsing (very simple)
    if (text.includes("Result:")) {
        line.style.color = "var(--accent-yellow)";
        line.style.fontWeight = "bold";
    }
    line.textContent = text.replace(/\[\d+m/g, '').replace(/\[0m/g, ''); // Strip simple ANSI
    terminalOutput.appendChild(line);
    terminalOutput.scrollTop = terminalOutput.scrollHeight;
}

function clearTerminal() {
    terminalOutput.innerHTML = '';
}

function updateStatus(scenario) {
    const protection = document.getElementById('status-protection').querySelector('.value');

    protection.className = 'value';

    // Reset steps
    document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));

    if (scenario === 'build') {
        scenarioDesc.textContent = "Compiling source code and preparing binaries...";
        protection.textContent = "N/A";
    } else if (scenario === 'baseline') {
        scenarioDesc.textContent = "Running standard buffer overflow on unprotected app. Expect secret leak.";
        protection.textContent = "NONE";
        protection.classList.add('danger');
    } else if (scenario === 'aslr') {
        scenarioDesc.textContent = "ASLR enabled. Addresses are randomized. Attacker will try to leak address and overwrite the target pointer.";
        protection.textContent = "ASLR (Software)";
        protection.classList.add('warning');
    } else if (scenario === 'protected') {
        scenarioDesc.textContent = "Hybrid Protection (ASLR + MPK). Hardware keys lock the secret.";
        protection.textContent = "HYBRID (HW+SW)";
        protection.classList.add('safe');
    } else {
        // Default
    }
}

function resetVisualizer() {
    // Reset Bytes
    document.querySelectorAll('.byte').forEach(b => {
        b.className = 'byte'; // remove fill/malicious
    });

    // Reset Secret
    const sec = document.getElementById('secret-content');
    sec.textContent = "SUPER_SECRET_PASSWORD_12345";
    sec.className = 'secret-content'; // Removes 'visible' or 'leaked'
    sec.style.color = '';
    sec.style.textShadow = '';

    document.getElementById('secret-lock').style.display = 'block';
    document.getElementById('secret-lock').style.transform = 'scale(1)';

    document.getElementById('vis-secret').style.borderColor = '#484f58';

    // Reset Pointer
    const ptr = document.getElementById('ptr-value');
    ptr.textContent = "0x... (NULL)";
    ptr.classList.remove('hacked');

    visOverlay.textContent = "System Ready";
    visOverlay.style.color = "var(--text-secondary)";

    // Reset Animations
    document.getElementById('vis-buffer').classList.remove('flash-blue');
    document.getElementById('vis-secret').classList.remove('flash-green');

    // Reset Button (Hidden by default)
    const btn = document.getElementById('btn-show-secret');
    if (btn) {
        btn.innerHTML = '<span class="icon">👁️</span> Show Secure Data';
        btn.classList.remove('active');
        btn.disabled = true;
        btn.style.opacity = '0.5';
    }
}

function visualizeOverflow() {
    const bytes = document.querySelectorAll('.byte');
    let i = 0;
    // Slower animation: 50ms instead of 10ms
    const interval = setInterval(() => {
        if (i >= bytes.length) {
            clearInterval(interval);
            highlightStep(2); // Overflow complete
            return;
        }
        bytes[i].classList.add('malicious');
        i++;
    }, 50);
}

function highlightStep(stepNum) {
    document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
    document.getElementById(`step-${stepNum}`).classList.add('active');
}

// Init on load
document.addEventListener('DOMContentLoaded', initVisualizer);
