#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include <sys/mman.h>
#include <unistd.h>
#include <signal.h>
#include "output.h"
#include "mpk_lib.h"

#define PAGE_SIZE 4096
#define BUFFER_SIZE 64
#define SECRET_SIZE 64

// --- Zone Structures ---
typedef struct {
    char buffer[BUFFER_SIZE];
    volatile long MAGIC_canary; 
    char* victim_ptr;           
} ZoneU;

typedef struct {
    char secret[SECRET_SIZE];
} ZoneS;

ZoneU* zone_u;
ZoneS* zone_s;
int zone_s_pkey;

// --- Signal Handler for Segfault (MPK Violation) ---
void segfault_handler(int sig, siginfo_t *si, void *unused) {
    printf("\n");
    LOG_DENIED("Hardware blocked access to address %p", si->si_addr);
    
    // Check if address is within Zone S
    if ((char*)si->si_addr >= (char*)zone_s && (char*)si->si_addr < (char*)zone_s + PAGE_SIZE) {
        LOG_DENIED("Violation confirmed: Illegal access to SENSITIVE ZONE");
        log_timeline_event("Access denied by MPK/Protection");
        LOG_SECURE("Sensitive data remains protected (Program terminating safely)");
        
        // We print the summary here because we are about to die
        print_timeline_summary();
        log_attacker_failure("Unexpected memory access failure (SIGSEGV)");
        exit(139); // Standard SIGSEGV exit code
    } else {
        LOG_ATTACK("Segmentation fault in other memory");
        exit(139);
    }
}

void setup_memory() {
    // 1. Allocate Zone U (Untrusted)
    zone_u = mmap(NULL, PAGE_SIZE, PROT_READ | PROT_WRITE, MAP_PRIVATE | MAP_ANONYMOUS, -1, 0);
    
    // 2. Allocate Zone S (Sensitive)
    zone_s = mmap(NULL, PAGE_SIZE, PROT_READ | PROT_WRITE, MAP_PRIVATE | MAP_ANONYMOUS, -1, 0);
    
    // 3. MPK Setup
    zone_s_pkey = mpk_alloc_key();
    LOG_INFO("Allocated Protection Key: %d", zone_s_pkey);
    
    // We initially allow write to setup the secret, then we lock it
    strcpy(zone_s->secret, "SUPER_SECRET_PASSWORD_12345");
    
    // LOCK ZONE S (Default Deny)
    LOG_SECURE("Applying Default-Deny Policy...");
    mpk_revoke_access(zone_s_pkey, zone_s, PAGE_SIZE);
    
    // Setup Zone U
    zone_u->victim_ptr = (char*)&zone_u->MAGIC_canary; 
    
    LOG_ZONE("Zone U allocated at %p", zone_u);
    LOG_ZONE("Zone S allocated at %p (PROTECTED)", zone_s);
}

// Trusted Gatekeeper to read secret
void safe_read_secret() {
    log_timeline_event("Enter Secure Zone (Gatekeeper)");
    LOG_TRANSITION("Entering Sensitive Zone... Enabling Access");
    
    // 1. ENABLE ACCESS
    mpk_allow_access(zone_s_pkey, zone_s, PAGE_SIZE, PROT_READ);
    
    // 2. DO CRITICAL WORK
    printf("Content of Secret Zone: '%s'\n", zone_s->secret);
    
    // 3. DISABLE ACCESS
    mpk_revoke_access(zone_s_pkey, zone_s, PAGE_SIZE);
    LOG_TRANSITION("Exiting Sensitive Zone... Access Revoked");
}

void vulnerable_function(char* input, size_t len) {
    LOG_INFO("Vulnerable function called. Input len: %lu", len);
    
    // Note: We do NOT enable Zone S access here.
    // So if attacker overwrites victim_ptr to point to Zone S,
    // the write '*victim_ptr = X' will FAIL.
    
    LOG_ATTACK("Processing input...");
    memcpy(zone_u->buffer, input, len); 
    
    LOG_ATTACK("Input processing complete. victim_ptr is now: %p", zone_u->victim_ptr);

    log_timeline_event("Dereferencing victim_ptr");
    
    // TRIGGER
    *zone_u->victim_ptr = 'X'; 
    LOG_ATTACK("Wrote 'X' to address %p", zone_u->victim_ptr);
}

int main(int argc, char** argv) {
    // Register Signal Handler
    struct sigaction sa;
    sa.sa_flags = SA_SIGINFO;
    sigemptyset(&sa.sa_mask);
    sa.sa_sigaction = segfault_handler;
    sigaction(SIGSEGV, &sa, NULL);

    init_timeline();
    LOG_INFO("Starting (Phase 5/6: HYBRID ASLR + MPK PROTECTION)");
    
    setup_memory();

    print_memory_map(
        zone_u, PAGE_SIZE, 3, 
        zone_s, PAGE_SIZE, 0 // 0 = NO ACCESS
    );
    
    // Interactive Mode (Standard for the exploit script)
    if (argc >= 2 && strcmp(argv[1], "-") == 0) {
        LOG_INFO("Reading input from STDIN...");
        char buffer[256];
        fflush(stdout);
        int bytes_read = read(STDIN_FILENO, buffer, sizeof(buffer));
        if (bytes_read < 0) return 1;
        
        LOG_ZONE("Input received. Size: %d", bytes_read);
        
        log_timeline_event("Invoking vulnerable function");
        vulnerable_function(buffer, bytes_read);
    } 
    
    // If we survive (we shouldn't if exploited), check secret
    // Note: safe_read_secret temporarily enables access!
    safe_read_secret();
    
    print_timeline_summary();
    return 0;
}
