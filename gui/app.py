import os
import subprocess
from flask import Flask, render_template, request, Response, jsonify

app = Flask(__name__)

# Set the working directory to the project root so relative paths work
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(PROJECT_ROOT)

@app.route('/')
def index():
    return render_template('index.html')

def stream_command(command):
    """
    Generator that runs a shell command and yields output line by line.
    """
    process = subprocess.Popen(
        command,
        shell=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1
    )
    
    # Yield output as it comes
    for line in iter(process.stdout.readline, ''):
        yield f"data: {line}\n\n"
        
    process.stdout.close()
    return_code = process.wait()
    
    if return_code != 0:
        yield f"data: [ERROR] Command exited with code {return_code}\n\n"
    else:
        yield f"data: [SUCCESS] Command completed.\n\n"
    
    yield "event: close\ndata: \n\n"

@app.route('/stream/<scenario>')
def stream(scenario):
    cmd = ""
    if scenario == 'build':
        cmd = "make clean && make all aslr_app protected_app"
    elif scenario == 'baseline':
        cmd = "make run_attack"
    elif scenario == 'aslr':
        cmd = "python3 run_exploit.py ./aslr_app"
    elif scenario == 'protected':
        cmd = "python3 run_exploit.py ./protected_app"
    else:
        return jsonify({"error": "Unknown scenario"}), 400

    return Response(stream_command(cmd), mimetype='text/event-stream')

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
