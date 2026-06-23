import json
import re
import urllib.request
import urllib.parse


def translate_text(text: str, target: str = 'ru', source: str = 'auto') -> str:
    '''Перевод одной строки через бесплатный endpoint Google Translate.'''
    if not text or not text.strip():
        return text
    url = 'https://translate.googleapis.com/translate_a/single'
    params = {
        'client': 'gtx',
        'sl': source,
        'tl': target,
        'dt': 't',
        'q': text,
    }
    full_url = url + '?' + urllib.parse.urlencode(params)
    req = urllib.request.Request(full_url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=20) as resp:
        data = json.loads(resp.read().decode('utf-8'))
    parts = [seg[0] for seg in data[0] if seg and seg[0]]
    return ''.join(parts)


def translate_lines(text: str, target: str) -> str:
    '''Перевод текста построчно, пустые строки сохраняются.'''
    lines = text.split('\n')
    out = []
    for line in lines:
        if line.strip():
            try:
                out.append(translate_text(line, target))
            except Exception:
                out.append(line)
        else:
            out.append(line)
    return '\n'.join(out)


def handler(event, context):
    '''Принимает текст файла игры и возвращает перевод на русский язык через Google Translate.'''
    method = event.get('httpMethod', 'GET')
    cors = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
    }
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': cors, 'body': ''}

    if method != 'POST':
        return {
            'statusCode': 405,
            'headers': {**cors, 'Content-Type': 'application/json'},
            'body': json.dumps({'error': 'Method not allowed'}),
        }

    body = json.loads(event.get('body') or '{}')
    content = body.get('content', '')
    target = body.get('target', 'ru')
    filename = body.get('filename', 'file.txt')

    if not content:
        return {
            'statusCode': 400,
            'headers': {**cors, 'Content-Type': 'application/json'},
            'body': json.dumps({'error': 'Файл пустой'}),
        }

    translated = translate_lines(content, target)

    return {
        'statusCode': 200,
        'headers': {**cors, 'Content-Type': 'application/json'},
        'isBase64Encoded': False,
        'body': json.dumps({'translated': translated, 'filename': filename}, ensure_ascii=False),
    }
