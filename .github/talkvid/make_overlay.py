#!/usr/bin/env python3
"""Generate simple overlay images with Pillow for B-roll."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import sys

out = Path(sys.argv[1]) if len(sys.argv)>1 else Path("overlay.png")
img = Image.new("RGBA", (1080,1920), (0,0,0,0))
draw = ImageDraw.Draw(img)
# Simple placeholder
draw.rectangle([100,100,980,1820], outline=(255,255,255,128), width=4)
draw.text((540,960),"AMZLOSS",fill=(255,255,255,255))
img.save(out)
print(f"OVERLAY={out}")
