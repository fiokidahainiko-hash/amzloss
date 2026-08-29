from pathlib import Path
html = Path('blogs/amazon-associates-commission-rates-2026.html').read_text()
for tag in ['max-image-preview:large','article:published_time','article:modified_time','article:author','article:section','datePublished']:
    status = 'OK' if tag in html else 'MISSING'
    print(f'  {status}: {tag}')
h675 = '675' in html
print(f'  {"OK" if h675 else "MISSING"}: og:image:height 675')
