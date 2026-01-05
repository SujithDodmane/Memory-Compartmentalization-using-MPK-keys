#ifndef OUTPUT_H
#define OUTPUT_H

#include <stdio.h>
#include <stdint.h>
#include <unistd.h>

// --- Color Codes ---
#define COLOR_RESET   "\033[0m"
#define COLOR_INFO    "\033[34m" // Blue
#define COLOR_ZONE    "\033[36m" // Cyan
#define COLOR_ATTACK  "\033[31m" // Red
#define COLOR_TRANS   "\033[33m" // Yellow
#define COLOR_DENIED  "\033[35m" // Magenta
#define COLOR_SECURE  "\033[32m" // Green
#define COLOR_BOLD    "\033[1m"
#define COLOR_RED     "\033[31m" // Red Generic

// --- Logging Macros ---
#define LOG_INFO(fmt, ...)      log_message("INFO", COLOR_INFO, fmt, ##__VA_ARGS__)
#define LOG_ZONE(fmt, ...)      log_message("ZONE", COLOR_ZONE, fmt, ##__VA_ARGS__)
#define LOG_ATTACK(fmt, ...)    log_message("ATTACK", COLOR_ATTACK, fmt, ##__VA_ARGS__)
#define LOG_TRANSITION(fmt, ...) log_message("TRANSITION", COLOR_TRANS, fmt, ##__VA_ARGS__)
#define LOG_DENIED(fmt, ...)    log_message("DENIED", COLOR_DENIED, fmt, ##__VA_ARGS__)
#define LOG_SECURE(fmt, ...)    log_message("SECURE", COLOR_SECURE, fmt, ##__VA_ARGS__)

// --- Function Prototypes ---

// Core Logging
void log_message(const char* category, const char* color, const char* fmt, ...);

// 2. Memory Visualization
void print_memory_map(void* zone_u_addr, size_t zone_u_size, int zone_u_prot,
                      void* zone_s_addr, size_t zone_s_size, int zone_s_prot);

// 3. Attack Timeline
void init_timeline();
void log_timeline_event(const char* event_description);
void print_timeline_summary();

// 4. Attacker POV
void log_attacker_step(const char* step_description);
void log_attacker_success(const char* msg);
void log_attacker_failure(const char* msg);

#endif // OUTPUT_H
