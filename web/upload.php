<?php
/**
 * DJ Valeria - Endpoint de Carga de Música y API de Manifiesto
 * La Guarida del Noob & Age of Empires II
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$PIN_CORRECTO = 'guarida2026';
$DIR_AUDIO = '/home/laguarid/public_html/audio/comunidad';
$MANIFEST_FILE = '/home/laguarid/public_html/audio/manifest.json';
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

// Manejar solicitud POST: Subir nueva pista
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // 1. Validar PIN
    $pin = isset($_POST['pin']) ? trim($_POST['pin']) : '';
    if ($pin !== $PIN_CORRECTO) {
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'error' => 'PIN de creador incorrecto. Solicita la clave al Tío Alex o Majaji.'
        ]);
        exit;
    }

    // 2. Validar archivo
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

    // Límite de 50 MB
    if ($fileSize > 50 * 1024 * 1024) {
        http_response_code(413);
        echo json_encode([
            'success' => false,
            'error' => 'El archivo supera el límite permitido de 50 MB.'
        ]);
        exit;
    }

    // Validar extensión
    $ext = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
    $allowedExts = ['mp3', 'wav', 'flac', 'ogg', 'm4a'];
    if (!in_array($ext, $allowedExts)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Formato no soportado. Formatos válidos: MP3, WAV, FLAC, M4A, OGG.'
        ]);
        exit;
    }

    // Metadatos
    $title = isset($_POST['title']) && trim($_POST['title']) !== '' 
        ? trim($_POST['title']) 
        : pathinfo($originalName, PATHINFO_FILENAME);
    $artist = isset($_POST['artist']) && trim($_POST['artist']) !== '' 
        ? trim($_POST['artist']) 
        : 'Tío Alex & La Guarida';
    $category = isset($_POST['category']) && in_array($_POST['category'], ['aoe', 'laguarida']) 
        ? $_POST['category'] 
        : 'laguarida';

    // Sanitizar nombre de archivo
    $slug = preg_replace('/[^a-zA-Z0-9_\-]/', '_', strtolower($title));
    $slug = substr($slug, 0, 40);
    $filename = 'comunidad_' . $category . '_' . $slug . '_' . time() . '.' . $ext;
    $targetPath = $DIR_AUDIO . '/' . $filename;

    if (!is_dir($DIR_AUDIO)) {
        mkdir($DIR_AUDIO, 0755, true);
    }

    if (!move_uploaded_file($tmpPath, $targetPath)) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Error del servidor al guardar el archivo en el almacenamiento.'
        ]);
        exit;
    }

    // Actualizar manifiesto JSON
    $manifestData = ['version' => '1.0', 'updated_at' => date('c'), 'tracks' => []];
    if (file_exists($MANIFEST_FILE)) {
        $existing = json_decode(file_get_contents($MANIFEST_FILE), true);
        if (is_array($existing) && isset($existing['tracks'])) {
            $manifestData = $existing;
        }
    }

    $newTrack = [
        'id' => 'track_' . uniqid(),
        'title' => $title,
        'artist' => $artist,
        'category' => $category,
        'filename' => $filename,
        'url' => $BASE_URL . '/' . $filename,
        'size' => $fileSize,
        'uploaded_at' => date('c')
    ];

    // Prepend new track to manifest
    array_unshift($manifestData['tracks'], $newTrack);
    $manifestData['updated_at'] = date('c');

    file_put_contents($MANIFEST_FILE, json_encode($manifestData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

    echo json_encode([
        'success' => true,
        'message' => '¡Canción subida con éxito! DJ Valeria la incorporará a la rotación de inmediato.',
        'track' => $newTrack
    ]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Método no permitido']);
