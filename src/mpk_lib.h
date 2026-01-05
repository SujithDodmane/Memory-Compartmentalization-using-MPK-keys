#ifndef MPK_LIB_H
#define MPK_LIB_H

#include <sys/mman.h>

// Mock Key Definition
#define PKEY_INVALID -1

// Prototypes
int mpk_alloc_key();
int mpk_mprotect_key(void *addr, size_t len, int prot, int pkey);
void mpk_allow_access(int pkey, void* addr, size_t len, int prot);
void mpk_revoke_access(int pkey, void* addr, size_t len);

#endif
