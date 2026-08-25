import re

src = open('js/blog.js', encoding='utf-8').read()
MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
VALID = re.compile(r'^[A-Z][a-z]{2} \d{1,2}, \d{4}$')

def parse(s):
    m = re.match(r'([A-Z][a-z]{2}) (\d+), (\d+)', s)
    return (int(m.group(3)), MONTHS.index(m.group(1)) + 1, int(m.group(2)))

def fmt(t):
    return '%s %d, %d' % (MONTHS[t[1]-1], t[2], t[0])

# collect existing valid dates to avoid collisions
used = set()
for m in re.finditer(r'date: "([^"]*)"', src):
    if VALID.match(m.group(1)):
        used.add(parse(m.group(1)))

# walk backwards from Aug 16, spilling into July, June...
state = {'m': 8, 'd': 16}
def next_date():
    while True:
        t = (2026, state['m'], state['d'])
        state['d'] -= 1
        if state['d'] < 1:
            state['m'] -= 1
            state['d'] = 31 if state['m'] in (7,5,3,1) else 30
            if state['m'] < 1: state['m'] = 12
        if t not in used:
            used.add(t)
            return t

out_lines = []
for line in src.splitlines():
    md = re.search(r'date: "([^"]*)"', line)
    if md and not VALID.match(md.group(1)):
        line = line.replace(md.group(0), 'date: "%s"' % fmt(next_date()))
    out_lines.append(line)

open('js/blog.js', 'w', encoding='utf-8', newline='').write('\n'.join(out_lines))
print('repaired; remaining invalid:',
      sum(1 for m in re.finditer(r'date: "([^"]*)"', open('js/blog.js').read()) if not VALID.match(m.group(1))))
