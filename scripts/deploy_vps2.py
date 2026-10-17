import os, sys, tarfile, paramiko
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')

HOST = '45.239.218.11'
USER = 'vpsia'
PASS = 'One123'
REMOTE_DIR = '/home/vpsia/dj-valeria'
LOCAL_DIR = Path(r'D:\CLAUDIOPRO\dj-valeria')

print('=== 1. Creando tarball para despliegue en VPS2 ===')
tar_path = LOCAL_DIR / 'deploy_package.tar.gz'
with tarfile.open(tar_path, 'w:gz') as tar:
    for item in os.listdir(LOCAL_DIR):
        if item in ['node_modules', '.git', 'deploy_package.tar.gz']:
            continue
        p = LOCAL_DIR / item
        tar.add(p, arcname=item)

print(f'Tarball creado: {tar_path.stat().st_size / (1024*1024):.2f} MB')

print('=== 2. Conectando a VPS2 por SSH y SFTP ===')
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS, timeout=30)
sftp = ssh.open_sftp()

print('=== 3. Subiendo paquete a VPS2 ===')
# Ensure remote dir
ssh.exec_command(f'mkdir -p {REMOTE_DIR}')
remote_tar = f'{REMOTE_DIR}/deploy_package.tar.gz'
sftp.put(str(tar_path), remote_tar)
sftp.close()
tar_path.unlink()
print('Subida completa.')

print('=== 4. Desempaquetando e instalando dependencias en VPS2 ===')
cmds = f"""
export PATH=/home/vpsia/.hermes/node/bin:$PATH
cd {REMOTE_DIR}
tar -xzf deploy_package.tar.gz
rm deploy_package.tar.gz
npm install --omit=dev
pm2 delete dj-valeria || true
pm2 start ecosystem.config.cjs
pm2 save
"""

stdin, stdout, stderr = ssh.exec_command(cmds)
out = stdout.read().decode('utf-8', errors='replace')
err = stderr.read().decode('utf-8', errors='replace')
print(out)
if err:
    print('Logs/Avisos:', err[-400:])

ssh.close()
print('=== 5. DESPLIEGUE FINALIZADO EN VPS2 ===')
