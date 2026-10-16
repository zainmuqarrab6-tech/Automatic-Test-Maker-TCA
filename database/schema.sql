-- The Century Academy - Test Maker Database Schema
-- Database: u437839910_Test_Maker

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
  `explanation` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_class_subject_chapter` (`class`, `subject`, `chapter_no`),
  INDEX `idx_type` (`type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sample Seed Data for 9th Mathematics New Syllabus
INSERT INTO `questions` (`id`, `class`, `subject`, `chapter_no`, `chapter_name_en`, `chapter_name_ur`, `exercise`, `type`, `marks`, `question_en`, `question_ur`, `options_json`, `correct_option_index`) VALUES
('m9-u1-mcq-01', '9th', 'Mathematics', 1, 'Real and Complex Numbers', 'حقیقی اور پیچیدہ اعداد', 'Review Exercise 1', 'mcq', 1, 'The value of $i^{9}$ is equal to:', '$i^{9}$ کی قیمت کس کے برابر ہے؟', '[{"text":"1"},{"text":"-1"},{"text":"$i$"},{"text":"$-i$"}]', 2),
('m9-u1-mcq-02', '9th', 'Mathematics', 1, 'Real and Complex Numbers', 'حقیقی اور پیچیدہ اعداد', 'Review Exercise 1', 'mcq', 1, 'The real part of $2(3 - 4i)$ is:', '$2(3 - 4i)$ کا حقیقی حصہ ہے:', '[{"text":"3"},{"text":"6"},{"text":"-4"},{"text":"-8"}]', 1),
('m9-u1-mcq-03', '9th', 'Mathematics', 1, 'Real and Complex Numbers', 'حقیقی اور پیچیدہ اعداد', 'Review Exercise 1', 'mcq', 1, 'If $z = a + bi$, then conjugate $\\bar{z}$ is:', 'اگر $z = a + bi$ ہو تو اس کا کونجوگیٹ $\\bar{z}$ ہوگا:', '[{"text":"$a - bi$"},{"text":"$-a + bi$"},{"text":"$-a - bi$"},{"text":"$a + bi$"}]', 0),
('m9-u1-sq-01', '9th', 'Mathematics', 1, 'Real and Complex Numbers', 'حقیقی اور پیچیدہ اعداد', 'Definitions', 'short_question', 2, 'Define Rational and Irrational Numbers with one example of each.', 'ناطق اور غیر ناطق اعداد کی تعریف کریں اور ایک ایک مثال دیں۔', NULL, NULL),
('m9-u1-sq-02', '9th', 'Mathematics', 1, 'Real and Complex Numbers', 'حقیقی اور پیچیدہ اعداد', 'Ex 1.3', 'short_question', 2, 'Simplify the radical expression: $\\sqrt{45} - 3\\sqrt{20} + 4\\sqrt{5}$', 'جذری مساوات کو مختصر کریں: $\\sqrt{45} - 3\\sqrt{20} + 4\\sqrt{5}$', NULL, NULL),
('m9-u1-sq-03', '9th', 'Mathematics', 1, 'Real and Complex Numbers', 'حقیقی اور پیچیدہ اعداد', 'Ex 1.4', 'short_question', 2, 'Find the values of $x$ and $y$ if $x + iy + 1 = 4 - 3i$.', '$x$ اور $y$ کی قیمتیں معلوم کریں اگر $x + iy + 1 = 4 - 3i$ ہو۔', NULL, NULL),
('m9-u1-lq-01', '9th', 'Mathematics', 1, 'Real and Complex Numbers', 'حقیقی اور پیچیدہ اعداد', 'Ex 1.4', 'long_question', 4, 'Simplify and write the answer in standard form $a + bi$: $$\\frac{2 + 6i}{4 - i} - \\frac{1 + i}{4 - i}$$', 'مختصر کریں اور جواب کو معیاری شکل $a + bi$ میں تحریر کریں: $$\\frac{2 + 6i}{4 - i} - \\frac{1 + i}{4 - i}$$', NULL, NULL),
('m9-u2-mcq-01', '9th', 'Mathematics', 2, 'Logarithms', 'لوگارتھم', 'Review Exercise 2', 'mcq', 1, 'If $\\log_a x = y$, then in exponential form it is written as:', 'اگر $\\log_a x = y$ ہو تو قوت نمائی شکل میں اسے لکھا جائے گا:', '[{"text":"$a^x = y$"},{"text":"$a^y = x$"},{"text":"$x^y = a$"},{"text":"$y^a = x$"}]', 1),
('m9-u2-sq-01', '9th', 'Mathematics', 2, 'Logarithms', 'لوگارتھم', 'Ex 2.2', 'short_question', 2, 'Find the unknown value of $x$ if $\\log_3 x = 5$.', 'نامعلوم $x$ کی قیمت معلوم کریں اگر $\\log_3 x = 5$ ہو۔', NULL, NULL),
('m9-u6-sq-01', '9th', 'Mathematics', 6, 'Matrices and Determinants', 'قالب اور مقطع', 'Definitions', 'short_question', 2, 'Define Singular and Non-Singular matrix with one example each.', 'نادر اور غیر نادر قالب کی تعریف کریں اور ایک ایک مثال دیں۔', NULL, NULL),
('m9-u6-lq-01', '9th', 'Mathematics', 6, 'Matrices and Determinants', 'قالب اور مقطع', 'Ex 6.4', 'long_question', 4, 'Solve the system of linear equations using Cramer\'s Rule: $$2x - 2y = 4, \\quad 3x + 2y = 6$$', 'کریمر کے قانون کی مدد سے ہمزاد مساواتیں حل کریں: $$2x - 2y = 4, \\quad 3x + 2y = 6$$', NULL, NULL),
('m9-u12-thm-01', '9th', 'Mathematics', 12, 'Line Bisectors and Angle Bisectors', 'خط کے عمودی ناصف اور زاویہ کے ناصف', 'Theorem 12.1', 'long_question', 8, 'Theorem (Compulsory): Prove that any point on the right bisector of a line segment is equidistant from its end points.', 'مسئلہ (لازمی): ثابت کریں کہ کسی قطعہ خط کے عمودی ناصف پر ہر نقطہ اس کے سروں سے مساوی الفاصلہ ہوتا ہے۔', NULL, NULL)
ON DUPLICATE KEY UPDATE `subject`=VALUES(`subject`);
