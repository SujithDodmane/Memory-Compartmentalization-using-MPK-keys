#include "mpk_lib.h"
#include "output.h"
#include <stdio.h>
#include <errno.h>

/*
 * MOCK MPK IMPLEMENTATION
 * Since real MPK (PKEY) is not supported in this VM, we simulate it
 * by using standard mprotect() to toggle permissions ON and OFF.
 * 
 * Hardware MPK changes registers (userspace, fast).
 * Mock MPK changes page tables (kernel syscall, slow).
 * 
 * Security Logic is IDENTICAL:
 * - Default State: PROT_NONE (No Access)
 * - Safe Zone Entry: mprotect(PROT_READ|PROT_WRITE)
 * - Safe Zone Exit: mprotect(PROT_NONE)
 */

int mpk_alloc_key() {
    // Just return a dummy ID, we don't really manage multiple keys complexly for this demo
    return 1; 
}

int mpk_mprotect_key(void *addr, size_t len, int prot, int pkey) {
    // In real MPK, this associates the key but keeps current perms until denied?
    // Actually, initially we want to set it to enabled or disabled?
    // Let's assume we start with access enabled, then revoke it.
    // Or we just call standard mprotect.
    return mprotect(addr, len, prot);
}

void mpk_revoke_access(int pkey, void* addr, size_t len) {
    // EMULATION: "Disabling access" = mprotect(PROT_NONE)
    // In real MPK, this would be `wrpkru` (update register).
    // Here we make the memory physically inaccessible.
    if (mprotect(addr, len, PROT_NONE) == -1) {
        perror("mpk_revoke failed");
    }
}

void mpk_allow_access(int pkey, void* addr, size_t len, int prot) {
    // EMULATION: "Enabling access" = mprotect(prot)
    if (mprotect(addr, len, prot) == -1) {
        perror("mpk_allow failed");
    }
}
