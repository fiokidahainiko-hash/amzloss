import base64, subprocess, sys
from nacl import encoding, public
import urllib.request

REPO = "fiokidahainiko-hash/amzloss"

def gh_token():
    out = subprocess.run(["git", "credential", "fill"], input="url=https://github.com\n\n",
                         capture_output=True, text=True).stdout
    for line in out.splitlines():
        if line.startswith("password="):
            return line[9:]
    raise SystemExit("no github token")

def api(path, method="GET", data=None, tok=None):
    req = urllib.request.Request("https://api.github.com" + path, method=method,
        headers={"Authorization": "Bearer " + tok, "User-Agent": "amzloss-setup",
                 "Accept": "application/vnd.github+json",
                 "Content-Type": "application/json"})
    body = None
    if data is not None:
        import json as _j
        body = data.encode() if isinstance(data, str) else (
            data if isinstance(data, bytes) else _j.dumps(data).encode())
    with urllib.request.urlopen(req, body, timeout=30) as r:
        raw = r.read()
        return r.status, (raw.decode() if raw else "")

tok = gh_token()
name, value = sys.argv[1], sys.argv[2]

_, pk = api(f"/repos/{REPO}/actions/secrets/public-key", tok=tok)
import json
pk = json.loads(pk)
sealed = public.SealedBox(public.PublicKey(pk["key"].encode(),
                          encoding.Base64Encoder())).encrypt(value.encode())
status, _ = api(f"/repos/{REPO}/actions/secrets/{name}", method="PUT",
                data=json.dumps({"encrypted_value": base64.b64encode(sealed).decode(),
                                 "key_id": pk["key_id"]}), tok=tok)
print(name, "->", "STORED" if status in (201, 204) else f"HTTP {status}")
