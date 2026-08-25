import re

src = open('js/blog.js', encoding='utf-8').read()
block = re.search(r'var POSTS = \[(.*?)\n  \];', src, re.S)
MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

def parse(s):
    m = re.match(r'([A-Z][a-z]{2}) (\d+), (\d+)', s)
    return (int(m.group(3)), MONTHS.index(m.group(1)) + 1, int(m.group(2)))

def fmt(t):
    return '%s %d, %d' % (MONTHS[t[1]-1], t[2], t[0])

entries = []
for line in block.group(1).splitlines():
    mu = re.search(r'url: "([^"]+)"', line)
    md = re.search(r'date: "([^"]*)"', line)
    if not mu or not md:
        continue
    url, datestr = mu.group(1), md.group(1)
    fd = re.search(r'(\d{4})-(\d{2})-(\d{2})\.html$', url)
    if fd:
        eff = (int(fd.group(1)), int(fd.group(2)), int(fd.group(3)))  # dailies: filename truth
    else:
        eff = parse(datestr)
    entries.append((eff, url, line.strip()))

# rebuild evergreen dates: unique days descending from Jul 31
cursor = {'m': 7, 'd': 31}
def next_evergreen():
    t = (2026, cursor['m'], cursor['d'])
    cursor['d'] -= 1
    if cursor['d'] < 1:
        cursor['m'] -= 1
        cursor['d'] = 30 if cursor['m'] in (6, 4) else 31
    return t

rebuilt = []
for eff, url, line in entries:
    if re.search(r'\d{4}-\d{2}-\d{2}\.html$', url):
        rebuilt.append((eff, line))
    else:
        rebuilt.append((next_evergreen(), line))

# stable sort newest-first (numeric tuples - no string traps)
rebuilt.sort(key=lambda e: e[0], reverse=True)

lines = ['    ' + re.sub(r'date: "[^"]*"', 'date: "%s"' % fmt(e[0]), e[1]) for e in rebuilt]
new_src = src[:block.start(1)] + '\n' + '\n'.join(lines) + '\n' + src[block.end(1):]
open('js/blog.js', 'w', encoding='utf-8', newline='').write(new_src)

dates = [fmt(e[0]) for e in rebuilt]
print('total:', len(rebuilt), '| dupes:', len(dates) - len(set(dates)))
for e in rebuilt[:5] + rebuilt[-3:]:
    print(' ', fmt(e[0]), '|', re.search(r'title: "([^"]+)"', e[1]).group(1)[:50])
