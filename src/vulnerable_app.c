#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include "output.h"

// --- Configuration ---
// --- Configuration ---
#define BUFFER_SIZE 16
#define SECRET_SIZE 16

// --- Simulated Memory Layout ---
// In Phase 2, we use a struct to guarantee adjacency for the demo.
// "Zone U" is buffer, "Zone S" is secret.
typedef struct {
    char zone_u_buffer[BUFFER_SIZE];
    char zone_s_secret[SECRET_SIZE];
} MemoryLayout;

MemoryLayout global_memory;

// --- Vulnerable Function (Untrusted Zone Logic) ---
void vulnerable_function(char* input) {
    LOG_INFO("Vulnerable function called with input input of length %lu", strlen(input));
    
    // DUMP BEFORE
    dump_memory_state("ZONE_U", global_memory.zone_u_buffer, BUFFER_SIZE);
    
    // VULNERABILITY: strcpy does not check bounds!
    LOG_ATTACK("Processing input (Safe Copy? NO)");
    
    // Mimic "filling" animation by smaller chunks if we wanted, 
    // but for now we just dump afterwards to show the change.
    strcpy(global_memory.zone_u_buffer, input); 
    
    // DUMP AFTER
    dump_memory_state("ZONE_U", global_memory.zone_u_buffer, BUFFER_SIZE);
    // Also dump secret to show if it got hit
    dump_memory_state("ZONE_S", global_memory.zone_s_secret, SECRET_SIZE);
    
    LOG_ATTACK("Input processing complete");
}

void setup_secret() {
    strcpy(global_memory.zone_s_secret, "SECRET_DATA_123");
    LOG_INFO("Secret initialized in Zone S");
}

void dump_secret() {
    LOG_INFO("Reading secret from Zone S...");
    printf("Content of Secret Zone: '%s'\n", global_memory.zone_s_secret);
    dump_memory_state("ZONE_S", global_memory.zone_s_secret, SECRET_SIZE);
}

int main(int argc, char** argv) {
    if (argc < 2) {
        printf("Usage: %s <input_file>\n", argv[0]);
        return 1;
    }

    // 0. Disable buffering for real-time streaming
    setbuf(stdout, NULL);

    // 1. Initialize System
    init_timeline();
    LOG_INFO("Starting in-process isolation demo (Phase 2: BASELINE / NO PROTECTION)");
    LOG_INFO("Protection Mode: DISABLED");

    // 2. Setup Memory
    setup_secret();
    
    // 3. Visual Visualization
    print_memory_map(
        global_memory.zone_u_buffer, BUFFER_SIZE, 3, // 3 = READ | WRITE
        global_memory.zone_s_secret, SECRET_SIZE, 3  // 3 = READ | WRITE (No Protection)
    );
    
    // Initial Dump
    dump_memory_state("ZONE_U", global_memory.zone_u_buffer, BUFFER_SIZE);
    dump_memory_state("ZONE_S", global_memory.zone_s_secret, SECRET_SIZE);
    
    // 4. Read Malicious Input
    FILE* f = fopen(argv[1], "rb");
    if (!f) {
        LOG_INFO("Failed to open input file");
        return 1;
    }
    
    fseek(f, 0, SEEK_END);
    long fsize = ftell(f);
    fseek(f, 0, SEEK_SET);
    
    char* input = malloc(fsize + 1);
    fread(input, 1, fsize, f);
    input[fsize] = 0;
    fclose(f);
    
    LOG_ZONE("Input loaded from file: %s", argv[1]);
    LOG_ZONE("Input Size: %ld bytes (Buffer Size: %d)", fsize, BUFFER_SIZE);

    // DUMP Input for visualization sync
    dump_memory_state("INPUT_PREVIEW", input, fsize);

    // 5. Trigger Vulnerability
    log_timeline_event("Invoking vulnerable function");
    vulnerable_function(input);
    
    // 6. Check Result
    log_timeline_event("Checking secret integrity");
    dump_secret();

    // In Phase 2, we EXPECT the secret to be corrupted/overwritten if input > 16
    if (strcmp(global_memory.zone_s_secret, "SECRET_DATA_123") != 0) {
        log_attacker_success("Secret has been OVERWRITTEN/CORRUPTED!");
        log_timeline_event("Integrity Check FAILED");
    } else {
        LOG_SECURE("Secret remains intact");
        log_timeline_event("Integrity Check PASSED");
    }

    print_timeline_summary();
    free(input);
    return 0;
}
