#include "output.h"
#include <stdarg.h>
#include <time.h>
#include <string.h>
#include <stdlib.h>

// --- Globals for Timeline ---
#define MAX_TIMELINE_EVENTS 50
static char* timeline_events[MAX_TIMELINE_EVENTS];
static int event_count = 0;
static struct timespec start_time;

// --- Helper Functions ---
static double get_time_ms() {
    struct timespec now;
    clock_gettime(CLOCK_MONOTONIC, &now);
    return (now.tv_sec - start_time.tv_sec) * 1000.0 + (now.tv_nsec - start_time.tv_nsec) / 1000000.0;
}

// --- Core Logging ---
void log_message(const char* category, const char* color, const char* fmt, ...) {
    va_list args;
    printf("%s[%s] ", color, category);
    va_start(args, fmt);
    vprintf(fmt, args);
    va_end(args);
    printf("%s\n", COLOR_RESET);
}

// --- 2. Memory Visualization ---
// Converts prot flags to string
static const char* prot_to_str(int prot) {
    static char buf[16];
    buf[0] = '\0';
    if (prot == 0) return "NO ACCESS";
    if (prot & 0x1) strcat(buf, "READ ");
    if (prot & 0x2) strcat(buf, "WRITE ");
    if (prot & 0x4) strcat(buf, "EXEC ");
    // Remove trailing space
    size_t len = strlen(buf);
    if (len > 0) buf[len-1] = '\0';
    return buf;
}

void print_memory_map(void* zone_u_addr, size_t zone_u_size, int zone_u_prot,
                      void* zone_s_addr, size_t zone_s_size, int zone_s_prot) {
    printf("\n" COLOR_BOLD "================ MEMORY LAYOUT ================" COLOR_RESET "\n");
    printf("%-15s %-25s %-15s\n", "Zone Name", "Address Range", "Access");
    printf("----------------------------------------------------\n");
    
    printf("%-15s %p - %p   %s\n", "Untrusted Zone", 
           zone_u_addr, (char*)zone_u_addr + zone_u_size - 1, prot_to_str(zone_u_prot));
           
    printf("%-15s %p - %p   %s\n", "Sensitive Zone", 
           zone_s_addr, (char*)zone_s_addr + zone_s_size - 1, prot_to_str(zone_s_prot));
           
    printf("====================================================\n\n");
}

// --- 3. Attack Timeline ---
void init_timeline() {
    clock_gettime(CLOCK_MONOTONIC, &start_time);
    event_count = 0;
    LOG_INFO("Timeline recording started.");
    log_timeline_event("Program initialized");
}

void log_timeline_event(const char* event_description) {
    if (event_count >= MAX_TIMELINE_EVENTS) return;
    
    double t = get_time_ms();
    char buf[256];
    snprintf(buf, sizeof(buf), "[+%.2fms] %s", t, event_description);
    
    timeline_events[event_count] = strdup(buf);
    event_count++;
    
    // Also print to stdout in subtle color
    printf("\033[90m[TIMELINE] Step %d: %s\033[0m\n", event_count, event_description);
}

void print_timeline_summary() {
    printf("\n" COLOR_BOLD "[TIMELINE SUMMARY]" COLOR_RESET "\n");
    for (int i = 0; i < event_count; i++) {
        printf("%s\n", timeline_events[i]);
        free(timeline_events[i]);
    }
    printf("Total Events: %d\n", event_count);
    printf("Containment Successful: " COLOR_SECURE "YES" COLOR_RESET " (Safe Termination)\n\n");
}

// --- 4. Attacker POV ---
void log_attacker_step(const char* step_description) {
    printf("\n" COLOR_BOLD "[ATTACKER POV]" COLOR_RESET "\n");
    printf("  > %s\n", step_description);
}

void log_attacker_success(const char* msg) {
    printf(COLOR_RED "  ✓ %s" COLOR_RESET "\n", msg);
}

void log_attacker_failure(const char* msg) {
    printf(COLOR_RED "  ✗ %s" COLOR_RESET "\n", msg);
}
