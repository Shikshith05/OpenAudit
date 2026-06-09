import os
import signal
import subprocess
import sys
import time
from pathlib import Path


ROOT = Path(__file__).resolve().parent
BACKEND_DIR = ROOT / "backend"
FRONTEND_DIR = ROOT / "frontend"


def is_windows() -> bool:
    return os.name == "nt"


def backend_python() -> Path:
    if is_windows():
        return BACKEND_DIR / "venv" / "Scripts" / "python.exe"
    return BACKEND_DIR / "venv" / "bin" / "python"


def ensure_backend_env() -> None:
    py = backend_python()
    if not py.exists():
        print("Creating backend virtual environment...")
        subprocess.run([sys.executable, "-m", "venv", str(BACKEND_DIR / "venv")], check=True, cwd=ROOT)

    print("Installing backend dependencies...")
    subprocess.run([str(py), "-m", "pip", "install", "-r", "requirements.txt"], check=True, cwd=BACKEND_DIR)


def npm_command() -> list[str]:
    return ["npm.cmd"] if is_windows() else ["npm"]


def ensure_frontend_deps() -> None:
    node_modules = FRONTEND_DIR / "node_modules"
    if not node_modules.exists():
        print("Installing frontend dependencies...")
        subprocess.run(npm_command() + ["install"], check=True, cwd=FRONTEND_DIR)


def start_backend() -> subprocess.Popen:
    print("Starting backend on http://localhost:8000")
    return subprocess.Popen(
        [str(backend_python()), "-m", "uvicorn", "main:app", "--reload", "--host", "0.0.0.0", "--port", "8000"],
        cwd=BACKEND_DIR,
        stdout=sys.stdout,
        stderr=sys.stderr,
        text=True,
        start_new_session=True,
    )


def start_frontend() -> subprocess.Popen:
    print("Starting frontend on http://localhost:3000")
    return subprocess.Popen(
        npm_command() + ["run", "dev"],
        cwd=FRONTEND_DIR,
        stdout=sys.stdout,
        stderr=sys.stderr,
        text=True,
        start_new_session=True,
    )


def wait_for_ready(url: str, timeout: int = 180) -> None:
    import urllib.request

    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            with urllib.request.urlopen(url, timeout=5) as response:
                if response.status < 500:
                    return
        except Exception:
            time.sleep(2)
    raise TimeoutError(f"Server did not become ready: {url}")


def main() -> None:
    ensure_backend_env()
    ensure_frontend_deps()

    backend_proc = start_backend()
    frontend_proc = start_frontend()

    try:
        wait_for_ready("http://localhost:8000/docs")
        wait_for_ready("http://localhost:3000")
        print("\nBoth services are running.")
        print("Backend: http://localhost:8000")
        print("Frontend: http://localhost:3000")
        print("\nPress Ctrl+C to stop both services.")

        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nStopping services...")
    finally:
        for proc in (backend_proc, frontend_proc):
            if proc.poll() is None:
                if is_windows():
                    subprocess.run(["taskkill", "/PID", str(proc.pid), "/T", "/F"], check=False)
                else:
                    os.killpg(os.getpgid(proc.pid), signal.SIGTERM)


if __name__ == "__main__":
    main()
