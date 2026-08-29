#!/usr/bin/env python3
"""Batch-fix all existing blog posts for Google Discover readiness.

Adds:
- max-image-preview:large to robots meta
- article:published_time, article:modified_time, article:author, article:section OG tags
- Fixes og:image:height from 630 to 675 (16:9)
"""
import re, os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BLOGS = ROOT / "blogs"

def fix_blog(html_path):
    html = html_path.read_text(encoding="utf-8")
    original = html

    # 1. Fix robots meta: add max-image-preview:large
    html = re.sub(
        r'<meta\s+name="robots"\s+content="index,\s*follow">',
        '<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">',
        html
    )

    # 2. Fix og:image:height from 630 to 675
    html = html.replace(
        '<meta property="og:image:height" content="630">',
        '<meta property="og:image:height" content="675">'
    )

    # 3. Add article OG tags after og:image:height if not present
    if 'article:published_time' not in html:
        # Extract datePublished from schema.org
        date_match = re.search(r'"datePublished":\s*"([^"]+)"', html)
        date_iso = date_match.group(1) if date_match else ""

        # Extract category from page title or schema
        category = "Affiliate Marketing"
        if "calculator" in html_path.name.lower():
            category = "Tools"
        elif "audit" in html_path.name.lower():
            category = "Tools"
        elif "rates" in html_path.name.lower():
            category = "Amazon"
        elif "network" in html_path.name.lower():
            category = "Networks"
        elif "directory" in html_path.name.lower():
            category = "Link Building"
        elif "link" in html_path.name.lower():
            category = "Link Building"
        elif "submit" in html_path.name.lower():
            category = "Tools"
        elif "breakeven" in html_path.name.lower():
            category = "Tools"

        article_tags = f"""  <meta property="article:published_time" content="{date_iso}">
  <meta property="article:modified_time" content="{date_iso}">
  <meta property="article:author" content="AmzLoss">
  <meta property="article:section" content="{category}">"""

        # Insert after og:image:height line
        html = html.replace(
            '<meta property="og:image:height" content="675">',
            '<meta property="og:image:height" content="675">\n' + article_tags
        )

    if html != original:
        html_path.write_text(html, encoding="utf-8")
        return True
    return False

def main():
    fixed = 0
    for html_file in sorted(BLOGS.glob("*.html")):
        if fix_blog(html_file):
            fixed += 1
            print(f"  Fixed: {html_file.name}")
    print(f"\nTotal fixed: {fixed} files")

if __name__ == "__main__":
    main()
