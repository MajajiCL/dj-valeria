import urllib.request, urllib.parse, ssl

ctx = ssl._create_unverified_context()
url = 'https://45.239.218.18:2083/execute/Fileman/save_file_content'
php_code = '<?php echo json_encode(["status" => "ok", "version" => phpversion()]); ?>'
data = urllib.parse.urlencode({
    'dir': '/home/laguarid/public_html',
    'file': 'phptest.php',
    'content': php_code
}).encode('utf-8')

req = urllib.request.Request(url, data=data, headers={'Authorization': 'cpanel laguarid:NN40EU4IPPMZNAP9OAKSXKYU7YZR3CMM'})
resp = urllib.request.urlopen(req, context=ctx)
print('Save:', resp.read().decode()[:100])

req2 = urllib.request.Request('https://laguaridadelnoob.cl/phptest.php', headers={
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/json,*/*'
})
resp2 = urllib.request.urlopen(req2, context=ctx)
print('HTTP Output:', resp2.read().decode())

del_url = 'https://45.239.218.18:2083/execute/Fileman/fileop'
data_del = urllib.parse.urlencode({'op': 'unlink', 'sourcefiles': '/home/laguarid/public_html/phptest.php'}).encode('utf-8')
urllib.request.urlopen(urllib.request.Request(del_url, data=data_del, headers={'Authorization': 'cpanel laguarid:NN40EU4IPPMZNAP9OAKSXKYU7YZR3CMM'}), context=ctx)
print('Cleaned up.')
