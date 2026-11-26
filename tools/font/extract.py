# 美咲ゴシック (misaki_gothic.png, 8x8) から 1〜8区の字形を取り出して misaki.json にする。
# 値は 7 行 × 7 ビット (各行 1 バイト、上位ビットが左) の 16 進文字列。
import json
from PIL import Image
im = Image.open('tools/font/misaki_gothic.png').convert('L')
out = {}
for ku in range(1, 9):
    for ten in range(1, 95):
        try:
            ch = bytes([ku + 0xA0, ten + 0xA0]).decode('euc_jp')
        except UnicodeDecodeError:
            continue
        rows = [sum((im.getpixel(((ten - 1) * 8 + x, (ku - 1) * 8 + y)) < 128) << (6 - x) for x in range(7)) for y in range(7)]
        if any(rows):
            out[ch] = ''.join('%02x' % r for r in rows)
json.dump(out, open('tools/font/misaki.json', 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print(len(out), 'glyphs')
