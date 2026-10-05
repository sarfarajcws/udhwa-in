"""
One-off migration of legacy udhwa.in articles (static HTML / JSON with HTML
strings) into clean semantic HTML. prisma/seed.ts then converts that HTML to
validated Tiptap JSON. Kept for provenance; not used at runtime.

Usage: python3 scripts/migrate-legacy-html.py <old-site-dir> prisma/seed-content
"""
import json, re, sys, os
from bs4 import BeautifulSoup, NavigableString

old, out = sys.argv[1], sys.argv[2]

def clean(html):
    # Some legacy JSON bodies mix Markdown headings into HTML.
    html = re.sub(r'(?m)^##\s+(.+)$', r'<h2>\1</h2>', html)
    soup = BeautifulSoup(html, 'html.parser')
    for sel in ['.blog-tags', '.social-share', '.blog-navigation', '.related-blogs', '.share-buttons', 'script', 'style']:
        for el in soup.select(sel): el.decompose()
    for el in soup.select('.stats-grid'):
        ul = soup.new_tag('ul')
        for card in el.select('.stat-card'):
            li = soup.new_tag('li'); b = soup.new_tag('strong')
            b.string = card.select_one('.stat-number').get_text(strip=True)
            li.append(b); li.append(' ' + card.select_one('.stat-label').get_text(strip=True)); ul.append(li)
        el.replace_with(ul)
    for el in soup.select('.bird-scientific'):
        em = soup.new_tag('em'); em.string = f" ({el.get_text(strip=True)})"; el.replace_with(em)
    def to_list(container_sel, item_sel):
        for c in soup.select(container_sel):
            ul = soup.new_tag('ul')
            for it in c.select(item_sel):
                li = soup.new_tag('li')
                for ch in list(it.children): li.append(ch)
                ul.append(li)
            c.replace_with(ul)
    to_list('.bird-list', '.bird-item'); to_list('.events-grid', '.event-item')
    for c in soup.select('.age-categories'):
        ul = soup.new_tag('ul')
        for card in c.select('.age-card'):
            li = soup.new_tag('li'); t = card.select_one('.age-title')
            if t:
                b = soup.new_tag('strong'); b.string = t.get_text(strip=True); li.append(b); t.decompose()
            li.append(' — ' + ' '.join(card.get_text(' ', strip=True).split())); ul.append(li)
        c.replace_with(ul)
    # consecutive .rule-item -> one list
    for item in soup.select('.rule-item'):
        num = item.select_one('.rule-number')
        if num: num.decompose()
        item.name = 'li'; item.attrs = {}
    for li in soup.find_all('li'):
        if li.parent and li.parent.name not in ('ul', 'ol'):
            ul = soup.new_tag('ul'); li.insert_before(ul)
            sib = ul.next_sibling
            while sib is not None and (isinstance(sib, NavigableString) and not sib.strip() or getattr(sib, 'name', None) == 'li'):
                nxt = sib.next_sibling
                if getattr(sib, 'name', None) == 'li': ul.append(sib.extract())
                else: sib.extract()
                sib = nxt
    for box in soup.select('.info-box'):
        h = box.find(['h3', 'h4'])
        if h:
            p = soup.new_tag('p'); b = soup.new_tag('strong'); b.string = h.get_text(strip=True); p.append(b); h.replace_with(p)
        box.name = 'blockquote'; box.attrs = {}
    for card in soup.select('.date-card, .lake-card, .card'):
        h = card.find(['h3', 'h4'])
        if h: h.name = 'h3'
    for el in soup.select('span.highlight'): el.name = 'mark'; el.attrs = {}
    for h in soup.find_all('h4'): h.name = 'h3'
    for h in soup.find_all('h1'): h.name = 'h2'
    # unwrap layout divs/spans, drop styles
    for el in soup.find_all(['div', 'section', 'span', 'center']): el.unwrap()
    for el in soup.find_all(True):
        keep = {'a': ['href'], 'img': ['src', 'alt']}.get(el.name, [])
        el.attrs = {k: v for k, v in el.attrs.items() if k in keep}
    for img in soup.find_all('img'): img.decompose()  # covers handled separately
    # stray text at top level -> paragraphs
    html = str(soup)
    html = re.sub(r'<!--.*?-->', '', html, flags=re.S)
    html = re.sub(r'\n\s*\n', '\n', html)
    return html.strip()

def body_from_file(path):
    t = open(path, encoding='utf-8').read()
    soup = BeautifulSoup(t, 'html.parser')
    el = soup.select_one('.blog-content, .news-content')
    return clean(el.decode_contents())

os.makedirs(out, exist_ok=True)
blogs = {b['id']: b for b in json.load(open(f'{old}/data/blogs/blog-posts.json', encoding='utf-8'))}
news = {n['id']: n for n in json.load(open(f'{old}/data/news/news-posts.json', encoding='utf-8'))}
files = {
    'blog-computer-skills.html': clean(blogs[1]['content']),
    'blog-phone-coding.html': clean(blogs[2]['content']),
    'blog-udhwa-lake.html': body_from_file(f'{old}/blogs/blog-3.html'),
    'news-ict-championship.html': clean(news[1]['content'].replace('\n\n', '</p><p>')),
    'news-jac-exam.html': clean(news[2]['content']),
    'news-school-sports.html': body_from_file(f'{old}/news/news-3.html'),
    'news-petrol-pump.html': body_from_file(f'{old}/news/news-4.html'),
}
for name, html in files.items():
    open(f'{out}/{name}', 'w', encoding='utf-8').write(html + '\n')
    print(name, len(html))
