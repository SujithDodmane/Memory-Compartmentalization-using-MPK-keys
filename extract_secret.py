import re
import sys
import struct

def main():
    try:
        with open('src/vulnerable_app.c', 'r') as f:
            content = f.read()

        # Find the secret string in setup_secret function
        # Look for strcpy(global_memory.zone_s_secret, "...")
        match = re.search(r'strcpy\(global_memory\.zone_s_secret,\s*"([^"]*)"\)', content)
        if match:
            secret = match.group(1)
            # Pad or truncate to 16 bytes as defined in app
            # The app defines SECRET_SIZE 16, so strcpy adds null terminator.
            # So max len is 15 + null = 16.
            # Visualization expects 16 chars.
            # Nulls are represented as '.' in visualization usually, but let's send raw chars.
            # Actually, the visualization uses '|' separated.
            # Let's construct a 16-byte representation.
            
            # Convert to bytes, pad with 0
            secret_bytes = secret.encode('utf-8')
            if len(secret_bytes) >= 16:
                 secret_bytes = secret_bytes[:15] + b'\0' # Ensure null termination if too long?
                 # Actually C strcpy stops at null.
            else:
                 secret_bytes += b'\0' * (16 - len(secret_bytes))

            # Hex string
            hex_str = secret_bytes.hex()
            
            # Char string for visualization (printable)
            char_str = ""
            for b in secret_bytes:
                if 32 <= b <= 126:
                    char_str += chr(b)
                elif b == 0:
                    char_str += "." 
                else:
                    char_str += "."

            print(f"[INIT_SECRET] {hex_str}|{char_str}")
        else:
            print("[ERROR] Could not find secret in src/vulnerable_app.c")
    except Exception as e:
        print(f"[ERROR] Failed to extract secret: {e}")

if __name__ == "__main__":
    main()
