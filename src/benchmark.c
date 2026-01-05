#include <stdio.h>
#include <time.h>
#include <stdint.h>
#include "mpk_lib.h"
#include <sys/mman.h>
#include <stdlib.h>

#define ITERATIONS 100000
#define PAGE_SIZE 4096

// Simple timer
double get_time_ns() {
    struct timespec ts;
    clock_gettime(CLOCK_MONOTONIC, &ts);
    return (double)ts.tv_sec * 1e9 + (double)ts.tv_nsec;
}

int main() {
    printf("===========================================\n");
    printf("   PERFORMANCE EVALUATION: MPK SIMULATION   \n");
    printf("===========================================\n");
    
    // Setup
    void* zone = mmap(NULL, PAGE_SIZE, PROT_READ|PROT_WRITE, MAP_PRIVATE|MAP_ANONYMOUS, -1, 0);
    int pkey = mpk_alloc_key();
    
    // 1. Measure Baseline (No-op loop)
    double start = get_time_ns();
    for(int i=0; i<ITERATIONS; i++) {
        __asm__ volatile ("" ::: "memory"); // Barrier
    }
    double end = get_time_ns();
    double baseline_avg = (end - start) / ITERATIONS;
    
    printf("[1] Baseline (Empty Loop):       %.2f ns/op\n", baseline_avg);
    
    // 2. Measure Protection Switching (Enter + Exit)
    // This calls mprotect twice per iteration
    start = get_time_ns();
    for(int i=0; i<ITERATIONS; i++) {
        // Enter (Enable Access)
        mpk_allow_access(pkey, zone, PAGE_SIZE, PROT_READ|PROT_WRITE);
        
        // Critical Section mock
        __asm__ volatile ("" ::: "memory");
        
        // Exit (Disable Access)
        mpk_revoke_access(pkey, zone, PAGE_SIZE);
    }
    end = get_time_ns();
    double mpk_avg = (end - start) / ITERATIONS;
    
    printf("[2] Protection Overhead (Sim):   %.2f ns/op\n", mpk_avg);
    printf("    (Includes 2x mprotect syscalls)\n");
    
    double overhead = mpk_avg - baseline_avg;
    printf("\n>>> Net Overhead per Transition: %.2f ns (%.2f us)\n", overhead, overhead / 1000.0);
    
    printf("\n[NOTE] REAL Intel MPK Hardware is typically ~20-50 cycles (< 20 ns).\n");
    printf("       This simulation is ~100x slower due to syscalls.\n");
    
    return 0;
}
