<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST");

$host = "localhost";
$db_name = "venturo_db";
$username = "root";
$password = ""; 

try {
    $conn = new PDO("mysql:host=" . $host . ";dbname=" . $db_name, $username, $password);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch(PDOException $exception) {
    echo json_encode(["status" => "error", "message" => "Database error"]);
    exit;
}

$action = isset($_GET['action']) ? $_GET['action'] : '';
$method = $_SERVER['REQUEST_METHOD'];
$data = json_decode(file_get_contents("php://input"));

if ($action == 'register' && $method == 'POST') {
    $user = $data->username;
    $pass = password_hash($data->password, PASSWORD_DEFAULT);
    
    $stmt = $conn->prepare("SELECT id FROM users WHERE username = ?");
    $stmt->execute([$user]);
    if($stmt->rowCount() > 0) {
        echo json_encode(["status" => "error", "message" => "Username sudah dipakai!"]);
        exit;
    }

    $stmt = $conn->prepare("INSERT INTO users (username, password) VALUES (?, ?)");
    if($stmt->execute([$user, $pass])) {
        echo json_encode(["status" => "success", "message" => "Akun berhasil dibuat. Silakan login."]);
    }
} 
elseif ($action == 'login' && $method == 'POST') {
    $user = $data->username;
    $pass = $data->password;
    
    $stmt = $conn->prepare("SELECT * FROM users WHERE username = ?");
    $stmt->execute([$user]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if($row && password_verify($pass, $row['password'])) {
        echo json_encode(["status" => "success", "user_id" => $row['id'], "username" => $row['username']]);
    } else {
        echo json_encode(["status" => "error", "message" => "Username atau password salah!"]);
    }
}
elseif ($action == 'get_transaksi' && $method == 'GET') {
    $user_id = isset($_GET['user_id']) ? $_GET['user_id'] : 0;
    $stmt = $conn->prepare("SELECT * FROM transaksi WHERE user_id = ? ORDER BY tanggal DESC, id DESC");
    $stmt->execute([$user_id]);
    echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
}
elseif ($action == 'add_transaksi' && $method == 'POST') {
    $query = "INSERT INTO transaksi (user_id, tanggal, tipe, nama_barang, jumlah, harga) VALUES (?, ?, ?, ?, ?, ?)";
    $stmt = $conn->prepare($query);
    if($stmt->execute([$data->user_id, $data->tanggal, $data->tipe, $data->nama_barang, $data->jumlah, $data->harga])) {
        echo json_encode(["status" => "success"]);
    } else { echo json_encode(["status" => "error"]); }
}
elseif ($action == 'update_transaksi' && $method == 'POST') {
    $query = "UPDATE transaksi SET tanggal=?, tipe=?, nama_barang=?, jumlah=?, harga=? WHERE id=? AND user_id=?";
    $stmt = $conn->prepare($query);
    if($stmt->execute([$data->tanggal, $data->tipe, $data->nama_barang, $data->jumlah, $data->harga, $data->id, $data->user_id])) {
        echo json_encode(["status" => "success"]);
    } else { echo json_encode(["status" => "error"]); }
}
elseif ($action == 'delete_transaksi' && $method == 'POST') {
    $query = "DELETE FROM transaksi WHERE id=? AND user_id=?";
    $stmt = $conn->prepare($query);
    if($stmt->execute([$data->id, $data->user_id])) {
        echo json_encode(["status" => "success"]);
    } else { echo json_encode(["status" => "error"]); }
}
elseif ($action == 'get_backup' && $method == 'GET') {
    $user_id = isset($_GET['user_id']) ? $_GET['user_id'] : 0;
    $stmtUser = $conn->prepare("SELECT id, username FROM users WHERE id = ?");
    $stmtUser->execute([$user_id]);
    $userInfo = $stmtUser->fetch(PDO::FETCH_ASSOC);

    $stmtTrans = $conn->prepare("SELECT * FROM transaksi WHERE user_id = ?");
    $stmtTrans->execute([$user_id]);
    $transInfo = $stmtTrans->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        "aplikasi" => "Venturo Web POS",
        "tanggal_backup" => date('Y-m-d H:i:s'),
        "akun_pengguna" => $userInfo,
        "riwayat_data" => $transInfo
    ]);
}
?>