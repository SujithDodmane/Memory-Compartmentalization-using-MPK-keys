const terminalOutput = document.getElementById('terminal-output');
const statusProtection = document.getElementById('status-protection').querySelector('.value');
const statusSystem = document.getElementById('status-system').querySelector('.value');
const scenarioDesc = document.getElementById('scenario-desc');
let eventSource = null;

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

    appendLog(`> Starting scenario: ${scenario}...`);

    eventSource = new EventSource(`/stream/${scenario}`);

    eventSource.onmessage = function (e) {
        appendLog(e.data);
        if (e.data.includes("Completing")) {
            // Check for success/failure patterns in the log if needed
        }
    };

    eventSource.addEventListener('close', function (e) {
        eventSource.close();
        appendLog("> Process finished.");
        finalizeVisualizer(scenario);
    });

    eventSource.onerror = function (e) {
        // EventSource often triggers error on close depending on server implementation
        eventSource.close();
    };

    // 4. Trigger Visualization Animation
    animateScenario(scenario);
}

function appendLog(text) {
    const line = document.createElement('div');
    line.className = 'line';
    line.textContent = text;
    terminalOutput.appendChild(line);
    terminalOutput.scrollTop = terminalOutput.scrollHeight;
}

function clearTerminal() {
    terminalOutput.innerHTML = '';
}

function updateStatus(scenario) {
    const protection = document.getElementById('status-protection').querySelector('.value');
    const system = document.getElementById('status-system').querySelector('.value');

    // Reset Classes
    protection.className = 'value';
    system.className = 'value';

    if (scenario === 'build') {
        scenarioDesc.textContent = "Compiling source code and preparing binaries...";
        protection.textContent = "N/A";
        system.textContent = "BUILDING...";
        system.classList.add('warning');
    } else if (scenario === 'baseline') {
        scenarioDesc.textContent = "Running standard buffer overflow on unprotected app. Expect secret leak.";
        protection.textContent = "NONE";
        protection.classList.add('danger');
        system.textContent = "VULNERABLE";
        system.classList.add('danger');
    } else if (scenario === 'aslr') {
        scenarioDesc.textContent = "ASLR enabled. Addresses are randomized. Attacker will try to leak address.";
        protection.textContent = "ASLR ONLY";
        protection.classList.add('warning');
        system.textContent = "AT RISK";
        system.classList.add('warning');
    } else if (scenario === 'protected') {
        scenarioDesc.textContent = "Hybrid Protection (ASLR + MPK). Hardware keys lock the secret.";
        protection.textContent = "ASLR + MPK";
        protection.classList.add('success');
        system.textContent = "SECURED";
        system.classList.add('safe');
    }
}

// Visualization Logic
function resetVisualizer() {
    document.getElementById('zone-u').classList.remove('overflow-active');
    document.getElementById('secret-vis').classList.remove('compromised');
    document.getElementById('secret-vis').innerHTML = 'Secret Key <span class="lock-icon">🔒</span>';

    // Reset positions if moved
    document.getElementById('zone-s').style.transform = 'translateY(0)';
}

function animateScenario(scenario) {
    const zoneU = document.getElementById('zone-u');
    const secret = document.getElementById('secret-vis');
    const zoneS = document.getElementById('zone-s');

    if (scenario === 'baseline') {
        setTimeout(() => {
            zoneU.classList.add('overflow-active');
            appendLog("[VIS] Buffer Overflow Initiated...");
        }, 1000);

        setTimeout(() => {
            secret.classList.add('compromised');
            secret.innerHTML = 'SECRET STOLEN! 🔓';
            statusSystem.textContent = "COMPROMISED";
            statusSystem.className = 'value danger';
            appendLog("[VIS] Secret Accessed!");
        }, 2500);

    } else if (scenario === 'aslr') {
        // Mock ASLR by moving the zone
        appendLog("[VIS] Randomizing Memory Layout...");
        zoneS.style.transform = 'translateY(20px)';

        setTimeout(() => {
            zoneU.classList.add('overflow-active');
            appendLog("[VIS] Buffer Overflow Initiated...");
        }, 1500);

        setTimeout(() => {
            secret.classList.add('compromised');
            secret.innerHTML = 'SECRET STOLEN! 🔓';
            statusSystem.textContent = "COMPROMISED";
            statusSystem.className = 'value danger';
            appendLog("[VIS] ASLR Bypassed via Leak!");
        }, 3000);

    } else if (scenario === 'protected') {
        appendLog("[VIS] Locking Memory Zones with MPK...");

        setTimeout(() => {
            zoneU.classList.add('overflow-active');
            appendLog("[VIS] Buffer Overflow Initiated...");
        }, 1500);

        setTimeout(() => {
            // It should FAIL
            appendLog("[VIS] Access to Secret Denied by Hardware!");
            statusSystem.textContent = "ATTACK BLOCKED";
            statusSystem.className = 'value safe';
        }, 3000);
    }
}

function finalizeVisualizer(scenario) {
    // Ensure final state matches reality
}
