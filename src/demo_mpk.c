#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <signal.h>
#include <setjmp.h>
#include <sys/mman.h>
#include "mpk_lib.h"

// Buffer for jumping back after a crash (segfault)
jmp_buf jump_buffer;

// Signal handler to catch segmentation faults (illegal access)
void segfault_handler(int signal) {
    printf("\n[!!!] CAUGHT ILLEGAL ACCESS (SIGSEGV)!\n");
    printf("      The hardware/OS blocked the unauthorized access explicitly.\n");
    longjmp(jump_buffer, 1); // Jump back to the safe point
}

int main() {
    printf("=== MPK / Memory Compartmentalization Logic Demo ===\n\n");

    // 1. Setup Signal Handler for demonstration purposes
    signal(SIGSEGV, segfault_handler);

    // 2. Allocate a memory page (aligned to page size)
    size_t page_size = sysconf(_SC_PAGESIZE);
    void *secret_zone = mmap(NULL, page_size, PROT_READ | PROT_WRITE, MAP_PRIVATE | MAP_ANONYMOUS, -1, 0);

    if (secret_zone == MAP_FAILED) {
        perror("mmap failed");
        return 1;
    }

    printf("[INFO] Allocated Secret Zone at address: %p\n", secret_zone);

    // 3. Write data to the zone (Initially we have access)
    sprintf((char*)secret_zone, "THIS IS A TOP SECRET PASSWORD");
    printf("[INFO] Wrote initial secret data: '%s'\n", (char*)secret_zone);

    // 4. Initialize MPK (Mock)
    int pkey = mpk_alloc_key();
    printf("[INFO] Allocated MPK Key ID: %d\n", pkey);

    // ---------------------------------------------------------
    // SCENARIO 1: LOCK THE ZONE (Safe Zone Exit)
    // ---------------------------------------------------------
    printf("\n--- [LOCKING] Revoking Access to Secret Zone ---\n");
    mpk_revoke_access(pkey, secret_zone, page_size);
    printf("[INFO] Zone is now LOCKED (PROT_NONE).\n");

    // ---------------------------------------------------------
    // SCENARIO 2: ATTEMPT ILLEGAL ACCESS
    // ---------------------------------------------------------
    printf("\n--- [BEHAVIOR] Attempting to READ from Locked Zone ---\n");
    
    // We use setjmp to mark a return point. logic:
    // If setjmp returns 0, it's the first call.
    // If it returns 1, it's because longjmp was called (from our signal handler).
    if (setjmp(jump_buffer) == 0) {
        // Try to read the memory
        char c = *((char*)secret_zone); 
        printf("[FAIL] We could read the data! Lock failed. Value: %c\n", c);
    } else {
        // We land here after the SIGSEGV
        printf("[SUCCESS] Access Denied! The lock successfully prevented illegal access.\n");
    }

    // ---------------------------------------------------------
    // SCENARIO 3: UNLOCK THE ZONE (Safe Zone Entry)
    // ---------------------------------------------------------
    printf("\n--- [UNLOCKING] Restoring Access to Secret Zone ---\n");
    // We must pass the correct protection flags (PROT_READ | PROT_WRITE)
    mpk_allow_access(pkey, secret_zone, page_size, PROT_READ | PROT_WRITE);
    printf("[INFO] Zone is now UNLOCKED.\n");

    // ---------------------------------------------------------
    // SCENARIO 4: SAFE AUTHORIZED ACCESS
    // ---------------------------------------------------------
    printf("\n--- [BEHAVIOR] Reading from Unlocked Zone ---\n");
    printf("[SUCCESS] Read Secret Data: '%s'\n", (char*)secret_zone);

    // Clean up
    munmap(secret_zone, page_size);
    printf("\n=== Demo Completed Successfully ===\n");
    return 0;
}
