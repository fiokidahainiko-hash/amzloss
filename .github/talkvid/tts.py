#!/usr/bin/env python3
"""TTS wrapper: free edge-tts by default, optional ElevenLabs for premium."""
import os, asyncio, sys
from pathlib import Path

VOICE = os.environ.get("TALKVID_VOICE", "en-US-ChristopherNeural")
ELEVEN_KEY = os.environ.get("ELEVENLABS_API_KEY")
ELEVEN_VOICE = os.environ.get("ELEVENLABS_VOICE_ID", "pNInz6obpgDQGcFmaJgB")

async def edge_tts(text, out_path):
    import edge_tts
    await edge_tts.Communicate(text, VOICE, rate="+8%").save(str(out_path))
    return out_path

def eleven_tts(text, out_path):
    import requests
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{ELEVEN_VOICE}"
    headers = {"xi-api-key": ELEVEN_KEY, "Content-Type": "application/json"}
    data = {"text": text, "voice_settings": {"stability":0.5,"similarity_boost":0.75}}
    r = requests.post(url, headers=headers, json=data, timeout=120)
    r.raise_for_status()
    out_path.write_bytes(r.content)
    return out_path

async def main():
    text = sys.argv[1] if len(sys.argv)>1 else os.environ.get("TALKVID_TEXT","Hello")
    out = Path(os.environ.get("TALKVID_WAV","speech.wav"))
    if ELEVEN_KEY:
        print("Using ElevenLabs", flush=True)
        eleven_tts(text, out)
    else:
        print("Using edge-tts", flush=True)
        await edge_tts(text, out)
    print(f"TTS_OUT={out}")

if __name__ == "__main__":
    asyncio.run(main())
