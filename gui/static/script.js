const terminalOutput = document.getElementById('terminal-output');
const statusProtection = document.getElementById('status-protection').querySelector('.value');
const statusSystem = document.getElementById('status-system').querySelector('.value');
const scenarioDesc = document.getElementById('scenario-desc');
const visOverlay = document.getElementById('vis-overlay');

let eventSource = null;

// Global variable to hold secret data to show only when toggled
// Global variable to hold secret data to show only when toggled
let secretDataCache = {
    hex: "5345435245545f444154415f3132332e", // "SECRET_DATA_123."
    char: "SECRET_DATA_123."
};
let hasSeenInputPreview = false; // Reset on session start 

// Initialize Visualizer Grid
function initVisualizer() {
    const bufferSlots = document.getElementById('buffer-slots');
    bufferSlots.innerHTML = '';
    // Create 16 slots for 16 bytes (Reduced from 64)
    for (let i = 0; i < 16; i++) {
        const span = document.createElement('div');
        span.className = 'byte';
        span.textContent = '.'; // Placeholder
        bufferSlots.appendChild(span);
    }

    // Initialize Secret Slots
    const secretSlots = document.getElementById('secret-slots');
    if (secretSlots) {
        secretSlots.innerHTML = '';
        for (let i = 0; i < 16; i++) {
            const span = document.createElement('div');
            span.className = 'byte';
            span.textContent = '*';
            span.title = 'Encrypted';
            secretSlots.appendChild(span);
        }
    }

    resetVisualizer();
}

function runScenario(scenario) {
    // 1. Reset UI
    hasSeenInputPreview = false;
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
    let leakedAddress = "0xTARGET";

    eventSource.onmessage = function (e) {
        const msg = e.data;
        if (msg.trim() !== "") appendLog(msg); // Avoid blank lines

        // --- VISUALIZATION TRIGGERS BASED ON LOG OUTPUT ---

        // Capture Initial Secret from Build Process
        if (msg.includes("[INIT_SECRET]")) {
            // Format: [INIT_SECRET] HEX|CHAR
            const parts = msg.split(" ");
            if (parts.length >= 2) {
                const dataRaw = parts[1];
                const [hexData, charData] = dataRaw.split("|");

                // Update Global Cache & Initial Reference
                secretDataCache = { hex: hexData, char: charData };
                window.initialSecretChar = charData;

                renderSecret();
                appendLog("> [SYSTEM] Synced initial secret from build.");
            }
        }

        // Capture initial allocation address for reference
        if (msg.includes("Zone S allocated at")) {
            const match = msg.match(/(0x[0-9a-fA-F]+)/);
            if (match) {
                leakedAddress = match[1];
                const addrElem = document.getElementById('secret-addr');
                if (addrElem) addrElem.textContent = leakedAddress;
            }
        }

        // Memory Dump Parsing: [MEM_DUMP] ZONE_NAME HEX|CHARS
        if (msg.includes("[MEM_DUMP]")) {
            const parts = msg.split(" ");
            if (parts.length >= 3) {
                const zone = parts[1];
                const dataRaw = parts[2];
                const [hexData, charData] = dataRaw.split("|");

                if (zone === "INPUT_PREVIEW") {
                    hasSeenInputPreview = true;
                    // Trigger buffer FILL animation with input data
                    updateBufferVisualizer(hexData, charData, true);
                } else if (zone === "ZONE_U") {
                    // Trigger buffer SNAP update (final state)
                    updateBufferVisualizer(hexData, charData, false);
                } else if (zone === "ZONE_S") {
                    // Only animate if we've already started the attack phase
                    updateSecretVisualizer(hexData, charData, hasSeenInputPreview);
                }
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
            const lockIcon = document.getElementById('secret-lock') || document.getElementById('lock-icon');
            if (lockIcon) lockIcon.style.transform = "scale(1.2)";

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
            const arrow = document.getElementById('ptr-arrow');
            if (arrow) arrow.style.opacity = '1';

            visOverlay.textContent = "STATUS: DEREFERENCING POINTER...";
            visOverlay.style.color = "var(--accent-yellow)";
        }

        if (msg.includes("DENIED") || msg.includes("Hardware blocked access")) {
            visOverlay.textContent = "ACCESS DENIED: HARDWARE TRAP";
            visOverlay.style.color = "var(--accent-green)";
            const lockIcon = document.getElementById('secret-lock') || document.getElementById('lock-icon');
            if (lockIcon) lockIcon.classList.add('pulse');
        }

        if (msg.includes("Secret has been OVERWRITTEN") || msg.includes("Secret was CORRUPTED")) {
            highlightStep(4);

            // Finalize Success
            const lockIcon = document.getElementById('secret-lock') || document.getElementById('lock-icon');
            if (lockIcon) lockIcon.style.display = 'none';

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

            const lockIcon = document.getElementById('secret-lock') || document.getElementById('lock-icon');
            if (lockIcon) lockIcon.style.transform = "scale(1.5)";
        }

        if (scenario === 'build' && msg.includes("Build Complete")) {
            const btn = document.getElementById('btn-show-secret');
            if (btn) {
                btn.disabled = false;
                btn.style.opacity = '1';
                // Default is HIDDEN, so button should allow showing
                if (btn.classList.contains('active')) {
                    btn.innerHTML = '<span class="icon">🚫</span> Hide Secure Data';
                } else {
                    btn.innerHTML = '<span class="icon">👁️</span> Show Secure Data';
                }
            }
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

// Unified queue for all visualization updates to ensure correct timing
let visualizationQueue = [];
let isVisualizing = false;

function addToQueue(type, data) {
    visualizationQueue.push({ type, data });
    processVisualizationQueue();
}

function processVisualizationQueue() {
    if (isVisualizing || visualizationQueue.length === 0) return;

    const task = visualizationQueue.shift();
    isVisualizing = true;

    if (task.type === 'buffer_fill') {
        const slots = document.querySelectorAll('#buffer-slots .byte');
        const update = task.data;
        const totalChars = update.char.length;
        let i = 0;

        // Slowed down animation for fill (60ms per byte)
        const interval = setInterval(() => {
            if (i >= totalChars) {
                clearInterval(interval);
                isVisualizing = false;
                processVisualizationQueue(); // Next task
                return;
            }

            // Only update buffer slots (limit to 16)
            if (i < 16) {
                const char = update.char[i];
                const hex = (update.hex && i * 2 + 2 <= update.hex.length) ? update.hex.substr(i * 2, 2) : "??";
                const slot = slots[i];

                if (slot) {
                    slot.textContent = char;
                    slot.title = `Hex: 0x${hex}`;
                    slot.classList.add('flash-cell');
                    setTimeout(() => slot.classList.remove('flash-cell'), 200);

                    if (char === 'A' || char === 'B' || char === 'X') {
                        slot.classList.add('malicious');
                    } else {
                        slot.classList.remove('malicious');
                    }
                }
            }
            i++;
        }, 100); // Further slowed down to 100ms
    }
    else if (task.type === 'secret_update') {
        // Animate secret overwrite character-by-character
        const slots = document.querySelectorAll('#secret-slots .byte');
        const update = task.data;
        const totalChars = update.char.length;
        let i = 0;

        // Initial flash
        const secVis = document.getElementById('vis-secret');
        if (secVis) {
            secVis.classList.add('flash-green');
            setTimeout(() => secVis.classList.remove('flash-green'), 300);
        }

        const interval = setInterval(() => {
            if (i >= totalChars) {
                clearInterval(interval);

                // Finalize the cache state for future renders (e.g. show/hide toggle)
                secretDataCache = update;

                isVisualizing = false;
                setTimeout(processVisualizationQueue, 1000); // 1s pause after full overwrite
                return;
            }

            const char = update.char[i];
            const hex = (update.hex && i * 2 + 2 <= update.hex.length) ? update.hex.substr(i * 2, 2) : "??";
            const slot = slots[i];

            if (slot) {
                // If it's a '*', we are in hidden mode, but we should STILL show the 'pwn' characters if they are malicious
                // Actually, let's update the cache progressively so renderSecret() handles it

                // Progressive update of cache
                const prevChar = secretDataCache.char;
                const prevHex = secretDataCache.hex;

                let newChar = prevChar.substring(0, i) + char + prevChar.substring(i + 1);
                let newHex = prevHex.substring(0, i * 2) + hex + prevHex.substring(i * 2 + 2);

                secretDataCache = { char: newChar, hex: newHex };
                renderSecret(); // This will handle visibility (masking) and malicious highlighting
            }
            i++;
        }, 120); // Further slowed down to 120ms
    }
    else if (task.type === 'secret_snap') {
        // Instant update for secret (initial setup)
        secretDataCache = task.data;
        renderSecret();
        isVisualizing = false;
        processVisualizationQueue();
    }
    else if (task.type === 'buffer_snap') {
        // Instant update for buffer (final state confirmation)
        const slots = document.querySelectorAll('#buffer-slots .byte');
        const update = task.data;
        for (let i = 0; i < 16; i++) {
            if (i < update.char.length && slots[i]) {
                slots[i].textContent = update.char[i];
                if (['A', 'B', 'X'].includes(update.char[i])) {
                    slots[i].classList.add('malicious');
                } else {
                    slots[i].classList.remove('malicious');
                }
            }
        }
        isVisualizing = false;
        processVisualizationQueue();
    }
}

function updateBufferVisualizer(hexData, charData, isPreview = false) {
    if (isPreview) {
        addToQueue('buffer_fill', { hex: hexData, char: charData });
    } else {
        addToQueue('buffer_snap', { hex: hexData, char: charData });
    }
}

function updateSecretVisualizer(hexData, charData, isAnimated = true) {
    if (isAnimated) {
        addToQueue('secret_update', { hex: hexData, char: charData });
    } else {
        addToQueue('secret_snap', { hex: hexData, char: charData });
    }
}

function renderSecret() {
    const slots = document.getElementById('secret-slots');
    if (!slots) return;
    slots.innerHTML = '';

    const btn = document.getElementById('btn-show-secret');
    const isVisible = btn && btn.classList.contains('active');

    // Determine what to show
    let displayChar = secretDataCache.char;
    let displayHex = secretDataCache.hex;

    // Toggle Lock Visibility
    const lock = document.getElementById('secret-lock') || document.getElementById('lock-icon');
    if (lock) {
        // If showing data, HIDE lock. If hiding data, SHOW lock.
        lock.style.display = isVisible ? 'none' : 'block';
    }

    if (!isVisible) {
        // Show mask
        displayChar = "*".repeat(16);
        displayHex = "??".repeat(16);
    }

    for (let i = 0; i < 16; i++) {
        const span = document.createElement('div');
        span.className = 'byte';

        let char = '*';
        let hex = '??';
        let isMalicious = false;

        if (displayChar && i < displayChar.length) {
            char = displayChar[i];
        }
        if (displayHex && i * 2 + 2 <= displayHex.length) {
            hex = displayHex.substr(i * 2, 2);
        }

        span.textContent = char;
        span.title = isVisible ? `Hex: 0x${hex}` : 'Encrypted';

        // Highlight logic for secret (Integrity Check)
        if (isVisible) {
            // Check against initial secret if available
            if (window.initialSecretChar && i < window.initialSecretChar.length) {
                if (char !== window.initialSecretChar[i]) {
                    isMalicious = true; // Deviation from original!
                }
            } else {
                // Fallback if no initial secret known yet (e.g. pre-build)
                // Or if index out of bounds
                if (['A', 'B', 'X'].includes(char)) {
                    isMalicious = true;
                }
            }
        }

        if (isMalicious) span.classList.add('malicious');

        slots.appendChild(span);
    }
}

function toggleSecret() {
    const btn = document.getElementById('btn-show-secret');

    if (btn.classList.contains('active')) {
        // Switch to HIDE
        btn.classList.remove('active');
        btn.innerHTML = '<span class="icon">👁️</span> Show Secure Data';
    } else {
        // Switch to SHOW
        btn.classList.add('active');
        btn.innerHTML = '<span class="icon">🚫</span> Hide Secure Data';
    }
    renderSecret();
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
    // Clear Animation Queue
    visualizationQueue = [];
    isVisualizing = false;

    // Reset Bytes
    const bufferSlots = document.getElementById('buffer-slots');
    if (bufferSlots) {
        bufferSlots.innerHTML = '';
        for (let i = 0; i < 16; i++) {
            const span = document.createElement('div');
            span.className = 'byte';
            span.textContent = '.';
            span.title = 'Hex: 0x00'; // Initial state
            bufferSlots.appendChild(span);
        }
    }

    // Reset Secret Cache & Render
    // Default to the known initial secret state OR the one we learned from build
    if (window.initialSecretChar) {
        // Re-use learned secret
        secretDataCache = {
            hex: "??".repeat(16), // Hex not critical for reset
            char: window.initialSecretChar
        };
    } else {
        // Hardcoded Fallback
        secretDataCache = {
            hex: "5345435245545f444154415f3132332e",
            char: "SECRET_DATA_123."
        };
    }

    renderSecret();

    // Reset Lock
    const lock = document.getElementById('secret-lock') || document.getElementById('lock-icon');
    if (lock) {
        lock.style.display = 'block';
        lock.style.transform = 'scale(1)';
        lock.classList.remove('pulse');
    }

    const secretCont = document.getElementById('vis-secret');
    if (secretCont) {
        secretCont.style.borderColor = '#484f58';
        secretCont.classList.remove('unlocked');
        secretCont.style.boxShadow = '';
    }

    // Reset Pointer
    const ptr = document.getElementById('ptr-value');
    if (ptr) {
        ptr.textContent = "0x... (NULL)";
        ptr.classList.remove('hacked');
    }

    // Reset Address Display
    const addr = document.getElementById('secret-addr');
    if (addr) addr.textContent = "0x????";

    if (visOverlay) {
        visOverlay.textContent = "System Ready";
        visOverlay.style.color = "var(--text-secondary)";
    }

    // Reset Animations
    const bufVis = document.getElementById('vis-buffer');
    if (bufVis) {
        bufVis.classList.remove('flash-blue');
        bufVis.style.borderColor = '';
    }
    const secVis = document.getElementById('vis-secret');
    if (secVis) secVis.classList.remove('flash-green');

    // Reset Button
    const btn = document.getElementById('btn-show-secret');
    if (btn) {
        if (btn.classList.contains('active')) {
            btn.innerHTML = '<span class="icon">🚫</span> Hide Secure Data';
        } else {
            btn.innerHTML = '<span class="icon">👁️</span> Show Secure Data';
        }
        btn.disabled = false;
        btn.style.opacity = '1';
    }
}

// Deprecated old visualization loop, replaced by updateBufferVisualizer
function visualizeOverflow() {
    // Kept empty to not break calls if any
}

function highlightStep(stepNum) {
    document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
    document.getElementById(`step-${stepNum}`).classList.add('active');
}

// Init on load
document.addEventListener('DOMContentLoaded', initVisualizer);
