#!/usr/bin/env python3
"""Premium cinematic AMZLOSS promo video with screen capture + voice over.
Creates 25-30s vertical 1080x1920 video with zoom transitions, text overlays,
and commercial disclosure end slate. No Wav2Lip required.
"""
import os, sys, subprocess, json
from pathlib import Path
from datetime import datetime

ROOT = Path(__file__).resolve().parents[2]
WORK = ROOT / ".github" / "talkvid" / "work"
WORK.mkdir(parents=True, exist_ok=True)
OUT = ROOT / "blogs" / "img" / "talkvid.mp4"
CAL = ROOT / ".github" / "talkvid" / "calendar.json"

def sh(*cmd):
    print("+", " ".join(map(str,cmd)), flush=True)
    subprocess.run(list(map(str,cmd)), check=True)

def ensure_tts(script):
    wav = WORK / "speech.wav"
    env = os.environ.copy()
    env["TALKVID_TEXT"] = script
    env["TALKVID_WAV"] = str(wav)
    subprocess.run([sys.executable, str(ROOT / ".github" / "talkvid" / "tts.py")], env=env, check=True)
    return wav

def take_screenshots(tool_page, count=3):
    # Use Playwright to grab screenshots of the tool page
    shots = []
    for i in range(count):
        out = WORK / f"shot_{i}.png"
        # Simple curl -> placeholder. Replace with Playwright in production
        sh("curl","-s","https://amzloss.com/"+tool_page,"-o",WORK/f"page.html")
        # For now create a colored placeholder
        sh("ffmpeg","-y","-f","lavfi","-i","color=c=0x0A1A2A:s=1280x720:d=1","-vf","drawtext=text='AMZLOSS '+tool_page+': '+str(i):fontsize=48:fontcolor=white:x=(w-text_w)/2:y=h/2",out)
        shots.append(out)
    return shots

def main():
    # Load today's script
    today = datetime.utcnow().date().isoformat()
    posts = json.loads(CAL.read_text())
    post = next((p for p in posts if p["day"]==today and p["post_num"]%3==1), posts[0])
    script = post["script"]
    tool_page = post["page"]
    
    wav = ensure_tts(script)
    
    shots = take_screenshots(tool_page)
    
    # Build video list for FFmpeg concat with zoompan
    # Create a temporary video per shot with zoom
    vids = []
    for i,shot in enumerate(shots):
        v = WORK / f"clip_{i}.mp4"
        sh("ffmpeg","-y","-loop","1","-i",shot,"-t","8","-vf","scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,zoompan=z='min(zoom+0.0015,1.2)':d=240:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'","-pix_fmt","yuv420p",v)
        vids.append(v)
    
    # Concatenate
    concat = WORK / "concat.txt"
    concat.write_text("\n".join([f"file '{v}'" for v in vids]))
    
    # End slate
    slate = WORK / "slate.mp4"
    sh("ffmpeg","-y","-f","lavfi","-i","color=c=black:s=1080x1920:d=3","-vf","drawtext=text='Paid promotion: AMZLOSS.COM':fontsize=56:fontcolor=white:x=(w-text_w)/2:y=h/2-100,drawtext=text='Get link in bio or search AMZLOSS.COM':fontsize=42:fontcolor=white:x=(w-text_w)/2:y=h/2,drawtext=text='Follow for more terrible GUIDELINES':fontsize=48:fontcolor=white:x=(w-text_w)/2:y=h/2+100",slate)
    
    # Final concat with audio
    final_list = WORK / "final_concat.txt"
    final_list.write_text("\n".join([f"file '{v}'" for v in vids] + [f"file '{slate}'"]))
    sh("ffmpeg","-y","-f","concat","-safe","0","-i",final_list,"-i",wav,
       "-filter_complex","[0:v]scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2[v];[v]concat=n=1:v=1:a=0","-map","[v]","-map","1:a?",
       "-c:v","libx264","-preset","fast","-crf","20","-pix_fmt","yuv420p","-c:a","aac","-movflags","+faststart",OUT)
    
    print(f"TALKVID_MP4={OUT}", flush=True)

if __name__ == "__main__":
    main()
