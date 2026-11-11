#!/usr/bin/env python3
"""Converte um PNG de pixel art (ex.: art/heroes/knight.png) nas linhas de texto + paleta que o jogo usa.

Uso:   python tools/png2sprite.py art/heroes/knight.png
Saida: um bloco  rows: [...]  e  pal: {...}  para colar em HERO_ROWS / BASE_PAL no index.html.
Pixeis com alpha < 128 ficam transparentes ('.'). Cada cor diferente ganha uma letra.
"""
import sys
from PIL import Image

def convert(path):
    im = Image.open(path).convert('RGBA'); px = im.load(); pal = {}; letters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'; rows = []
    for y in range(im.height):
        row = ''
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if a < 128: row += '.'; continue
            c = '#%02x%02x%02x' % (r, g, b)
            if c not in pal: pal[c] = letters[len(pal)]
            row += pal[c]
        rows.append(row)
    return rows, pal

if __name__ == '__main__':
    rows, pal = convert(sys.argv[1])
    print('rows: [' + ', '.join("'%s'" % r for r in rows) + ']')
    print('pal: { ' + ', '.join("%s: '%s'" % (l, c) for c, l in pal.items()) + ' }')
