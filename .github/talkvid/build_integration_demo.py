#!/usr/bin/env python3
"""TikTok proof-of-integration demo video builder.

Assembles website screenshots + user's TikTok auth clip into a single
1080x1920 vertical video suitable for TikTok app review submission.
No cinematic effects. Clear, annotated, screen-record style.
"""
import subprocess, shutil, math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
WORK = ROOT / ".github" / "talkvid" / "work_review"
OUT  = ROOT / "blogs" / "img" / "tiktok_integration_demo.mp4"
CLIP = WORK / "tiktok_auth_clip.mp4"

SCENES = [
    {"label": "Scene 1: AMZLOSS.COM homepage", "img": "scene1_homepage.png", "duration": 8,
     "url": "https://amzloss.com/"},
    {"label": "Scene 2: Commission Calculator tool", "img": "scene2_calculator.png", "duration": 8,
     "url": "https://amzloss.com/calculator.html"},
    {"label": "Scene 3: Earnings Audit tool", "img": "scene3_audit.png", "duration": 8,
     "url": "https://amzloss.com/audit.html"},
    {"label": "Scene 4: GitHub Actions workflow (auto-posting)", "img": "scene4_workflow.png", "duration": 8,
     "url": "https://github.com/fiokidahainiko-hash/amzloss/actions"},
]

def sh(*cmd):
    print("+", " ".join(map(str,cmd)), flush=True)
    subprocess.run(list(map(str,cmd)), check=True)

def get_ffmpeg():
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        return shutil.which("ffmpeg")

def build_scene_card(scene, idx, total_scenes):
    """Create a 1080x1920 frame with a browser window + real address bar + screenshot."""
    from PIL import Image, ImageDraw, ImageFont

    W, H = 1080, 1920
    canvas = Image.new("RGB", (W, H), (24, 26, 34))
    draw = ImageDraw.Draw(canvas)

    # ---- fonts ----
    try:
        font_label = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", 34)
        font_small = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 26)
        font_url = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 22)
    except Exception:
        font_label = ImageFont.load_default()
        font_small = ImageFont.load_default()
        font_url = ImageFont.load_default()

    # ---- top label ----
    badge = f"Scene {idx+1}/{total_scenes}"
    draw.rounded_rectangle((30, 30, 320, 84), radius=12, fill=(139, 92, 246))
    draw.text((175, 57), badge, font=font_label, fill=(255, 255, 255), anchor="mm")
    draw.text((W // 2, 150), scene["label"], font=font_label, fill=(255, 255, 255), anchor="mm")

    # ---- browser window ----
    win_x, win_y, win_w = 40, 210, W - 80
    chrome_h = 118
    # window background
    draw.rounded_rectangle((win_x, win_y, win_x + win_w, H - 90),
                           radius=16, fill=(23, 29, 41), outline=(70, 80, 105), width=3)
    # title bar
    draw.rounded_rectangle((win_x, win_y, win_x + win_w, win_y + chrome_h),
                           radius=16, fill=(31, 38, 54))
    # traffic-light buttons
    for cx, col in ((win_x + 40, (255, 95, 86)), (win_x + 78, (255, 189, 46)), (win_x + 116, (39, 201, 63))):
        draw.ellipse((cx, win_y + 34, cx + 20, win_y + 54), fill=col)
    # address bar
    bar_x, bar_y, bar_w, bar_h = win_x + 150, win_y + 34, win_w - 190, 46
    draw.rounded_rectangle((bar_x, bar_y, bar_x + bar_w, bar_y + bar_h),
                           radius=23, fill=(16, 21, 33), outline=(60, 70, 95))
    url = scene.get("url", "amzloss.com")
    draw.text((bar_x + 28, bar_y + 4), url, font=font_url, fill=(190, 195, 210), anchor="lm")
    # refresh icon (simple circle + arrow)
    draw.arc((bar_x + bar_w - 44, bar_y + 12, bar_x + bar_w - 16, bar_y + 34), 20, 320, fill=(120, 128, 150), width=3)
    # green padlock hint
    draw.ellipse((bar_x + 18, bar_y + 15, bar_x + 30, bar_y + 27), fill=(80, 200, 120))

    # ---- paste screenshot inside browser window (below chrome) ----
    img_path = WORK / scene["img"]
    if img_path.exists():
        screenshot = Image.open(img_path).convert("RGB")
        page_x = win_x + 12
        page_w = win_w - 24
        scale = page_w / screenshot.width
        new_h = int(screenshot.height * scale)
        page_y = win_y + chrome_h + 12
        screenshot = screenshot.resize((page_w, new_h), Image.Resampling.LANCZOS)
        canvas.paste(screenshot, (page_x, page_y))

    # ---- bottom note ----
    draw.text((W // 2, H - 52), "TikTok Content Posting API integration demo", font=font_small,
              fill=(150, 150, 170), anchor="mm")

    out_path = WORK / f"card_{idx}.png"
    canvas.save(out_path)
    return out_path

def fit_clip_vertical():
    """Convert the user's landscape clip to 1080x1920 vertical with black bars + label."""
    ffmpeg = get_ffmpeg()
    out = WORK / "clip_vertical.mp4"
    # Pad landscape clip into vertical frame, add scene label
    sh(
        ffmpeg, "-y",
        "-i", CLIP,
        "-vf",
        "scale=1080:-2,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=0x0a1a2a,"
        "drawtext=text='Scene 5 - TikTok authorization + sandbox':fontsize=32:fontcolor=white:x=(w-tw)/2:y=60,"
        "drawtext=text='amzloss.com':fontsize=24:fontcolor=0x8b5cf6:x=(w-tw)/2:y=120,"
        "drawtext=text='Content Posting API · video.upload':fontsize=22:fontcolor=0x8b5cf6:x=(w-tw)/2:y=h-80",
        "-c:v", "libx264", "-r", "30", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "128k",
        "-shortest", out,
    )
    return out

def build_closing_card():
    """Final closing card."""
    from PIL import Image, ImageDraw, ImageFont
    W, H = 1080, 1920
    canvas = Image.new("RGB", (W, H), (10, 26, 42))
    draw = ImageDraw.Draw(canvas)
    try:
        font = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", 40)
        font_sm = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 28)
    except Exception:
        font = ImageFont.load_default()
        font_sm = ImageFont.load_default()

    lines = [
        ("This demonstrates the complete", 700),
        ("end-to-end TikTok integration", 760),
        ("currently implemented in AMZLOSS.", 820),
        ("", 880),
        ("Products: Content Posting API", 940),
        ("Scope: video.upload", 990),
        ("Privacy: SELF_ONLY (sandbox)", 1040),
        ("", 1100),
        ("amzloss.com", 1160),
    ]
    for text, y in lines:
        if text:
            draw.text((W // 2, y), text, font=font if text.startswith("This") or text.startswith("amzloss") else font_sm, fill=(255, 255, 255) if text.startswith("This") else (180, 180, 200), anchor="mm")

    out = WORK / "closing.png"
    canvas.save(out)
    return out

def render_scene_video(card_path, duration, has_audio=False, audio_input=None):
    """Turn a static card into a video clip."""
    ffmpeg = get_ffmpeg()
    out = WORK / f"scene_{card_path.stem}.mp4"
    cmd = [ffmpeg, "-y", "-loop", "1", "-i", card_path, "-t", str(duration),
           "-c:v", "libx264", "-r", "30", "-pix_fmt", "yuv420p"]
    if has_audio and audio_input:
        cmd += ["-f", "lavfi", "-i", "anullsrc=r=24000:cl=mono", "-c:a", "aac", "-b:a", "128k", "-shortest"]
    cmd.append(out)
    sh(*cmd)
    return out

def concat_all(parts, out):
    """Concatenate all parts using ffmpeg concat demuxer."""
    ffmpeg = get_ffmpeg()
    list_file = WORK / "concat_all.txt"
    list_file.write_text("\n".join([f"file '{p}'" for p in parts]), encoding="utf-8")
    sh(ffmpeg, "-y", "-f", "concat", "-safe", "0", "-i", list_file,
       "-c:v", "libx264", "-r", "30", "-pix_fmt", "yuv420p",
       "-c:a", "aac", "-b:a", "128k",
       "-movflags", "+faststart", out)

def main():
    ffmpeg = get_ffmpeg()
    parts = []

    # Build scene cards
    total = len(SCENES)
    for i, scene in enumerate(SCENES):
        card = build_scene_card(scene, i, total)
        vid = render_scene_video(card, scene["duration"])
        parts.append(vid)
        print(f"Built scene {i+1}: {scene['label']}")

    # Fit user's TikTok auth clip
    clip_v = fit_clip_vertical()
    parts.append(clip_v)
    print("Fitted TikTok auth clip to vertical")

    # Closing card
    closing = build_closing_card()
    closing_vid = render_scene_video(closing, 8)
    parts.append(closing_vid)
    print("Built closing card")

    # Concatenate all
    concat_all(parts, OUT)
    print(f"FINAL={OUT}")

if __name__ == "__main__":
    main()
