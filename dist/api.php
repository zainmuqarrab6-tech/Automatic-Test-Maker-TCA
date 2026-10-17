<?php
/**
 * The Century Academy - Test Maker API
 * Database Connection & Question Bank Endpoint for Hostinger
 * Database: u437839910_Test_Maker
 */

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$db_host = 'localhost';
$db_name = 'u437839910_Test_Maker';
$db_user = 'u437839910_TCA_Test_Maker';
$db_pass = 'TCATest786@';

try {
    $pdo = new PDO("mysql:host=$db_host;dbname=$db_name;charset=utf8mb4", $db_user, $db_pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);

    // Auto-create questions table if not exists
    $createTableSql = "
    CREATE TABLE IF NOT EXISTS `questions` (
      `id` VARCHAR(64) NOT NULL PRIMARY KEY,
      `class` VARCHAR(20) NOT NULL,
      `subject` VARCHAR(100) NOT NULL,
      `chapter_no` INT NOT NULL,
      `chapter_name_en` VARCHAR(255) NOT NULL,
      `chapter_name_ur` VARCHAR(255) DEFAULT NULL,
      `exercise` VARCHAR(100) DEFAULT NULL,
      `type` ENUM('mcq', 'short_question', 'long_question') NOT NULL,
      `marks` INT DEFAULT 1,
      `difficulty` VARCHAR(30) DEFAULT 'medium',
      `question_en` TEXT NOT NULL,
      `question_ur` TEXT DEFAULT NULL,
      `options_json` JSON DEFAULT NULL,
      `correct_option_index` INT DEFAULT NULL,
      `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX `idx_class_subject_chapter` (`class`, `subject`, `chapter_no`),
      INDEX `idx_type` (`type`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";
    $pdo->exec($createTableSql);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Database connection failed: ' . $e->getMessage()
    ]);
    exit();
}

$action = $_GET['action'] ?? 'db_status';

// 1. Database Status & Count
if ($action === 'db_status') {
    try {
        $stmt = $pdo->query("SELECT COUNT(*) AS total FROM questions");
        $count = $stmt->fetchColumn();
        echo json_encode([
            'status' => 'online',
            'database' => $db_name,
            'total_questions' => (int)$count,
            'service' => 'The Century Academy Test Maker API'
        ]);
    } catch (Exception $e) {
        echo json_encode([
            'status' => 'error',
            'message' => $e->getMessage()
        ]);
    }
    exit();
}

// 2. Fetch Questions
if ($action === 'get_questions') {
    $class = $_GET['class'] ?? '';
    $subject = $_GET['subject'] ?? '';
    $chapter = $_GET['chapter'] ?? '';
    $type = $_GET['type'] ?? '';

    $query = "SELECT * FROM questions WHERE 1=1";
    $params = [];

    if (!empty($class)) {
        $query .= " AND class = :class";
        $params[':class'] = $class;
    }
    if (!empty($subject)) {
        $query .= " AND subject = :subject";
        $params[':subject'] = $subject;
    }
    if (!empty($chapter)) {
        $query .= " AND chapter_no = :chapter";
        $params[':chapter'] = $chapter;
    }
    if (!empty($type)) {
        $query .= " AND type = :type";
        $params[':type'] = $type;
    }

    $query .= " ORDER BY chapter_no ASC, type ASC";

    $stmt = $pdo->prepare($query);
    $stmt->execute($params);
    $rows = $stmt->fetchAll();

    foreach ($rows as &$r) {
        if (!empty($r['options_json'])) {
            $r['options'] = json_decode($r['options_json'], true);
        } else {
            $r['options'] = null;
        }
        $r['chapter_no'] = (int)$r['chapter_no'];
        $r['marks'] = (int)$r['marks'];
        if ($r['correct_option_index'] !== null) {
            $r['correct_option_index'] = (int)$r['correct_option_index'];
        }
    }

    echo json_encode([
        'status' => 'success',
        'count' => count($rows),
        'data' => $rows
    ], JSON_UNESCAPED_UNICODE);
    exit();
}

// 3. Add Single Question
if ($action === 'add_question' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Invalid JSON input']);
        exit();
    }

    $sql = "INSERT INTO questions (id, class, subject, chapter_no, chapter_name_en, chapter_name_ur, exercise, type, marks, question_en, question_ur, options_json, correct_option_index) 
            VALUES (:id, :class, :subject, :chapter_no, :chapter_name_en, :chapter_name_ur, :exercise, :type, :marks, :question_en, :question_ur, :options_json, :correct_option_index)
            ON DUPLICATE KEY UPDATE 
              chapter_name_en = VALUES(chapter_name_en),
              chapter_name_ur = VALUES(chapter_name_ur),
              exercise = VALUES(exercise),
              type = VALUES(type),
              marks = VALUES(marks),
              question_en = VALUES(question_en),
              question_ur = VALUES(question_ur),
              options_json = VALUES(options_json),
              correct_option_index = VALUES(correct_option_index)";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':id' => $input['id'] ?? uniqid('q-'),
        ':class' => $input['class'] ?? '9th',
        ':subject' => $input['subject'] ?? 'Mathematics',
        ':chapter_no' => $input['chapter_no'] ?? 1,
        ':chapter_name_en' => $input['chapter_name_en'] ?? '',
        ':chapter_name_ur' => $input['chapter_name_ur'] ?? '',
        ':exercise' => $input['exercise'] ?? '',
        ':type' => $input['type'] ?? 'short_question',
        ':marks' => $input['marks'] ?? 2,
        ':question_en' => $input['question_en'] ?? '',
        ':question_ur' => $input['question_ur'] ?? '',
        ':options_json' => !empty($input['options']) ? json_encode($input['options'], JSON_UNESCAPED_UNICODE) : null,
        ':correct_option_index' => $input['correct_option_index'] ?? null
    ]);

    echo json_encode(['status' => 'success', 'message' => 'Question saved successfully']);
    exit();
}

// 4. Bulk Insert / Sync Questions
if ($action === 'bulk_insert' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!is_array($input) || empty($input)) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Invalid array input for bulk insert']);
        exit();
    }

    $sql = "INSERT INTO questions (id, class, subject, chapter_no, chapter_name_en, chapter_name_ur, exercise, type, marks, question_en, question_ur, options_json, correct_option_index) 
            VALUES (:id, :class, :subject, :chapter_no, :chapter_name_en, :chapter_name_ur, :exercise, :type, :marks, :question_en, :question_ur, :options_json, :correct_option_index)
            ON DUPLICATE KEY UPDATE 
              chapter_name_en = VALUES(chapter_name_en),
              chapter_name_ur = VALUES(chapter_name_ur),
              exercise = VALUES(exercise),
              type = VALUES(type),
              marks = VALUES(marks),
              question_en = VALUES(question_en),
              question_ur = VALUES(question_ur),
              options_json = VALUES(options_json),
              correct_option_index = VALUES(correct_option_index)";

    $stmt = $pdo->prepare($sql);
    $pdo->beginTransaction();
    $inserted = 0;

    try {
        foreach ($input as $q) {
            $stmt->execute([
                ':id' => $q['id'] ?? uniqid('q-'),
                ':class' => $q['class'] ?? '9th',
                ':subject' => $q['subject'] ?? 'Mathematics',
                ':chapter_no' => (int)($q['chapter_no'] ?? 1),
                ':chapter_name_en' => $q['chapter_name_en'] ?? '',
                ':chapter_name_ur' => $q['chapter_name_ur'] ?? '',
                ':exercise' => $q['exercise'] ?? '',
                ':type' => $q['type'] ?? 'short_question',
                ':marks' => (int)($q['marks'] ?? 2),
                ':question_en' => $q['question_en'] ?? '',
                ':question_ur' => $q['question_ur'] ?? '',
                ':options_json' => !empty($q['options']) ? json_encode($q['options'], JSON_UNESCAPED_UNICODE) : null,
                ':correct_option_index' => isset($q['correct_option_index']) ? (int)$q['correct_option_index'] : null
            ]);
            $inserted++;
        }
        $pdo->commit();
        echo json_encode(['status' => 'success', 'synced' => $inserted, 'message' => "Successfully synced {$inserted} questions to MySQL"]);
    } catch (Exception $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Sync failed: ' . $e->getMessage()]);
    }
    exit();
}

echo json_encode(['status' => 'online', 'service' => 'The Century Academy Test Maker API']);
