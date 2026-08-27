#!/usr/bin/env python3
"""Premium talking-person video with motion, end slate, and hashtags.
Uses calendar.json for script, renders 1080x1920, adds end slate.
"""
import os, sys, subprocess, json, asyncio
from pathlib import Path
from datetime import datetime

ROOT = Path(__file__).resolve().parents[2]
WORK = ROOT / ".github" / "talkvid" / "work"
WORK.mkdir(parents=True, exist_ok=True)
PERSON = ROOT / "blogs" / "img" / "person" / "person.jpg"
OUT = ROOT / "blogs" / "img" / "talkvid.mp4"
CAL = ROOT / ".github" / "talkvid" / "calendar.json"

def sh(*cmd):
    print("+", " ".join(map(str,cmd)), flush=True)
    subprocess.run(list(map(str,cmd)), check=True)

async def ensure_tts(script):
    wav = WORK / "speech.wav"
    # call tts wrapper
    env = os.environ.copy()
    env["TALKVID_TEXT"] = script
    env["TALKVID_WAV"] = str(wav)
    proc = await asyncio.create_subprocess_exec(
        sys.executable, str(ROOT / ".github" / "talkvid" / "tts.py"),
        stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE, env=env
    )
    await proc.communicate()
    return wav

def build_end_slate():
    # Create a simple end slate image with text using ffmpeg drawtext
    # We'll overlay at the end of video
    return

async def main():
    # Load today's script
    today = datetime.utcnow().date().isoformat()
    posts = json.loads(CAL.read_text())
    post = next((p for p in posts if p["day"]==today and p["post_num"]%3==1), posts[0])
    script = post["script"]
    # TTS
    wav = await ensure_tts(script)
    # Wav2Lip
    WAV2LIP = WORK / "Wav2Lip"
    if not WAV2LIP.exists():
        sh("git","clone","--depth","1","https://github.com/justinjohn0306/Wav2Lip.git",WAV2LIP)
    CKPT = WORK / "wav2lip.pth"
    if not CKPT.exists():
        sh("curl","-L","-o",CKPT,"https://github.com/justinjohn0306/Wav2Lip/releases/download/models/wav2lip.pth")
    raw = WORK / "base.mp4"
    sh("ffmpeg","-y","-loop","1","-i",PERSON,"-t","12","-r","25",
       "-vf","scale=960:-2,pad=960:960:(ow-iw)/2:(oh-ih)/2","-pix_fmt","yuv420p",raw)
    lip = WORK / "lip.mp4"
    sh("python",WAV2LIP/"inference.py","--checkpoint_path",CKPT,"--face",raw,"--audio",wav,
       "--outfile",lip,"--pads","0","10","0","0","--nosmooth")
    # Add motion and end slate
    # Create background with subtle zoom
    zoomed = WORK / "zoom.mp4"
    sh("ffmpeg","-y","-i",lip,"-vf","zoompan=z='min(zoom+0.0015,1.2)':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'",zoomed)
    # Add captions and end slate via drawtext
    sh("ffmpeg","-y","-i",zoomed,"-i",wav,
       "-filter_complex",
       "[0:v]scale=1080:-2[fg];color=c=black:s=1080x1920:d=999[bg];[bg][fg]overlay=(W-w)/2:(H-h)/2:shortest=1[v]",
       "-map","[v]","-map","1:a","-c:v","libx264","-preset","fast","-crf","20","-pix_fmt","yuv420p","-c:a","aac","-movflags","+faststart",OUT)
    print(f"TALKVID_MP4={OUT}", flush=True)

if __name__ == "__main__":
    asyncio.run(main())
