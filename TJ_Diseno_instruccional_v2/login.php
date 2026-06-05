<?php
declare(strict_types=1);
@ini_set('display_errors', '0');
ob_start();

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

if (isset($_GET['relogin'])) {
    $_SESSION = [];
    session_destroy();
}

if (!empty($_SESSION['user_id'])) {
    ob_end_clean();
    header('Location: ' . BASE_URL . 'admin.html');
    exit;
}

ob_end_clean();
?>
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Acceso · Teach & Joy</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800&family=Open+Sans:wght@400;600&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --blue:      #1b4b85;
      --blue-dark: #0f2f5a;
      --blue-light:#e8f0fb;
      --red:       #8b2f3a;
      --gold:      #c5aa6f;
      --bg:        #ebeae7;
      --text:      #2a2a32;
      --text-sec:  #6b6b78;
      --border:    #d8d5cf;
      --white:     #ffffff;
      --radius:    8px;
      --font-h:    'Montserrat', sans-serif;
      --font-b:    'Open Sans', sans-serif;
      --transition:.3s cubic-bezier(.4,0,.2,1);
    }

    body {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--bg);
      font-family: var(--font-b);
      color: var(--text);
      padding: 24px;
      -webkit-font-smoothing: antialiased;
    }

    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(20px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .card {
      background: var(--white);
      border-radius: 12px;
      padding: 48px 40px 40px;
      width: 100%;
      max-width: 400px;
      box-shadow: 0 8px 40px rgba(27,75,133,.1);
      animation: fadeUp .45s ease both;
    }

    .logo-wrap {
      text-align: center;
      margin-bottom: 32px;
    }

    .logo-wrap img {
      height: 48px;
      object-fit: contain;
    }

    h1 {
      font-family: var(--font-h);
      font-size: 1.1rem;
      font-weight: 700;
      color: var(--blue);
      text-align: center;
      margin-bottom: 28px;
    }

    label {
      display: block;
      font-size: .78rem;
      font-weight: 700;
      letter-spacing: .04em;
      text-transform: uppercase;
      color: var(--text-sec);
      margin-bottom: 6px;
    }

    input {
      width: 100%;
      padding: 11px 14px;
      border: 1.5px solid var(--border);
      border-radius: var(--radius);
      font-size: .95rem;
      font-family: var(--font-b);
      color: var(--text);
      background: #f5f4f1;
      transition: var(--transition);
      outline: none;
      margin-bottom: 18px;
    }

    input:focus {
      border-color: var(--blue);
      box-shadow: 0 0 0 3px rgba(27,75,133,.08);
      background: var(--white);
    }

    .btn {
      width: 100%;
      padding: 13px;
      background: var(--blue);
      color: #fff;
      border: none;
      border-radius: var(--radius);
      font-family: var(--font-h);
      font-size: .95rem;
      font-weight: 700;
      cursor: pointer;
      transition: var(--transition);
      margin-top: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    .btn svg { width: 16px; height: 16px; }
    .btn:hover { background: var(--red); transform: translateY(-1px); }
    .btn:active { transform: translateY(0); }

    .err {
      background: #fef0f0;
      border: 1px solid #fbc9c9;
      color: #c0392b;
      border-radius: var(--radius);
      padding: 10px 14px;
      font-size: .87rem;
      margin-bottom: 18px;
      display: none;
      align-items: center;
      gap: 8px;
    }

    .err svg { width: 16px; height: 16px; flex-shrink: 0; }

    .back-link {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      text-align: center;
      margin-top: 22px;
      font-size: .84rem;
      color: var(--text-sec);
      text-decoration: none;
      transition: var(--transition);
    }

    .back-link svg { width: 14px; height: 14px; }
    .back-link:hover { color: var(--blue); }

    @media (max-width: 480px) {
      .card { padding: 36px 24px 32px; }
      .logo-wrap img { height: 40px; }
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo-wrap">
      <img src="https://repositorio.paincare.mx/public/Logo_TeachJ_PNG.png" alt="Teach & Joy">
    </div>
    <h1>Acceso Administrador</h1>
    <div class="err" id="err">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
      <span id="err-text"></span>
    </div>
    <label for="user">Usuario</label>
    <input type="text" id="user" autocomplete="username" placeholder="admin">
    <label for="pass">Contraseña</label>
    <input type="password" id="pass" autocomplete="current-password" placeholder="">
    <button class="btn" id="btn-login" onclick="doLogin()">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" x2="3" y1="12" y2="12"/></svg>
      Ingresar
    </button>
    <a href="<?php echo SUBPATH; ?>/index.html" class="back-link">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
      Volver al diseñador
    </a>
  </div>

  <script>
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') doLogin();
    });

    async function doLogin() {
      var u = document.getElementById('user').value.trim();
      var p = document.getElementById('pass').value;
      var err = document.getElementById('err');
      var btn = document.getElementById('btn-login');

      err.style.display = 'none';
      if (!u || !p) { showErr('Completa usuario y contraseña.'); return; }

      btn.innerHTML = '<span style="display:flex;align-items:center;gap:6px">Verificando...</span>';
      btn.disabled = true;

      try {
        var r = await fetch('<?php echo SUBPATH; ?>/api.php?route=/auth/login', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: u, password: p })
        });
        var d = await r.json();
        if (!r.ok) { showErr(d.error || 'Credenciales incorrectas.'); resetBtn(); return; }
        window.location.href = '<?php echo SUBPATH; ?>/admin.html';
      } catch(e) {
        showErr('Error de conexion.');
        resetBtn();
      }
    }

    function showErr(msg) {
      var e = document.getElementById('err');
      document.getElementById('err-text').textContent = msg;
      e.style.display = 'flex';
    }

    function resetBtn() {
      var btn = document.getElementById('btn-login');
      btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" x2="3" y1="12" y2="12"/></svg> Ingresar';
      btn.disabled = false;
    }
  </script>
</body>
</html>
