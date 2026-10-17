import requests, urllib3
from pathlib import Path
urllib3.disable_warnings()

HOST = '45.239.218.18'
PORT = 2083
USER = 'laguarid'
TOKEN = 'NN40EU4IPPMZNAP9OAKSXKYU7YZR3CMM'
BASE = f'https://{HOST}:{PORT}'
HEADERS = {'Authorization': f'cpanel {USER}:{TOKEN}'}

def save_text(remote_dir, filename, content):
    url = f'{BASE}/execute/Fileman/save_file_content'
    data = {
        'dir': remote_dir,
        'file': filename,
        'content': content,
        'from_charset': 'utf-8',
        'to_charset': 'utf-8'
    }
    r = requests.post(url, headers=HEADERS, data=data, verify=False, timeout=60)
    print(f'Saved {remote_dir}/{filename}: status={r.json().get("status")}')

html_content = Path(r'D:\CLAUDIOPRO\dj-valeria\web\index.html').read_text(encoding='utf-8')
php_content = Path(r'D:\CLAUDIOPRO\dj-valeria\web\upload.php').read_text(encoding='utf-8')

# Deploy to /dj
save_text('/home/laguarid/public_html/dj', 'index.html', html_content)
save_text('/home/laguarid/public_html/dj', 'upload.php', php_content)

# Deploy to /radio
save_text('/home/laguarid/public_html/radio', 'index.html', html_content)
save_text('/home/laguarid/public_html/radio', 'upload.php', php_content)

# Copy to laguaridadelnoob-web public dir
web_public = Path(r'D:\CLAUDIOPRO\laguaridadelnoob-web\public')
(web_public / 'dj').mkdir(parents=True, exist_ok=True)
(web_public / 'radio').mkdir(parents=True, exist_ok=True)
(web_public / 'dj' / 'index.html').write_text(html_content, encoding='utf-8')
(web_public / 'dj' / 'upload.php').write_text(php_content, encoding='utf-8')
(web_public / 'radio' / 'index.html').write_text(html_content, encoding='utf-8')
(web_public / 'radio' / 'upload.php').write_text(php_content, encoding='utf-8')

print('=== DESPLIEGUE A CPANEL Y LOCAL COMPLETADO ===')
