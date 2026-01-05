CC = gcc
CFLAGS = -Wall -I.
TARGET = baseline_app

SRCS = src/vulnerable_app.c src/output.c
OBJS = $(SRCS:.c=.o)

all: $(TARGET)

$(TARGET): $(OBJS)
	$(CC) $(CFLAGS) -o $@ $^

aslr_app: src/aslr_app.c src/output.c
	$(CC) $(CFLAGS) -o $@ $^

protected_app: src/protected_app.c src/output.c src/mpk_lib.c
	$(CC) $(CFLAGS) -o $@ $^

clean:
	rm -f src/*.o $(TARGET) aslr_app protected_app payload*.bin output.log

run_benign: $(TARGET)
	python3 src/exploit_gen.py benign payload_benign.bin
	./$(TARGET) payload_benign.bin

run_attack: $(TARGET)
	python3 src/exploit_gen.py overflow payload_attack.bin
	./$(TARGET) payload_attack.bin
