<?php
declare(strict_types=1);
@ini_set('display_errors', '0');
ob_start();

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { ob_end_clean(); http_response_code(204); exit; }

require_once __DIR__ . '/config/config.php';

if (session_status() === PHP_SESSION_NONE) {
    session_set_cookie_params([
        'path'     => SUBPATH . '/',
        'httponly' => true,
        'samesite' => 'Lax',
        'secure'   => (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off'),
    ]);
    session_start();
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function json_response($data, int $code = 200): void {
    ob_end_clean();
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function json_error(string $msg, int $code = 400): void {
    json_response(['error' => $msg], $code);
}

function db(): PDO {
    static $pdo = null;
    if ($pdo) return $pdo;
    $pdo = new PDO('sqlite:' . DB_PATH);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    $pdo->exec("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;");
    init_db($pdo);
    return $pdo;
}

function body_json(): array {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw ?: '{}', true);
    return is_array($data) ? $data : [];
}

function require_auth(): void {
    if (empty($_SESSION['user_id'])) json_error('No autenticado', 401);
}

function require_admin(): void {
    require_auth();
    if (($_SESSION['role'] ?? '') !== 'admin') json_error('Sin permisos', 403);
}

function one_query(string $sql, array $p = []): ?array {
    $st = db()->prepare($sql); $st->execute($p); $r = $st->fetch(); return $r ?: null;
}

function rows_query(string $sql, array $p = []): array {
    $st = db()->prepare($sql); $st->execute($p); return $st->fetchAll();
}

// ── Init DB ───────────────────────────────────────────────────────────────────

function init_db(PDO $pdo): void {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS app_users (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            username      TEXT    NOT NULL UNIQUE,
            display_name  TEXT    NOT NULL,
            password_hash TEXT    NOT NULL,
            role          TEXT    NOT NULL DEFAULT 'admin',
            active        INTEGER NOT NULL DEFAULT 1,
            created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS disenos (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            uuid          TEXT    NOT NULL UNIQUE,
            autor_nombre  TEXT,
            autor_email   TEXT,
            titulo        TEXT,
            datos_json    TEXT    NOT NULL,
            completitud   INTEGER NOT NULL DEFAULT 0,
            created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
            updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
        );
    ");

    // Seed admin si no existe
    $admin = $pdo->prepare("SELECT id FROM app_users WHERE username = ?");
    $admin->execute(['admin']);
    if (!$admin->fetch()) {
        $hash = password_hash('admin2026', PASSWORD_BCRYPT);
        $pdo->prepare("INSERT INTO app_users (username, display_name, password_hash, role) VALUES (?, ?, ?, ?)")
            ->execute(['admin', 'Administrador', $hash, 'admin']);
    }
}

// ── Router ────────────────────────────────────────────────────────────────────

try {
    db();

    $route  = trim($_GET['route'] ?? '', '/');
    $parts  = explode('/', $route);
    $base   = $parts[0] ?? '';
    $seg1   = $parts[1] ?? '';
    $seg2   = $parts[2] ?? '';
    $method = $_SERVER['REQUEST_METHOD'];

    // ── Auth ──────────────────────────────────────────────────────────────────

    if ($base === 'auth') {
        if ($method === 'POST' && $seg1 === 'login') {
            $b = body_json();
            $u = trim($b['username'] ?? '');
            $p = $b['password'] ?? '';
            if (!$u || !$p) json_error('Credenciales requeridas', 400);
            $row = one_query('SELECT * FROM app_users WHERE username=? AND active=1', [$u]);
            if (!$row || !password_verify($p, $row['password_hash'])) json_error('Usuario o contraseña incorrectos', 401);
            session_regenerate_id(true);
            $_SESSION['user_id']      = (int)$row['id'];
            $_SESSION['username']     = $row['username'];
            $_SESSION['display_name'] = $row['display_name'];
            $_SESSION['role']         = $row['role'];
            json_response(['ok' => true, 'role' => $row['role'], 'name' => $row['display_name']]);
        }
        if ($method === 'POST' && $seg1 === 'logout') {
            session_destroy();
            json_response(['ok' => true]);
        }
        if ($method === 'GET' && $seg1 === 'me') {
            if (empty($_SESSION['user_id'])) json_response(['authenticated' => false]);
            json_response(['authenticated' => true, 'role' => $_SESSION['role'], 'name' => $_SESSION['display_name']]);
        }
    }

    // ── Diseños ───────────────────────────────────────────────────────────────

    if ($base === 'disenos') {

        // POST /disenos — guardar nuevo diseño (público, sin auth)
        if ($method === 'POST' && $seg1 === '') {
            $b = body_json();
            $datos = $b['datos'] ?? null;
            if (!$datos) json_error('Datos requeridos', 400);

            $uuid         = sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
                mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff),
                mt_rand(0, 0x0fff) | 0x4000, mt_rand(0, 0x3fff) | 0x8000,
                mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff));
            $titulo       = trim($b['titulo'] ?? 'Sin título');
            $autor_nombre = trim($b['autor_nombre'] ?? '');
            $autor_email  = trim($b['autor_email'] ?? '');
            $completitud  = (int)($b['completitud'] ?? 0);
            $json         = json_encode($datos, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

            db()->prepare("INSERT INTO disenos (uuid, autor_nombre, autor_email, titulo, datos_json, completitud)
                VALUES (?, ?, ?, ?, ?, ?)")
                ->execute([$uuid, $autor_nombre, $autor_email, $titulo, $json, $completitud]);

            json_response(['ok' => true, 'uuid' => $uuid]);
        }

        // GET /disenos — listar todos (solo admin)
        if ($method === 'GET' && $seg1 === '') {
            require_admin();
            $rows = rows_query("SELECT id, uuid, autor_nombre, autor_email, titulo, completitud, created_at
                FROM disenos ORDER BY created_at DESC");
            json_response($rows);
        }

        // GET /disenos/{uuid} — ver uno (solo admin)
        if ($method === 'GET' && $seg1 !== '') {
            require_admin();
            $row = one_query("SELECT * FROM disenos WHERE uuid = ?", [$seg1]);
            if (!$row) json_error('No encontrado', 404);
            $row['datos_json'] = json_decode($row['datos_json'], true);
            json_response($row);
        }

        // DELETE /disenos/{uuid} — eliminar (solo admin)
        if ($method === 'DELETE' && $seg1 !== '') {
            require_admin();
            db()->prepare("DELETE FROM disenos WHERE uuid = ?")->execute([$seg1]);
            json_response(['ok' => true]);
        }
    }

    json_error('Ruta no encontrada', 404);

} catch (Throwable $e) {
    json_error('Error interno: ' . $e->getMessage(), 500);
}
