#!/bin/bash

# Definition of Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================================================${NC}"
echo -e "${BLUE}   HYBRID FINE-GRAINED MEMORY COMPARTMENTALIZATION - FULL DEMO   ${NC}"
echo -e "${BLUE}================================================================${NC}"
echo ""

echo -e "${YELLOW}[DEMO] Step 0: Cleaning and Building Project...${NC}"
make clean > /dev/null
make all aslr_app protected_app > /dev/null 2>&1
gcc -o benchmark src/benchmark.c src/mpk_lib.c -I. # Manual build for benchmark
if [ $? -eq 0 ]; then
    echo -e "${GREEN}[SUCCESS] Build Complete.${NC}"
else
    echo -e "${RED}[ERROR] Build Failed.${NC}"
    exit 1
fi
sleep 1

echo ""
echo -e "${BLUE}================================================================${NC}"
echo -e "${RED}   PHASE 2: BASELINE EXECUTION (NO PROTECTION)   ${NC}"
echo -e "${BLUE}================================================================${NC}"
echo -e "${YELLOW}[SCENARIO] Standard Buffer Overflow. Can we steal the secret?${NC}"
# Use the benign run first to show it works, then attack? Just attack is more direct for demo.
echo -e "${CYAN}Running: make run_attack${NC}"
make run_attack
echo ""
echo -e "${RED}>>> RESULT: Attack SUCCEEDED (Secret Leaked/Corrupted)${NC}"
sleep 2

echo ""
echo -e "${BLUE}================================================================${NC}"
echo -e "${YELLOW}   PHASE 3: ASLR ENABLED (LOGICAL ISOLATION)   ${NC}"
echo -e "${BLUE}================================================================${NC}"
echo -e "${YELLOW}[SCENARIO] Addresses are randomized. Attacker leaks address and overwrites pointer.${NC}"
echo -e "${CYAN}Running: python3 run_exploit.py ./aslr_app${NC}"
python3 run_exploit.py ./aslr_app
echo ""
echo -e "${RED}>>> RESULT: Attack SUCCEEDED (ASLR Bypassed via Leak)${NC}"
sleep 2

echo ""
echo -e "${BLUE}================================================================${NC}"
echo -e "${GREEN}   PHASE 6: HYBRID PROTECTION (ASLR + MPK)   ${NC}"
echo -e "${BLUE}================================================================${NC}"
echo -e "${YELLOW}[SCENARIO] Same attack (Leak + Pointer Overwrite). Hardware 'Default Deny' is active.${NC}"
echo -e "${CYAN}Running: python3 run_exploit.py ./protected_app${NC}"
python3 run_exploit.py ./protected_app
echo ""
echo -e "${GREEN}>>> RESULT: Attack BLOCKED (Segmentation Fault / Access Denied)${NC}"
sleep 2

echo ""
echo -e "${BLUE}================================================================${NC}"
echo -e "${CYAN}   PHASE 8: PERFORMANCE EVALUATION   ${NC}"
echo -e "${BLUE}================================================================${NC}"
./benchmark

echo ""
echo -e "${BLUE}================================================================${NC}"
echo -e "${GREEN}   DEMONSTRATION COMPLETE   ${NC}"
echo -e "${BLUE}================================================================${NC}"
