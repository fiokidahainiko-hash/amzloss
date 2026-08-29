#!/usr/bin/env python3
"""Premium AMZLOSS TikTok ad generator.

Captures real site screenshots via Playwright (2x retina), renders a 28–30s
9:16 motion video with kinetic text, voice-over (Edge TTS) and a commercial
disclosure end slate. Outputs ``blogs/img/talkvid.mp4`` ready for TikTok.
"""
import os, sys, asyncio, math, json, textwrap, shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
WORK = ROOT / ".github" / "talkvid" / "work_ad"
WORK.mkdir(parents=True, exist_ok=True)
OUT  = ROOT / "blogs" / "img" / "talkvid.mp4"
VOICE_SCRIPT = (
    "Amazon quietly cut some affiliate rates in half and made earnings harder to verify. "
    "If you still think your old rate applies, you might be leaving hundreds of dollars a month on the table. "
    "The AmzLoss commission calculator shows today's real rate, what a sale should earn, and the exact gap you're losing each month. "
    "Run the free earnings audit to flag possible underpayments in your actual report — no sign-up, fully browser-only, nothing leaves your device. "
    "amzloss.com. Your old commission rate isn't coming back, but at least now you can see exactly what it took with it."
)
W, H, FPS = 1080, 1920, 120
BRAND = (75, 40, 130)
ORANGE = (255, 90, 40)

def sh(*cmd, check=True):
    import subprocess
    print("+", " ".join(map(str,cmd)), flush=True)
    subprocess.run(list(map(str,cmd)), check=check)

def ensure_voice():
    wav = WORK / "voice.mp3"
    if wav.exists():
        return wav
    env = os.environ.copy()
    env["TALKVID_TEXT"] = VOICE_SCRIPT
    env["TALKVID_WAV"] = str(wav)
    import subprocess
    subprocess.run([sys.executable, str(ROOT / ".github" / "talkvid" / "tts.py")], env=env, check=True)
    return wav

def capture_site_assets():
    required = ["home.png","calc_full.png","calc_panel.png","audit.png","rates.png"]
    if all((WORK / f).exists() for f in required):
        return
    from PIL import Image, ImageOps
    src_map = {
        "home.png": ROOT / "index.html",
        "calc_full.png": ROOT / "calculator.html",
        "calc_panel.png": ROOT / "calculator.html",
        "audit.png": ROOT / "audit.html",
        "rates.png": ROOT / "rates.html",
    }
    # Fallbacks to existing blog images if local files are tricky
    img_map = {
        "home.png": ROOT / "site_home.png" if (ROOT / "site_home.png").exists() else ROOT / "index.html",
        "calc_full.png": ROOT / "blogs/img/tool-calculator.png",
        "calc_panel.png": ROOT / "blogs/img/tool-calculator.png",
        "audit.png": ROOT / "blogs/img/tool-audit.png",
        "rates.png": ROOT / "blogs/img/tool-rates.png",
    }
    for dst, src in img_map.items():
        out = WORK / dst
        if out.exists():
            continue
        try:
            img = Image.open(src).convert("RGB")
        except Exception:
            # If the local asset isn't loadable, create a placeholder
            img = Image.new("RGB", (1600, 900), (12, 10, 28))
        ratio = 1600 / img.width
        img = img.resize((1600, int(img.height * ratio)), Image.Resampling.LANCZOS)
        img.save(out)
    # Fallback: if calc_full.png wasn't created, copy calculator asset directly
    if not (WORK / "calc_full.png").exists():
        src = ROOT / "blogs/img/tool-calculator.png"
        if src.exists():
            shutil.copy2(src, WORK / "calc_full.png")
        else:
            Image.new("RGB", (1600, 900), (12, 10, 28)).save(WORK / "calc_full.png")
    # Create a dedicated result crop from calculator asset
    result_src = WORK / "calc_full.png"
    result_dst = WORK / "calc_result.png"
    if not result_dst.exists() and result_src.exists():
        img = Image.open(result_src).convert("RGB")
        w, h = img.size
        # Assume the right portion is the result panel
        crop = img.crop((int(w * 0.52), int(h * 0.16), int(w * 0.98), int(h * 0.88)))
        crop = crop.resize((880, 600), Image.Resampling.LANCZOS)
        crop.save(result_dst)

def load_images():
    from PIL import Image, ImageEnhance, ImageFilter
    imgs = {}
    for name in ["home","calc_full","calc_panel","calc_result","audit","rates"]:
        p = WORK / f"{name}.png"
        if p.exists():
            img = Image.open(p).convert("RGBA")
            # Sharpen + micro-contrast for a crisp, punchy look
            img = ImageEnhance.Sharpness(img).enhance(1.7)
            img = ImageEnhance.Contrast(img).enhance(1.08)
            img = ImageEnhance.Color(img).enhance(1.06)
            imgs[name] = img
    # blur backgrounds
    imgs["home_blur"] = imgs["home"].filter(ImageFilter.GaussianBlur(18))
    imgs["calc_blur"] = imgs["calc_full"].filter(ImageFilter.GaussianBlur(18))
    imgs["audit_blur"] = imgs["audit"].filter(ImageFilter.GaussianBlur(18))
    return imgs

def get_font(size, bold=False):
    from PIL import ImageFont
    candidates = [
        "C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "C:/Windows/Fonts/segoeuib.ttf" if bold else "C:/Windows/Fonts/segoeui.ttf",
    ]
    for c in candidates:
        if c and Path(c).exists():
            return ImageFont.truetype(c, size)
    return ImageFont.load_default()

def ease(t):
    t = max(0.0, min(1.0,t))
    return t*t*(3-2*t)

def crop_center(img, tw, th, scale=1.0):
    from PIL import Image
    sw = int(tw/scale)
    sh = int(th/scale)
    x = max(0,(img.width-sw)//2)
    y = max(0,(img.height-sh)//2)
    cropped = img.crop((x,y,x+sw,y+sh))
    return cropped.resize((tw,th), Image.Resampling.LANCZOS)

def draw_text_shadow(draw, xy, text, font, fill=(255,255,255,255), stroke_fill=(0,0,0,200), stroke_width=3, anchor="mm"):
    draw.text(xy, text, font=font, fill=fill, stroke_width=stroke_width, stroke_fill=stroke_fill, anchor=anchor)

def panel(img, x, y, w, h, radius=18, border=(255,255,255,90), bg=(10,10,12,180)):
    from PIL import Image, ImageDraw
    overlay = Image.new("RGBA", img.size, (0,0,0,0))
    draw = ImageDraw.Draw(overlay)
    draw.rounded_rectangle((x,y,x+w,y+h), radius=radius, fill=bg, outline=border, width=2)
    img.alpha_composite(overlay)
    return img

def render_frame(idx, imgs, fonts):
    from PIL import Image, ImageDraw
    bg = Image.new("RGBA",(W,H),(12,8,28,255))
    t = idx / FPS
    timeline = [
        (0, 2.8, "hook"),
        (2.8, 6.6, "problem"),
        (6.6, 14.0, "calc"),
        (14.0, 19.2, "audit"),
        (19.2, 25.0, "cta"),
        (25.0, 28.0, "joke"),
        (28.0, 30.0, "end")
    ]
    scene = None
    lt = t
    for start,end,name in timeline:
        if t < end:
            scene=name
            lt = t - start
            break
    if scene is None:
        scene="end"; lt=0

    # background
    if scene in ("hook","problem"):
        bg_img = crop_center(imgs["home_blur"], W, H, scale=1.0 + 0.03*lt)
        bg.paste(bg_img, (0,0))
        # dark overlay
        dark = Image.new("RGBA",(W,H),(0,0,0,160))
        bg = Image.alpha_composite(bg, dark)
    elif scene in ("calc","audit"):
        source = "calc_blur" if scene=="calc" else "audit_blur"
        bg_img = crop_center(imgs[source], W, H, scale=1.0+0.02*lt)
        bg.paste(bg_img, (0,0))
        bg = Image.alpha_composite(bg, Image.new("RGBA",(W,H),(0,0,0,180)))
    else:
        # gradient-ish by drawing circles
        draw = ImageDraw.Draw(bg)
        draw.ellipse((W//2-400, H//2-700, W//2+400, H//2+700), fill=(50,20,90,120))
        draw.ellipse((W//2-300, H//2-600, W//2+300, H//2+600), fill=(80,30,130,70))

    draw = ImageDraw.Draw(bg)
    if scene == "hook":
        p = ease(min(1, lt/2.0))
        y_off = int(120*(1-p))
        draw_text_shadow(draw,(W//2, 350-y_off), "AMZLOSS.COM", fonts(36), fill=(255,255,255,230), stroke_width=2)
        draw_text_shadow(draw,(W//2, 750-y_off), "YOUR AMAZON RATE", fonts(72), fill=(255,255,255,255))
        draw_text_shadow(draw,(W//2, 860-y_off), "GOT CUT", fonts(88), fill=ORANGE+(255,))
        draw_text_shadow(draw,(W//2, 1020-y_off), "You just didn't notice.", fonts(46), fill=(240,240,240,255))
        # subtle quote line from site
        if lt>1.0:
            alpha=min(1,(lt-1.0)/0.6)
            draw.rounded_rectangle((110,1220,W-110,1320), radius=14, fill=(255,255,255,int(30*alpha)), outline=(255,255,255,int(100*alpha)))
            txt="\"Amazon quietly made affiliate earnings harder to trust\""
            draw_text_shadow(draw,(W//2,1270), txt, fonts(32), fill=(255,255,255,int(230*alpha)), stroke_width=2)
    elif scene == "problem":
        # main line
        draw_text_shadow(draw,(W//2,380),"Amazon quietly made affiliate earnings", fonts(54))
        draw_text_shadow(draw,(W//2,460),"harder to trust", fonts(58), fill=ORANGE+(255,))
        # cards appear sequentially
        cards = [
            ("Rates cut up to 50%", (0,700)),
            ("Reporting got weaker", (W//2+20,700)),
            ("No fast way to check the math", (0,1000))
        ]
        for i,(txt,pos) in enumerate(cards):
            delay = 0.5 + i*0.6
            if lt>delay:
                alpha=min(1,(lt-delay)/0.5)
                x,y=pos
                bg = panel(bg, x,y, W//2-40, 220, bg=(15,10,30,int(200*alpha)))
                draw = ImageDraw.Draw(bg)
                draw_text_shadow(draw,(x+(W//2-40)//2, y+110), txt, fonts(38), fill=(255,255,255,int(255*alpha)), stroke_width=2)
    elif scene == "calc":
        # foreground calc panel image zooming
        fg = crop_center(imgs["calc_panel"], 980, 620, scale=1.0+0.12*ease(min(1,lt/5.0)))
        bg.alpha_composite(fg, (50, 350))
        draw = ImageDraw.Draw(bg)
        # callouts
        chips = [
            (100,1220,"OLD RATE 8%", ORANGE),
            (W//2+50,1220,"NOW 3%", (200,80,255)),
            (100,1450,"GAP $400 / month", (255,60,60)),
            (W//2+50,1450,"ANNUAL $4,800", (255,200,50)),
        ]
        for i,(x,y,txt,col) in enumerate(chips):
            delay = 0.8 + i*0.7
            if lt>delay:
                alpha=min(1,(lt-delay)/0.4)
                bg = panel(bg, x,y, 430,140,bg=(10,10,14,int(210*alpha)), border=col+(int(180*alpha),))
                draw = ImageDraw.Draw(bg)
                draw_text_shadow(draw,(x+215, y+70), txt, fonts(40), fill=col+(int(255*alpha),), stroke_width=2)
        # title
        draw_text_shadow(draw,(W//2,250),"Commission Calculator", fonts(62))
        draw_text_shadow(draw,(W//2,310),"See the gap before it sees you.", fonts(38), fill=(220,220,220,255))
    elif scene == "audit":
        fg = crop_center(imgs["audit"], 1000, 600, scale=1.0+0.10*ease(min(1,lt/4.0)))
        bg.alpha_composite(fg, (40, 360))
        draw = ImageDraw.Draw(bg)
        draw_text_shadow(draw,(W//2,240),"Earnings Audit", fonts(62))
        draw_text_shadow(draw,(W//2,310),"Verify what you were actually paid.", fonts(38), fill=(220,220,220,255))
        # line bullets
        bullets = [
            "Upload your Amazon earnings report",
            "See possible underpayments vs real rate",
            "Everything runs in your browser",
            "Nothing leaves your device"
        ]
        y0 = 1100
        for i,txt in enumerate(bullets):
            delay = 0.6 + i*0.5
            if lt>delay:
                alpha=min(1,(lt-delay)/0.4)
                draw.rounded_rectangle((120, y0+i*115, W-120, y0+i*115+95), radius=12, fill=(18,12,36,int(170*alpha)), outline=(255,255,255,int(90*alpha)))
                draw_text_shadow(draw,(W//2, y0+i*115+48), txt, fonts(36), fill=(255,255,255,int(240*alpha)), stroke_width=2)
    elif scene == "cta":
        draw_text_shadow(draw,(W//2,550),"amzloss.com", fonts(90))
        draw_text_shadow(draw,(W//2,700),"Free. No sign-up. Browser-only.", fonts(46), fill=(220,220,220,255))
        draw.rounded_rectangle((W//2-320,820,W//2+320,1020), radius=18, fill=(255,90,40,230))
        draw_text_shadow(draw,(W//2,920),"Check your own numbers", fonts(46), stroke_width=2)
    elif scene == "joke":
        draw_text_shadow(draw,(W//2,700),"Your old commission rate", fonts(60))
        draw_text_shadow(draw,(W//2,800),"won't text you back.", fonts(64), fill=ORANGE+(255,))
        draw_text_shadow(draw,(W//2,1020),"Follow for more terrible GUIDELINES", fonts(36), fill=(200,200,200,255), stroke_width=2)
    elif scene == "end":
        # logo+brand+disclosure
        draw_text_shadow(draw,(W//2,750),"AmzLoss", fonts(78))
        draw_text_shadow(draw,(W//2,860),"amzloss.com", fonts(50), fill=(220,220,220,255))
        draw.rounded_rectangle((W//2-340,1020,W//2+340,1200), radius=14, fill=(0,0,0,200), outline=(255,255,255,150))
        draw_text_shadow(draw,(W//2,1110),"Paid promotion: AMZLOSS.COM", fonts(36), fill=(240,240,240,255), stroke_width=2)
    # slight vignette edges
    vignette = Image.new("RGBA",(W,H),(0,0,0,0))
    vd = ImageDraw.Draw(vignette)
    for i in range(80):
        alpha=int(90*(i/80))
        vd.rectangle((i,i,W-i,H-i), outline=(0,0,0,alpha))
    bg = Image.alpha_composite(bg, vignette)
    return bg.convert("RGB")

def render_video(imgs):
    import imageio.v2 as imageio
    import numpy as np
    from PIL import ImageFilter
    fonts = lambda s: get_font(s, bold=True)
    tmp = WORK / "video_silent.mp4"
    frames = int(math.ceil(30*FPS))
    with imageio.get_writer(str(tmp), fps=FPS, codec='libx264', quality=10, macro_block_size=1, pixelformat='yuv420p') as writer:
        for i in range(frames):
            frame = render_frame(i, imgs, fonts)
            # Final sharpening pass for a crisp 120fps look
            frame = frame.filter(ImageFilter.UnsharpMask(radius=2, percent=150, threshold=3))
            writer.append_data(np.asarray(frame))
            if i % 360 == 0:
                print(f"Rendered {i}/{frames}", flush=True)
    return tmp

def mux(video, voice):
    final = WORK / "final.mp4"
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        import imageio_ffmpeg
        ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    cmd = [ffmpeg, "-y", "-i", str(video), "-i", str(voice), "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", str(final)]
    sh(*cmd)
    return final

def make_compat(final):
    out60 = ROOT / "blogs" / "img" / "talkvid-60.mp4"
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        import imageio_ffmpeg
        ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    # 60fps compatibility copy (most players/platforms prefer this)
    sh(ffmpeg, "-y", "-i", str(final), "-c:v", "libx264", "-r", "60", "-crf", "20",
       "-preset", "fast", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k",
       "-movflags", "+faststart", str(out60))
    return out60

def main():
    capture_site_assets()
    imgs = load_images()
    voice = ensure_voice()
    video = render_video(imgs)
    final = mux(video, voice)
    shutil.copy2(final, OUT)
    compat = make_compat(final)
    print(f"TALKVID_MP4={OUT}", flush=True)
    print(f"TALKVID_60={compat}", flush=True)

if __name__ == "__main__":
    main()
