import os, shutil
from pathlib import Path

spotify_root = Path(r"D:\RESPALDO_DESKTOP_ONEDRIVE\ALEX VIVE SPOTIFY")
web_audio_root = Path(r"D:\CLAUDIOPRO\laguaridadelnoob-web\audio")
dest_dir = Path(r"D:\CLAUDIOPRO\dj-valeria\tracks\laguarida")

dest_dir.mkdir(parents=True, exist_ok=True)

# 1. Copy Spotify releases
for root, dirs, files in os.walk(spotify_root):
    for f in files:
        if f.lower().endswith(('.mp3', '.flac')) and not f.lower().startswith('caratula'):
            clean_name = f.strip().replace('“', '').replace('”', '').replace('"', '')
            if '10' in clean_name or 'diez' in clean_name.lower():
                continue
            src = os.path.join(root, f)
            dst = dest_dir / clean_name
            shutil.copy2(src, dst)
            print(f'Añadida Spotify: {clean_name}')

# 2. Copy Web exclusives
web_exclusives = ['rap-de-la-guarida-3.mp3', 'familia-de-la-guarida.mp3']
for f in web_exclusives:
    src = web_audio_root / f
    if src.exists():
        dst = dest_dir / f
        shutil.copy2(src, dst)
        print(f'Añadida Web: {f}')

print('\nTotal actual en tracks/laguarida:')
for f in sorted(os.listdir(dest_dir)):
    print(' -', f)
