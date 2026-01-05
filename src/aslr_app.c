#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include <sys/mman.h>
#include <unistd.h>
#include "output.h"

#define PAGE_SIZE 4096
#define BUFFER_SIZE 64
#define SECRET_SIZE 64

// --- Zone Structures ---
typedef struct {
    char buffer[BUFFER_SIZE];
    volatile long MAGIC_canary; // Just to see if we overflow cleanly
    char* victim_ptr;           // The pointer we want to overwrite
} ZoneU;

typedef struct {
    char secret[SECRET_SIZE];
} ZoneS;

// Global pointers to our zones
ZoneU* zone_u;
ZoneS* zone_s;

void setup_memory() {
    // 1. Allocate Zone U (Untrusted)
    // PROT_READ | PROT_WRITE, MAP_PRIVATE | MAP_ANONYMOUS
    zone_u = mmap(NULL, PAGE_SIZE, PROT_READ | PROT_WRITE, MAP_PRIVATE | MAP_ANONYMOUS, -1, 0);
    if (zone_u == MAP_FAILED) { perror("mmap zone_u"); exit(1); }

    // 2. Allocate Zone S (Sensitive) (Separately ! implies ASLR relative randomization)
    zone_s = mmap(NULL, PAGE_SIZE, PROT_READ | PROT_WRITE, MAP_PRIVATE | MAP_ANONYMOUS, -1, 0);
    if (zone_s == MAP_FAILED) { perror("mmap zone_s"); exit(1); }

    // Initialize
    zone_u->victim_ptr = (char*)&zone_u->MAGIC_canary; // Default: points to safe location in Zone U
    strcpy(zone_s->secret, "SUPER_SECRET_PASSWORD_12345");
    
    LOG_ZONE("Zone U allocated at %p", zone_u);
    LOG_ZONE("Zone S allocated at %p", zone_s);
}

void vulnerable_function(char* input, size_t len) {
    LOG_INFO("Vulnerable function called. Input len: %lu", len);
    
    // VULNERABILITY: strcpy/memcpy overflow
    // We expect input to overflow buffer and overwrite victim_ptr
    LOG_ATTACK("Processing input...");
    memcpy(zone_u->buffer, input, len); // Using memcpy to allow binary payload
    
    LOG_ATTACK("Input processing complete. victim_ptr is now: %p", zone_u->victim_ptr);

    // TRIGGER: Write to the victim pointer
    // If attacker overwrote this pointer with Zone S address, we will corrupt Zone S!
    log_timeline_event("Dereferencing victim_ptr");
    
    // We write a byte to the target
    *zone_u->victim_ptr = 'X'; 
    LOG_ATTACK("Wrote 'X' to address %p", zone_u->victim_ptr);
}

void dump_secret() {
    LOG_INFO("Reading secret from Zone S...");
    printf("Content of Secret Zone: '%s'\n", zone_s->secret);
}

int main(int argc, char** argv) {
    if (argc < 2) {
        printf("Usage: %s <input_file>\n", argv[0]);
        return 1;
    }

    init_timeline();
    LOG_INFO("Starting (Phase 3: ASLR ENABLED / NO MPK)");
    
    setup_memory();

    // Visual Visualization
    print_memory_map(
        zone_u, PAGE_SIZE, 3, 
        zone_s, PAGE_SIZE, 3
    );
    
    // Read Input
    if (argc >= 2 && strcmp(argv[1], "-") == 0) {
        // Interactive Mode (STDIN)
        LOG_INFO("Reading input from STDIN (Interactive Mode)...");
        // We read up to 256 bytes for simple overflow testing
        char buffer[256];
        // We pause slightly to ensure output is flushed so attacker sees the leak
        fflush(stdout);
        
        int bytes_read = read(STDIN_FILENO, buffer, sizeof(buffer));
        if (bytes_read < 0) { perror("read"); return 1; }
        
        LOG_ZONE("Input received from STDIN. Size: %d bytes", bytes_read);
        
        log_timeline_event("Invoking vulnerable function");
        vulnerable_function(buffer, bytes_read);
    } else {
        // File Mode
        FILE* f = fopen(argv[1], "rb");
        if (!f) return 1;
        fseek(f, 0, SEEK_END);
        long fsize = ftell(f);
        fseek(f, 0, SEEK_SET);
        char* input = malloc(fsize);
        fread(input, 1, fsize, f);
        fclose(f);

        log_timeline_event("Invoking vulnerable function");
        vulnerable_function(input, fsize);
    }
    
    log_timeline_event("Checking secret integrity");
    dump_secret();
    
    if (zone_s->secret[0] == 'X') {
        log_attacker_success("Secret was CORRUPTED via pointer overwrite!");
        log_timeline_event("Integrity Check FAILED");
    } else {
        LOG_SECURE("Secret seems intact (first char check)");
        log_timeline_event("Integrity Check PASSED");
    }
    
    print_timeline_summary();
    return 0;
}
