#!/usr/bin/env python3
"""Generate a TikTok-compliant review video.

Adds a short intro explaining Content Posting API usage and appends
the existing premium ad. Output: ``blogs/img/demo_tiktok_review_final.mp4``
(60fps, 1080x1920) ready for TikTok app review.
"""
import subprocess, shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
WORK = ROOT / ".github" / "talkvid" / "work_review"
WORK.mkdir(parents=True, exist_ok=True)
INTRO = WORK / "intro.mp4"
CONCAT = WORK / "concat.txt"
FINAL = ROOT / "blogs" / "img" / "demo_tiktok_review_final.mp4"
COMPAT = ROOT / "blogs" / "img" / "talkvid-60.mp4"

def sh(*cmd):
    print("+", " ".join(map(str,cmd)), flush=True)
    subprocess.run(list(map(str,cmd)), check=True)

def build_intro():
    from PIL import Image, ImageDraw, ImageFont
    frame = Image.new("RGBA", (1080, 1920), (10, 26, 42, 255))
    draw = ImageDraw.Draw(frame)
    font = lambda s: ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", s)
    draw.text((540, 620), "TikTok Review Demo", font=font(56), fill=(255, 255, 255, 255), anchor="mm")
    draw.text((540, 740), "Content Posting API · video.upload", font=font(40), fill=(139, 92, 246, 255), anchor="mm")
    draw.text((540, 860), "Website shown: amzloss.com", font=font(36), fill=(255, 255, 255, 255), anchor="mm")
    draw.text((540, 980), "Automated vertical promo video", font=font(34), fill=(255, 255, 255, 255), anchor="mm")
    draw.text((540, 1100), "Privacy: SELF_ONLY sandbox draft", font=font(32), fill=(255, 255, 255, 255), anchor="mm")
    frame_path = WORK / "intro_frame.png"
    frame.save(frame_path)
    import imageio_ffmpeg
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    sh(
        ffmpeg, "-y",
        "-loop", "1", "-i", frame_path,
        "-f", "lavfi", "-i", "anullsrc=r=24000:cl=mono",
        "-t", "10",
        "-c:v", "libx264", "-r", "60", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "128k",
        "-shortest", INTRO,
    )

def concat():
    CONCAT.write_text("\n".join([f"file '{INTRO}'", f"file '{COMPAT}'"]), encoding="utf-8")
    import imageio_ffmpeg
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    sh(ffmpeg, "-y", "-f", "concat", "-safe", "0", "-i", CONCAT, "-c", "copy", "-movflags", "+faststart", FINAL)

def main():
    build_intro()
    concat()
    print(f"REVIEW_VIDEO={FINAL}", flush=True)

if __name__ == "__main__":
    main()
