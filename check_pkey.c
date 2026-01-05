#define _GNU_SOURCE
#include <unistd.h>
#include <sys/syscall.h>
#include <stdio.h>
#include <sys/mman.h>

int main() {
    printf("Checking PKEY support...\n");
    int pkey = syscall(SYS_pkey_alloc, 0, 0);
    if (pkey == -1) {
        perror("pkey_alloc failed");
        return 1;
    }
    printf("pkey_alloc success! Key: %d\n", pkey);
    return 0;
}
