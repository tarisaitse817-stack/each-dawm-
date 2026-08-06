"""Download the rembg model with retry + resume support"""
import urllib.request
import os
import ssl
import time

# Create context that's less strict about SSL
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

path = os.path.expanduser('~/.u2net/u2netp.onnx')
os.makedirs(os.path.dirname(path), exist_ok=True)

url = 'https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2netp.onnx'

# Check if partial download exists
existing = 0
tmp_path = path + '.part'
if os.path.exists(tmp_path):
    existing = os.path.getsize(tmp_path)
    print(f'Resuming from {existing} bytes')

max_retries = 5
for attempt in range(max_retries):
    try:
        req = urllib.request.Request(url)
        if existing > 0:
            req.add_header('Range', f'bytes={existing}-')

        print(f'Attempt {attempt + 1}/{max_retries}...')
        with urllib.request.urlopen(req, context=ctx, timeout=30) as resp:
            total = int(resp.headers.get('Content-Length', 0))
            mode = 'ab' if existing > 0 else 'wb'
            with open(tmp_path, mode) as f:
                downloaded = existing if existing > 0 else 0
                while True:
                    chunk = resp.read(65536)
                    if not chunk:
                        break
                    f.write(chunk)
                    downloaded += len(chunk)
                    if total > 0:
                        pct = downloaded * 100.0 / (total + existing)
                        mb = downloaded / (1024 * 1024)
                        print(f'\r  {mb:.1f}MB ({pct:.0f}%)', end='', flush=True)

        print('\nDownload complete!')
        os.rename(tmp_path, path)
        print(f'Model saved: {path} ({os.path.getsize(path)} bytes)')
        break

    except Exception as e:
        print(f'\n  Error: {e}')
        existing = os.path.getsize(tmp_path) if os.path.exists(tmp_path) else 0
        if attempt < max_retries - 1:
            wait = (attempt + 1) * 5
            print(f'  Retrying in {wait}s...')
            time.sleep(wait)
        else:
            print('All retries exhausted.')
