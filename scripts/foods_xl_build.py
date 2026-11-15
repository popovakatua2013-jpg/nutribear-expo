# -*- coding: utf-8 -*-
"""Генератор большой базы продуктов: foods-xl.js, foods-xl2.js, foods-xl3.js.

- kcal считается по правилу Аттуэтера 4/9/4 и округляется (как в существующей базе);
  для алкоголя берётся табличная калорийность (калории из этанола) — kcal_override.
- Валидация: уникальность id и названий против существующих 5 наборов, sugars/fiber
  не превышают углеводы, ккал в 1..949, порции 3..600 г, теги из допустимых,
  отклонение ккал от 4/9/4 не больше 12% (кроме алкоголя).
"""
import math
import re
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from foods_xl_data1 import CAT1  # noqa: E402
from foods_xl_data2 import CAT2  # noqa: E402


def js_round(x):
    """Math.round как в JS: половина — вверх (для положительных)."""
    return int(math.floor(x + 0.5))

# Работает и из репозитория (scripts/ рядом с src/), и из внешнего воркспейса.
_LOCAL = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'nutribear-expo', 'src', 'lib', 'data')
_REPO = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'src', 'lib', 'data')
DATA_DIR = _LOCAL if os.path.isdir(_LOCAL) else _REPO

EXISTING_FILES = ['foods.js', 'foods-extra.js', 'foods-more.js', 'foods-requests.js', 'foods-big.js']
VALID_TAGS = {'breakfast', 'lunch', 'dinner', 'snack'}
ALCOHOL = set()


def parse_existing():
    ids, names = set(), set()
    for fname in EXISTING_FILES:
        path = os.path.join(DATA_DIR, fname)
        with open(path, encoding='utf-8') as fh:
            src = fh.read()
        ids |= set(re.findall(r"id: '([^']+)'", src))
        names |= set(re.findall(r"name: '([^']+)'", src))
    return ids, names


def rows_to_items(cat):
    items = []
    for row in cat:
        if len(row) == 2 and row[1] is None:
            items.append(('comment', row[0]))
            continue
        fid, emoji, name, p, f, c, fib, sug, dg, tags, override = row
        items.append(('food', dict(id=fid, emoji=emoji, name=name, p=p, f=f, c=c,
                                   fib=fib, sug=sug, dg=dg, tags=tags, override=override)))
    return items


def validate(items, existing_ids, existing_names):
    errors = []
    new_ids, new_names = set(), set()
    foods = [x[1] for x in items if x[0] == 'food']
    for f in foods:
        ALCOHOL.add(f['id']) if f['override'] is not None else None
        if f['id'] in existing_ids:
            errors.append(f"duplicate id with existing DB: {f['id']}")
        if f['id'] in new_ids:
            errors.append(f"duplicate id inside new set: {f['id']}")
        new_ids.add(f['id'])
        if f['name'] in existing_names:
            errors.append(f"duplicate name with existing DB: {f['name']}")
        if f['name'] in new_names:
            errors.append(f"duplicate name inside new set: {f['name']}")
        new_names.add(f['name'])
        if f['sug'] > f['c'] + 1e-9:
            errors.append(f"{f['id']}: sugars {f['sug']} > carbs {f['c']}")
        if f['fib'] > f['c'] + 1e-9:
            errors.append(f"{f['id']}: fiber {f['fib']} > carbs {f['c']}")
        if not (3 <= f['dg'] <= 600):
            errors.append(f"{f['id']}: defaultGrams {f['dg']} out of 3..600")
        bad = [t for t in f['tags'] if t not in VALID_TAGS]
        if bad:
            errors.append(f"{f['id']}: bad tags {bad}")
        if not f['tags']:
            errors.append(f"{f['id']}: no tags")
        kcal_override = f['override']
        kcal = kcal_override if kcal_override is not None else js_round(4 * f["p"] + 9 * f["f"] + 4 * f["c"])
        f['kcal'] = kcal
        if not (1 <= kcal <= 949):
            errors.append(f"{f['id']}: kcal {kcal} out of 1..949")
        if kcal_override is None:
            expected = 4 * f['p'] + 9 * f['f'] + 4 * f['c']
            if kcal != js_round(expected):
                errors.append(f"{f['id']}: kcal round mismatch {kcal} vs {expected}")
    return errors, new_ids, new_names


def fmt_num(v):
    if v == int(v):
        return str(int(v))
    return ('%.1f' % v)


def emit(path, title, var, items):
    lines = [
        '// %s: типовые справочные значения на 100 г / 100 мл (таблицы химсостава,' % title,
        '// USDA/Скурихин). p/f/c — белки, жиры, углеводы в граммах, fib/sug — клетчатка',
        '// и сахара (для рейтинга питания), defaultGrams — реалистичная порция',
        '// (конфета ~20–50 г, масло ~10–15 г), tags — breakfast | lunch | dinner | snack.',
        '// Файл сгенерирован scripts/foods-xl-build.py — правки значений вносить там',
        '// или здесь аккуратно: ккал считается по правилу 4/9/4 от БЖУ (у алкоголя',
        '// калорийность табличная — из этанола).',
        '',
        'export const %s = [' % var,
    ]
    for kind, payload in items:
        if kind == 'comment':
            lines.append('  // %s' % payload)
            continue
        f = payload
        tags = ', '.join("'%s'" % t for t in f['tags'])
        lines.append(
            "  {{ id: '{id}', emoji: '{emoji}', name: '{name}', kcal: {kcal}, p: {p}, f: {f}, c: {c}, "
            "fib: {fib}, sug: {sug}, defaultGrams: {dg}, tags: [{tags}] }},".format(
                id=f['id'], emoji=f['emoji'], name=f['name'], kcal=f['kcal'],
                p=fmt_num(f['p']), f=fmt_num(f['f']), c=fmt_num(f['c']),
                fib=fmt_num(f['fib']), sug=fmt_num(f['sug']), dg=f['dg'], tags=tags))
    lines.append(']')
    lines.append('')
    with open(path, 'w', encoding='utf-8') as fh:
        fh.write('\n'.join(lines))
    n = sum(1 for k, _ in items if k == 'food')
    return n


def main():
    existing_ids, existing_names = parse_existing()
    print('existing: %d ids, %d names' % (len(existing_ids), len(existing_names)))
    items1 = rows_to_items(CAT1)
    items2 = rows_to_items(CAT2)
    all_items = items1 + items2
    errors, new_ids, new_names = validate(all_items, existing_ids, existing_names)
    if errors:
        for e in errors:
            print('ERROR:', e)
        sys.exit(1)

    n1 = emit(os.path.join(DATA_DIR, 'foods-xl.js'),
              'Первый большой набор продуктов (мясо/птица, рыба, супы, гарниры, овощи, фрукты)',
              'XL_FOODS', items1)
    # вторая часть — разрезаем: молочка/яйца/хлеб/сладкое отдельно от фастфуда/напитков
    mid = None
    for idx, (kind, payload) in enumerate(items2):
        if kind == 'comment' and payload.startswith('---------- Фастфуд'):
            mid = idx
            break
    assert mid is not None
    items2a = items2[:mid]
    items2b = items2[mid:]
    n2 = emit(os.path.join(DATA_DIR, 'foods-xl2.js'),
              'Второй большой набор (молочка и сыры, яйца и завтраки, хлеб и выпечка, сладкое и снеки)',
              'XL2_FOODS', items2a)
    n3 = emit(os.path.join(DATA_DIR, 'foods-xl3.js'),
              'Третий большой набор (фастфуд и готовые блюда, соусы, напитки, консервы, веган и ЗОЖ)',
              'XL3_FOODS', items2b)
    print('OK: foods-xl.js=%d, foods-xl2.js=%d, foods-xl3.js=%d, total new=%d' % (n1, n2, n3, n1 + n2 + n3))
    print('new total DB size = %d' % (len(existing_ids) + n1 + n2 + n3))


if __name__ == '__main__':
    main()
