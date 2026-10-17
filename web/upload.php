<?php
/**
 * DJ Valeria - Endpoint de Carga de Música y API de Manifiesto (HARDENED SECURITY)
 * La Guarida del Noob & Age of Empires II
 */

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: SAMEORIGIN');
header('Referrer-Policy: strict-origin-when-cross-origin');

$PIN_CORRECTO = 'guarida2026';
$DIR_AUDIO = '/home/laguarid/public_html/audio/comunidad';
$MANIFEST_FILE = '/home/laguarid/public_html/audio/manifest.json';
$RATE_LIMIT_FILE = '/home/laguarid/public_html/audio/.rate_limits.json';
$BASE_URL = 'https://laguaridadelnoob.cl/audio/comunidad';

// Manejar solicitud GET: Listar canciones del manifiesto
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (file_exists($MANIFEST_FILE)) {
        $content = file_get_contents($MANIFEST_FILE);
        echo $content ?: json_encode(['tracks' => []]);
    } else {
        echo json_encode(['tracks' => []]);
    }
    exit;
}

// Manejar solicitud POST: Subir nueva pista con máxima seguridad
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $clientIp = $_SERVER['REMOTE_ADDR'] ?? 'unknown';

    // 1. Control de Tasa (Rate Limiting contra Brute-Force)
    $limits = [];
    if (file_exists($RATE_LIMIT_FILE)) {
        $raw = file_get_contents($RATE_LIMIT_FILE);
        $limits = json_decode($raw, true) ?: [];
    }

    $now = time();
    $ipData = $limits[$clientIp] ?? ['attempts' => 0, 'locked_until' => 0];

    if ($ipData['locked_until'] > $now) {
        $waitSeconds = $ipData['locked_until'] - $now;
        http_response_code(429);
        echo json_encode([
            'success' => false,
            'error' => "Demasiados intentos fallidos. Tu IP está temporalmente bloqueada por {$waitSeconds} segundos."
        ]);
        exit;
    }

    // 2. Validación de PIN con comparación de tiempo constante (Anti-Timing Attack)
    $pin = isset($_POST['pin']) ? (string)$_POST['pin'] : '';
    if (!hash_equals($PIN_CORRECTO, $pin)) {
        $ipData['attempts']++;
        if ($ipData['attempts'] >= 5) {
            $ipData['locked_until'] = $now + (15 * 60); // Bloqueo de 15 minutos
            $ipData['attempts'] = 0;
        }
        $limits[$clientIp] = $ipData;
        @file_put_contents($RATE_LIMIT_FILE, json_encode($limits));

        http_response_code(403);
        echo json_encode([
            'success' => false,
            'error' => 'PIN de creador incorrecto. Solicita la clave al Tío Alex o Majaji.'
        ]);
        exit;
    }

    // PIN correcto: Resetear intentos fallidos
    unset($limits[$clientIp]);
    @file_put_contents($RATE_LIMIT_FILE, json_encode($limits));

    // 3. Validar presencia del archivo
    if (!isset($_FILES['audio_file']) || $_FILES['audio_file']['error'] !== UPLOAD_ERR_OK) {
        http_response_code(400);
        $errCode = isset($_FILES['audio_file']) ? $_FILES['audio_file']['error'] : 'no_file';
        echo json_encode([
            'success' => false,
            'error' => 'No se recibió ningún archivo de audio válido (Código: ' . $errCode . ').'
        ]);
        exit;
    }

    $file = $_FILES['audio_file'];
    $originalName = $file['name'];
    $fileSize = $file['size'];
    $tmpPath = $file['tmp_name'];

    // Límite estricto de tamaño: 50 MB
    if ($fileSize <= 0 || $fileSize > 50 * 1024 * 1024) {
        http_response_code(413);
        echo json_encode([
            'success' => false,
            'error' => 'El archivo supera el límite permitido de 50 MB o está vacío.'
        ]);
        exit;
    }

    // 4. Validar extensión de forma estricta (Solo audio)
    $ext = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
    $allowedExts = ['mp3', 'wav', 'flac', 'ogg', 'm4a'];
    if (!in_array($ext, $allowedExts, true)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Extensión no permitida. Solo se aceptan archivos de audio: .mp3, .wav, .flac, .m4a, .ogg.'
        ]);
        exit;
    }

    // 5. Inspección profunda de Magic Bytes (MIME Type real del binario)
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $realMime = finfo_file($finfo, $tmpPath);
    finfo_close($finfo);

    $allowedMimes = [
        'audio/mpeg',
        'audio/mp3',
        'audio/x-mpeg',
        'audio/x-mp3',
        'audio/wav',
        'audio/x-wav',
        'audio/wave',
        'audio/flac',
        'audio/x-flac',
        'audio/ogg',
        'application/ogg',
        'audio/mp4',
        'audio/x-m4a',
        'audio/aac',
        'video/mp4', // Algunos m4a se reportan como video/mp4 en finfo
        'application/octet-stream' // Fallback en algunos encoders de audio
    ];

    if (!in_array($realMime, $allowedMimes, true)) {
        http_response_code(415);
        echo json_encode([
            'success' => false,
            'error' => 'El archivo no es un audio válido reconocido (MIME detectado: ' . htmlspecialchars($realMime) . ').'
        ]);
        exit;
    }

    // 6. Sanitización estricta de metadatos y nombre de archivo (Anti Path Traversal)
    $title = isset($_POST['title']) ? trim(strip_tags($_POST['title'])) : '';
    if ($title === '') {
        $title = pathinfo($originalName, PATHINFO_FILENAME);
    }
    $title = substr($title, 0, 80);

    $artist = isset($_POST['artist']) ? trim(strip_tags($_POST['artist'])) : 'Tío Alex & La Guarida';
    $artist = substr($artist, 0, 60);

    $category = (isset($_POST['category']) && $_POST['category'] === 'aoe') ? 'aoe' : 'laguarida';

    // Generar nombre aleatorio y único con caracteres alfanuméricos seguros
    $slug = preg_replace('/[^a-zA-Z0-9_\-]/', '_', strtolower($title));
    $slug = trim(substr($slug, 0, 30), '_');
    $uniqueHash = bin2hex(random_bytes(6));
    $filename = 'comunidad_' . $category . '_' . $slug . '_' . time() . '_' . $uniqueHash . '.' . $ext;
    $targetPath = $DIR_AUDIO . '/' . $filename;

    if (!is_dir($DIR_AUDIO)) {
        mkdir($DIR_AUDIO, 0755, true);
    }

    // 7. Mover archivo con permisos restringidos de solo lectura
    if (!move_uploaded_file($tmpPath, $targetPath)) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Error interno del servidor al almacenar el archivo.'
        ]);
        exit;
    }
    chmod($targetPath, 0644); // Archivo de datos no ejecutable

    // 8. Actualizar Manifiesto JSON con bloqueo de concurrencia
    $manifestData = ['version' => '1.0', 'updated_at' => date('c'), 'tracks' => []];
    $fp = fopen($MANIFEST_FILE, 'c+');
    if ($fp && flock($fp, LOCK_EX)) {
        $fileSizeActual = filesize($MANIFEST_FILE);
        if ($fileSizeActual > 0) {
            $raw = fread($fp, $fileSizeActual);
            $parsed = json_decode($raw, true);
            if (is_array($parsed) && isset($parsed['tracks'])) {
                $manifestData = $parsed;
            }
        }

        $newTrack = [
            'id' => 'track_' . uniqid('', true),
            'title' => $title,
            'artist' => $artist,
            'category' => $category,
            'filename' => $filename,
            'url' => $BASE_URL . '/' . $filename,
            'size' => $fileSize,
            'uploaded_at' => date('c')
        ];

        array_unshift($manifestData['tracks'], $newTrack);
        $manifestData['updated_at'] = date('c');

        ftruncate($fp, 0);
        rewind($fp);
        fwrite($fp, json_encode($manifestData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        fflush($fp);
        flock($fp, LOCK_UN);
        fclose($fp);
    } else {
        if ($fp) fclose($fp);
        $newTrack = [
            'id' => 'track_' . uniqid('', true),
            'title' => $title,
            'artist' => $artist,
            'category' => $category,
            'filename' => $filename,
            'url' => $BASE_URL . '/' . $filename,
            'size' => $fileSize,
            'uploaded_at' => date('c')
        ];
    }

    echo json_encode([
        'success' => true,
        'message' => '¡Canción subida y verificada con éxito! DJ Valeria la incorporará a la radio.',
        'track' => $newTrack
    ]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Método HTTP no permitido']);
