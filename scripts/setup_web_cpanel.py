import urllib.request, urllib.parse, ssl, json

ctx = ssl._create_unverified_context()
cpanel_auth = 'cpanel laguarid:NN40EU4IPPMZNAP9OAKSXKYU7YZR3CMM'

def create_dir(path):
    url = 'https://45.239.218.18:2083/execute/Fileman/mkdir'
    data = urllib.parse.urlencode({'path': path}).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers={'Authorization': cpanel_auth})
    with urllib.request.urlopen(req, context=ctx) as r:
        print(f'mkdir {path}:', r.read().decode()[:120])

def save_file(dir_path, filename, content):
    url = 'https://45.239.218.18:2083/execute/Fileman/save_file_content'
    data = urllib.parse.urlencode({
        'dir': dir_path,
        'file': filename,
        'content': content
    }).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers={'Authorization': cpanel_auth})
    with urllib.request.urlopen(req, context=ctx) as r:
        print(f'save {dir_path}/{filename}:', r.read().decode()[:120])

print('Creando directorios...')
create_dir('/home/laguarid/public_html/dj')
create_dir('/home/laguarid/public_html/audio/comunidad')

# Crear manifest inicial de audio
initial_manifest = {
    "version": "1.0",
    "updated_at": "2026-10-17T11:00:00Z",
    "tracks": []
}
save_file('/home/laguarid/public_html/audio', 'manifest.json', json.dumps(initial_manifest, indent=2))
print('Setup base cPanel listo.')
