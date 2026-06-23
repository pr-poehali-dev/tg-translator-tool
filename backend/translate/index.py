import json
import urllib.request
import urllib.parse
import zipfile
import io
import base64
import time


def translate_text(text: str, target: str = 'ru') -> str:
    '''Перевод одной строки через бесплатный endpoint Google Translate.'''
    if not text or not text.strip():
        return text
    url = 'https://translate.googleapis.com/translate_a/single'
    params = {'client': 'gtx', 'sl': 'auto', 'tl': target, 'dt': 't', 'q': text}
    full_url = url + '?' + urllib.parse.urlencode(params)
    req = urllib.request.Request(full_url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=20) as resp:
        data = json.loads(resp.read().decode('utf-8'))
    parts = [seg[0] for seg in data[0] if seg and seg[0]]
    return ''.join(parts)


def translate_lines(text: str, target: str) -> str:
    '''Перевод текста построчно, структура и пустые строки сохраняются.'''
    lines = text.split('\n')
    out = []
    for line in lines:
        if line.strip():
            try:
                out.append(translate_text(line, target))
                time.sleep(0.05)
            except Exception:
                out.append(line)
        else:
            out.append(line)
    return '\n'.join(out)


def translate_json_values(obj, target: str):
    '''Рекурсивно переводит строковые значения в JSON-объекте.'''
    if isinstance(obj, str):
        try:
            translated = translate_text(obj, target)
            time.sleep(0.05)
            return translated
        except Exception:
            return obj
    elif isinstance(obj, list):
        return [translate_json_values(item, target) for item in obj]
    elif isinstance(obj, dict):
        return {k: translate_json_values(v, target) for k, v in obj.items()}
    return obj


def process_file(name: str, content: bytes, target: str) -> bytes:
    '''Обрабатывает один файл: json — рекурсивно, txt — построчно.'''
    text = content.decode('utf-8', errors='replace')
    ext = name.rsplit('.', 1)[-1].lower() if '.' in name else ''

    if ext == 'json':
        try:
            obj = json.loads(text)
            translated_obj = translate_json_values(obj, target)
            return json.dumps(translated_obj, ensure_ascii=False, indent=2).encode('utf-8')
        except Exception:
            pass

    return translate_lines(text, target).encode('utf-8')


def handler(event, context):
    '''
    Принимает ZIP-архив с папкой игры (base64), переводит все .txt и .json файлы
    на русский язык через Google Translate и возвращает готовый ZIP (base64).
    '''
    cors = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
    }

    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': cors, 'body': ''}

    if event.get('httpMethod') != 'POST':
        return {'statusCode': 405, 'headers': {**cors, 'Content-Type': 'application/json'}, 'body': json.dumps({'error': 'Method not allowed'})}

    body = json.loads(event.get('body') or '{}')
    zip_b64 = body.get('zip_b64', '')
    target = body.get('target', 'ru')

    if not zip_b64:
        return {'statusCode': 400, 'headers': {**cors, 'Content-Type': 'application/json'}, 'body': json.dumps({'error': 'Нет файлов'})}

    zip_bytes = base64.b64decode(zip_b64)
    in_zip = zipfile.ZipFile(io.BytesIO(zip_bytes), 'r')

    out_buffer = io.BytesIO()
    with zipfile.ZipFile(out_buffer, 'w', zipfile.ZIP_DEFLATED) as out_zip:
        for item in in_zip.infolist():
            data = in_zip.read(item.filename)
            ext = item.filename.rsplit('.', 1)[-1].lower() if '.' in item.filename else ''

            if ext in ('txt', 'json') and not item.is_dir():
                try:
                    data = process_file(item.filename, data, target)
                except Exception:
                    pass

            out_zip.writestr(item, data)

    out_zip_b64 = base64.b64encode(out_buffer.getvalue()).decode('utf-8')

    return {
        'statusCode': 200,
        'headers': {**cors, 'Content-Type': 'application/json'},
        'body': json.dumps({'zip_b64': out_zip_b64}, ensure_ascii=False),
    }
