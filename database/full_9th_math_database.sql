-- ========================================================
-- The Century Academy - Test Maker Database Dump
-- Database: u437839910_Test_Maker
-- Subject: 9th Class Mathematics (New Syllabus Complete)
-- ========================================================

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
  INDEX `idx_class_subj_chap` (`class`, `subject`, `chapter_no`),
  INDEX `idx_type` (`type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Inserting Complete 9th Class Mathematics Question Bank
INSERT INTO `questions` (`id`, `class`, `subject`, `chapter_no`, `chapter_name_en`, `chapter_name_ur`, `exercise`, `type`, `marks`, `question_en`, `question_ur`, `options_json`, `correct_option_index`) VALUES
-- Unit 1
('m9-u1-mcq-01', '9th', 'Mathematics', 1, 'Real and Complex Numbers', 'حقیقی اور پیچیدہ اعداد', 'Review Exercise 1', 'mcq', 1, 'The value of $i^{9}$ is equal to:', '$i^{9}$ کی قیمت کس کے برابر ہے؟', '[{"text":"1"},{"text":"-1"},{"text":"$i$"},{"text":"$-i$"}]', 2),
('m9-u1-mcq-02', '9th', 'Mathematics', 1, 'Real and Complex Numbers', 'حقیقی اور پیچیدہ اعداد', 'Review Exercise 1', 'mcq', 1, 'The real part of $2(3 - 4i)$ is:', '$2(3 - 4i)$ کا حقیقی حصہ ہے:', '[{"text":"3"},{"text":"6"},{"text":"-4"},{"text":"-8"}]', 1),
('m9-u1-mcq-03', '9th', 'Mathematics', 1, 'Real and Complex Numbers', 'حقیقی اور پیچیدہ اعداد', 'Review Exercise 1', 'mcq', 1, 'If $z = a + bi$, then conjugate $\\bar{z}$ is:', 'اگر $z = a + bi$ ہو تو اس کا کونجوگیٹ $\\bar{z}$ ہوگا:', '[{"text":"$a - bi$"},{"text":"$-a + bi$"},{"text":"$-a - bi$"},{"text":"$a + bi$"}]', 0),
('m9-u1-mcq-04', '9th', 'Mathematics', 1, 'Real and Complex Numbers', 'حقیقی اور پیچیدہ اعداد', 'Review Exercise 1', 'mcq', 1, 'In exponential form, radical $\\sqrt[3]{x}$ can be written as:', 'قوت نمائی شکل میں جذر $\\sqrt[3]{x}$ کو لکھا جا سکتا ہے:', '[{"text":"$x^3$"},{"text":"$x^{1/3}$"},{"text":"$x^{-3}$"},{"text":"$3x$"}]', 1),
('m9-u1-mcq-05', '9th', 'Mathematics', 1, 'Real and Complex Numbers', 'حقیقی اور پیچیدہ اعداد', 'Review Exercise 1', 'mcq', 1, 'A number of the form $\\frac{p}{q}$ where $p, q \\in \\mathbb{Z}$ and $q \\neq 0$ is called:', 'ایسا عدد جو $\\frac{p}{q}$ کی شکل میں ہو جبکہ $p, q \\in \\mathbb{Z}$ اور $q \\neq 0$ کہلاتا ہے:', '[{"text":"Rational Number"},{"text":"Irrational Number"},{"text":"Complex Number"},{"text":"Integer"}]', 0),
('m9-u1-mcq-06', '9th', 'Mathematics', 1, 'Real and Complex Numbers', 'حقیقی اور پیچیدہ اعداد', 'Review Exercise 1', 'mcq', 1, 'The imaginary part of $-i(3i + 2)$ is:', '$-i(3i + 2)$ کا غیر حقیقی (امیجنری) حصہ ہے:', '[{"text":"3"},{"text":"-2"},{"text":"2"},{"text":"-3"}]', 1),
('m9-u1-sq-01', '9th', 'Mathematics', 1, 'Real and Complex Numbers', 'حقیقی اور پیچیدہ اعداد', 'Definitions', 'short_question', 2, 'Define Rational and Irrational Numbers with one example of each.', 'ناطق اور غیر ناطق اعداد کی تعریف کریں اور ایک ایک مثال دیں۔', NULL, NULL),
('m9-u1-sq-02', '9th', 'Mathematics', 1, 'Real and Complex Numbers', 'حقیقی اور پیچیدہ اعداد', 'Ex 1.3', 'short_question', 2, 'Simplify the radical expression: $\\sqrt{45} - 3\\sqrt{20} + 4\\sqrt{5}$', 'جذری مساوات کو مختصر کریں: $\\sqrt{45} - 3\\sqrt{20} + 4\\sqrt{5}$', NULL, NULL),
('m9-u1-sq-03', '9th', 'Mathematics', 1, 'Real and Complex Numbers', 'حقیقی اور پیچیدہ اعداد', 'Ex 1.4', 'short_question', 2, 'Find the values of $x$ and $y$ if $x + iy + 1 = 4 - 3i$.', '$x$ اور $y$ کی قیمتیں معلوم کریں اگر $x + iy + 1 = 4 - 3i$ ہو۔', NULL, NULL),
('m9-u1-sq-04', '9th', 'Mathematics', 1, 'Real and Complex Numbers', 'حقیقی اور پیچیدہ اعداد', 'Ex 1.4', 'short_question', 2, 'Express in standard form $a + bi$: $(2 + 3i)(4 - 5i)$.', 'معیاری شکل $a + bi$ میں ظاہر کریں: $(2 + 3i)(4 - 5i)$۔', NULL, NULL),
('m9-u1-sq-05', '9th', 'Mathematics', 1, 'Real and Complex Numbers', 'حقیقی اور پیچیدہ اعداد', 'Ex 1.4', 'short_question', 2, 'Find the conjugate and modulus of complex number $z = -3 + 4i$.', 'پیچیدہ عدد $z = -3 + 4i$ کا کونجوگیٹ اور ماڈیولس معلوم کریں۔', NULL, NULL),
('m9-u1-lq-01', '9th', 'Mathematics', 1, 'Real and Complex Numbers', 'حقیقی اور پیچیدہ اعداد', 'Ex 1.4', 'long_question', 4, 'Simplify and write the answer in standard form $a + bi$: $$\\frac{2 + 6i}{4 - i} - \\frac{1 + i}{4 - i}$$', 'مختصر کریں اور جواب کو معیاری شکل $a + bi$ میں تحریر کریں: $$\\frac{2 + 6i}{4 - i} - \\frac{1 + i}{4 - i}$$', NULL, NULL),
('m9-u1-lq-02', '9th', 'Mathematics', 1, 'Real and Complex Numbers', 'حقیقی اور پیچیدہ اعداد', 'Ex 1.3', 'long_question', 4, 'Use laws of exponents to simplify: $$\\left( \\frac{x^{-2} y^{-1} z^{-4}}{x^{4} y^{-3} z^{0}} \\right)^{-3}$$', 'قوت نما کے قوانین کا استعمال کرتے ہوئے مختصر کریں: $$\\left( \\frac{x^{-2} y^{-1} z^{-4}}{x^{4} y^{-3} z^{0}} \\right)^{-3}$$', NULL, NULL),

-- Unit 2
('m9-u2-mcq-01', '9th', 'Mathematics', 2, 'Logarithms', 'لوگارتھم', 'Review Exercise 2', 'mcq', 1, 'If $\\log_a x = y$, then exponential form is:', 'اگر $\\log_a x = y$ ہو تو قوت نمائی شکل میں اسے لکھا جائے گا:', '[{"text":"$a^x = y$"},{"text":"$a^y = x$"},{"text":"$x^y = a$"},{"text":"$y^a = x$"}]', 1),
('m9-u2-mcq-02', '9th', 'Mathematics', 2, 'Logarithms', 'لوگارتھم', 'Review Exercise 2', 'mcq', 1, 'The base of Common Logarithm is:', 'عام لوگارتھم کی اساس (Base) ہوتی ہے:', '[{"text":"10"},{"text":"e"},{"text":"2"},{"text":"1"}]', 0),
('m9-u2-mcq-03', '9th', 'Mathematics', 2, 'Logarithms', 'لوگارتھم', 'Review Exercise 2', 'mcq', 1, 'The value of $\\log_3 81$ is equal to:', '$\\log_3 81$ کی قیمت برابر ہے:', '[{"text":"3"},{"text":"4"},{"text":"9"},{"text":"27"}]', 1),
('m9-u2-sq-01', '9th', 'Mathematics', 2, 'Logarithms', 'لوگارتھم', 'Ex 2.2', 'short_question', 2, 'Find the value of $x$ if $\\log_3 x = 5$.', 'نامعلوم $x$ کی قیمت معلوم کریں اگر $\\log_3 x = 5$ ہو۔', NULL, NULL),
('m9-u2-sq-02', '9th', 'Mathematics', 2, 'Logarithms', 'لوگارتھم', 'Ex 2.3', 'short_question', 2, 'Write in the form of a single logarithm: $2\\log x - 3\\log y$.', 'واحد لوگارتھم کی شکل میں تحریر کریں: $2\\log x - 3\\log y$۔', NULL, NULL),
('m9-u2-lq-01', '9th', 'Mathematics', 2, 'Logarithms', 'لوگارتھم', 'Ex 2.4', 'long_question', 4, 'Use logarithm tables to evaluate: $$\\frac{0.8176 \\times 13.64}{1.234}$$', 'لوگارتھم جدول کی مدد سے قیمت معلوم کریں: $$\\frac{0.8176 \\times 13.64}{1.234}$$', NULL, NULL),

-- Unit 3
('m9-u3-mcq-01', '9th', 'Mathematics', 3, 'Algebraic Expressions and Formulas', 'الجبری جملے اور الجبری کلیے', 'Review Exercise 3', 'mcq', 1, 'The degree of polynomial $4x^4 + 2x^2y$ is:', 'کثیر رقمی $4x^4 + 2x^2y$ کا درجہ ہے:', '[{"text":"2"},{"text":"3"},{"text":"4"},{"text":"1"}]', 2),
('m9-u3-sq-01', '9th', 'Mathematics', 3, 'Algebraic Expressions and Formulas', 'الجبری جملے اور الجبری کلیے', 'Ex 3.1', 'short_question', 2, 'Evaluate $\\frac{x^3y - 2z}{xz}$ for $x = 3, y = -1, z = -2$.', 'قیمت معلوم کریں $\\frac{x^3y - 2z}{xz}$ جبکہ $x = 3, y = -1, z = -2$ ہو۔', NULL, NULL),
('m9-u3-sq-02', '9th', 'Mathematics', 3, 'Algebraic Expressions and Formulas', 'الجبری جملے اور الجبری کلیے', 'Ex 3.2', 'short_question', 2, 'If $x + \\frac{1}{x} = 3$, find the value of $x^2 + \\frac{1}{x^2}$.', 'اگر $x + \\frac{1}{x} = 3$ ہو تو $x^2 + \\frac{1}{x^2}$ کی قیمت معلوم کریں۔', NULL, NULL),
('m9-u3-lq-01', '9th', 'Mathematics', 3, 'Algebraic Expressions and Formulas', 'الجبری جملے اور الجبری کلیے', 'Ex 3.2', 'long_question', 4, 'If $x + y = 7$ and $xy = 12$, find the value of $x^3 + y^3$.', 'اگر $x + y = 7$ اور $xy = 12$ ہو تو $x^3 + y^3$ کی قیمت معلوم کریں۔', NULL, NULL),

-- Unit 4
('m9-u4-mcq-01', '9th', 'Mathematics', 4, 'Factorization', 'تجزی', 'Review Exercise 4', 'mcq', 1, 'The factors of $x^2 - 5x + 6$ are:', '$x^2 - 5x + 6$ کے اجزائے ضربی ہیں:', '[{"text":"(x+1)(x-6)"},{"text":"(x-2)(x-3)"},{"text":"(x+2)(x+3)"},{"text":"(x-1)(x-6)"}]', 1),
('m9-u4-sq-01', '9th', 'Mathematics', 4, 'Factorization', 'تجزی', 'Ex 4.1', 'short_question', 2, 'Factorize: $25x^2 + 16y^2 + 40xy$.', 'تجزی کریں: $25x^2 + 16y^2 + 40xy$۔', NULL, NULL),
('m9-u4-lq-01', '9th', 'Mathematics', 4, 'Factorization', 'تجزی', 'Ex 4.4', 'long_question', 4, 'Use Factor Theorem to factorize cubic polynomial: $$P(x) = x^3 - 2x^2 - 5x + 6$$', 'مسئلہ تجزی کا استعمال کرتے ہوئے کثیر رقمی کی تجزی کریں: $$P(x) = x^3 - 2x^2 - 5x + 6$$', NULL, NULL),

-- Unit 5
('m9-u5-mcq-01', '9th', 'Mathematics', 5, 'Linear Equations and Inequalities', 'یک درجی مساواتیں اور غیر مساواتیں', 'Review Exercise 5', 'mcq', 1, 'A linear equation in one variable $x$ has degree:', 'ایک متغیر $x$ میں یک درجی مساوات کا درجہ ہوتا ہے:', '[{"text":"0"},{"text":"1"},{"text":"2"},{"text":"3"}]', 1),
('m9-u5-sq-01', '9th', 'Mathematics', 5, 'Linear Equations and Inequalities', 'یک درجی مساواتیں اور غیر مساواتیں', 'Ex 5.1', 'short_question', 2, 'Solve the linear equation: $\\frac{x - 3}{3} - \\frac{x - 2}{2} = -1$.', 'یک درجی مساوات حل کریں: $\\frac{x - 3}{3} - \\frac{x - 2}{2} = -1$۔', NULL, NULL),

-- Unit 6
('m9-u6-mcq-01', '9th', 'Mathematics', 6, 'Matrices and Determinants', 'قالب اور مقطع', 'Review Exercise 6', 'mcq', 1, 'The order of matrix $\\begin{bmatrix} 2 & 1 \\end{bmatrix}$ is:', 'قالب $\\begin{bmatrix} 2 & 1 \\end{bmatrix}$ کا مرتبہ ہے:', '[{"text":"$1 \\times 2$"},{"text":"$2 \\times 1$"},{"text":"$1 \\times 1$"},{"text":"$2 \\times 2$"}]', 0),
('m9-u6-mcq-02', '9th', 'Mathematics', 6, 'Matrices and Determinants', 'قالب اور مقطع', 'Review Exercise 6', 'mcq', 1, 'If determinant $|A| = 0$, then matrix $A$ is called:', 'اگر مقطع $|A| = 0$ ہو تو وہ قالب کہلاتا ہے:', '[{"text":"Singular Matrix"},{"text":"Non-Singular Matrix"},{"text":"Symmetric Matrix"},{"text":"Identity Matrix"}]', 0),
('m9-u6-sq-01', '9th', 'Mathematics', 6, 'Matrices and Determinants', 'قالب اور مقطع', 'Definitions', 'short_question', 2, 'Define Singular and Non-Singular matrix with one example each.', 'نادر اور غیر نادر قالب کی تعریف کریں اور ایک ایک مثال دیں۔', NULL, NULL),
('m9-u6-sq-02', '9th', 'Mathematics', 6, 'Matrices and Determinants', 'قالب اور مقطع', 'Ex 6.2', 'short_question', 2, 'If $A = \\begin{bmatrix} 2 & 3 \\\\ 1 & 0 \\end{bmatrix}$ and $B = \\begin{bmatrix} 5 & -2 \\\\ 4 & 1 \\end{bmatrix}$, find $2A - 3B$.', 'اگر $A = \\begin{bmatrix} 2 & 3 \\\\ 1 & 0 \\end{bmatrix}$ اور $B = \\begin{bmatrix} 5 & -2 \\\\ 4 & 1 \\end{bmatrix}$ ہو تو $2A - 3B$ معلوم کریں۔', NULL, NULL),
('m9-u6-lq-01', '9th', 'Mathematics', 6, 'Matrices and Determinants', 'قالب اور مقطع', 'Ex 6.4', 'long_question', 4, 'Solve using Cramer\'s Rule: $$2x - 2y = 4, \\quad 3x + 2y = 6$$', 'کریمر کے قانون کی مدد سے ہمزاد مساواتیں حل کریں: $$2x - 2y = 4, \\quad 3x + 2y = 6$$', NULL, NULL),
('m9-u6-lq-02', '9th', 'Mathematics', 6, 'Matrices and Determinants', 'قالب اور مقطع', 'Ex 6.4', 'long_question', 4, 'Solve using Matrix Inversion Method: $$4x + y = 9, \\quad -3x - y = -5$$', 'قالبی معکوس کے طریقہ سے ہمزاد خطی مساواتیں حل کریں: $$4x + y = 9, \\quad -3x - y = -5$$', NULL, NULL),

-- Unit 7
('m9-u7-mcq-01', '9th', 'Mathematics', 7, 'Linear Graphs and Their Applications', 'خطی گراف اور ان کا اطلاق', 'Review Exercise 7', 'mcq', 1, 'The point $(-3, -5)$ lies in which quadrant?', 'نقطہ $(-3, -5)$ کس ربع (Quadrant) میں واقع ہے؟', '[{"text":"Quadrant I"},{"text":"Quadrant II"},{"text":"Quadrant III"},{"text":"Quadrant IV"}]', 2),
('m9-u7-sq-01', '9th', 'Mathematics', 7, 'Linear Graphs and Their Applications', 'خطی گراف اور ان کا اطلاق', 'Ex 7.1', 'short_question', 2, 'Draw the graph of $2x + y = 6$.', '$2x + y = 6$ کا گراف کھینچیں۔', NULL, NULL),

-- Unit 8
('m9-u8-mcq-01', '9th', 'Mathematics', 8, 'Introduction to Coordinate Geometry', 'محدد جیومیٹری کا تعارف', 'Review Exercise 8', 'mcq', 1, 'The distance between points $(0, 0)$ and $(3, 4)$ is:', 'نقاط $(0, 0)$ اور $(3, 4)$ کے درمیانی فاصلہ ہے:', '[{"text":"5"},{"text":"7"},{"text":"25"},{"text":"1"}]', 0),
('m9-u8-sq-01', '9th', 'Mathematics', 8, 'Introduction to Coordinate Geometry', 'محدد جیومیٹری کا تعارف', 'Ex 8.1', 'short_question', 2, 'Find the distance between the points $A(9, 2)$ and $B(7, 2)$.', 'نقاط $A(9, 2)$ اور $B(7, 2)$ کے درمیان فاصلہ معلوم کریں۔', NULL, NULL),
('m9-u8-sq-02', '9th', 'Mathematics', 8, 'Introduction to Coordinate Geometry', 'محدد جیومیٹری کا تعارف', 'Ex 8.2', 'short_question', 2, 'Find the midpoint of the line segment joining $P(6, 6)$ and $Q(4, -2)$.', 'نقاط $P(6, 6)$ اور $Q(4, -2)$ کو ملانے والے قطعہ خط کا درمیانی نقطہ معلوم کریں۔', NULL, NULL),

-- Unit 9
('m9-u9-mcq-01', '9th', 'Mathematics', 9, 'Congruent Triangles', 'متماثل مثلثیں', 'Review Exercise 9', 'mcq', 1, 'If $\\triangle ABC \\cong \\triangle DEF$, then corresponding angle to $\\angle A$ is:', 'اگر $\\triangle ABC \\cong \\triangle DEF$ ہو تو $\\angle A$ کا متناظرہ زاویہ ہوگا:', '[{"text":"$\\angle D$"},{"text":"$\\angle E$"},{"text":"$\\angle F$"},{"text":"$\\angle B$"}]', 0),
('m9-u9-mcq-02', '9th', 'Mathematics', 9, 'Congruent Triangles', 'متماثل مثلثیں', 'Review Exercise 9', 'mcq', 1, 'If two sides and included angle of one triangle are congruent to corresponding sides and included angle of another, it is called:', 'اگر ایک مثلث کے دو اضلاع اور درمیانی زاویہ دوسری مثلث کے متناظرہ دو اضلاع اور درمیانی زاویہ کے برابر ہوں تو یہ کہلاتا ہے:', '[{"text":"S.A.S. Postulate"},{"text":"S.S.S. Postulate"},{"text":"A.S.A. Postulate"},{"text":"H.S. Postulate"}]', 0),
('m9-u9-sq-01', '9th', 'Mathematics', 9, 'Congruent Triangles', 'متماثل مثلثیں', 'Definitions', 'short_question', 2, 'Define Congruency of Triangles and state S.A.S. postulate.', 'مثلثوں کی مماثلت (Congruency) کی تعریف کریں اور ض-ز-ض کا موضوعہ بیان کریں۔', NULL, NULL),
('m9-u9-sq-02', '9th', 'Mathematics', 9, 'Congruent Triangles', 'متماثل مثلثیں', 'Ex 9.1', 'short_question', 2, 'If $\\triangle ABC \\cong \\triangle LMN$, find unknown $x$ when $m\\angle A = (3x + 15)^\\circ$ and $m\\angle L = 75^\\circ$.', 'اگر $\\triangle ABC \\cong \\triangle LMN$ ہو تو نامعلوم $x$ معلوم کریں جبکہ $m\\angle A = (3x + 15)^\\circ$ اور $m\\angle L = 75^\\circ$ ہو۔', NULL, NULL),

-- Unit 10
('m9-u10-mcq-01', '9th', 'Mathematics', 10, 'Parallelograms and Triangles', 'متوازی الاضلاع اور مثلثیں', 'Review Exercise 10', 'mcq', 1, 'In a parallelogram, opposite angles are always:', 'کسی متوازی الاضلاع میں مخالف زاویے ہمیشہ ہوتے ہیں:', '[{"text":"Congruent (Equal)"},{"text":"Supplementary"},{"text":"Complementary"},{"text":"Right Angles"}]', 0),
('m9-u10-mcq-02', '9th', 'Mathematics', 10, 'Parallelograms and Triangles', 'متوازی الاضلاع اور مثلثیں', 'Review Exercise 10', 'mcq', 1, 'The diagonals of a parallelogram:', 'متوازی الاضلاع کے وتر (Diagonals):', '[{"text":"Bisect each other"},{"text":"Are perpendicular"},{"text":"Are equal"},{"text":"Do not intersect"}]', 0),
('m9-u10-sq-01', '9th', 'Mathematics', 10, 'Parallelograms and Triangles', 'متوازی الاضلاع اور مثلثیں', 'Definitions', 'short_question', 2, 'Define Parallelogram and write any two of its properties.', 'متوازی الاضلاع کی تعریف کریں اور اس کی کوئی سی دو خصوصیات تحریر کریں۔', NULL, NULL),
('m9-u10-sq-02', '9th', 'Mathematics', 10, 'Parallelograms and Triangles', 'متوازی الاضلاع اور مثلثیں', 'Ex 10.1', 'short_question', 2, 'In parallelogram $ABCD$, if $m\\angle A = 65^\\circ$, find $m\\angle B, m\\angle C$ and $m\\angle D$.', 'متوازی الاضلاع $ABCD$ میں اگر $m\\angle A = 65^\\circ$ ہو تو $m\\angle B, m\\angle C$ اور $m\\angle D$ کی پیمائش معلوم کریں۔', NULL, NULL),
('m9-u10-lq-01', '9th', 'Mathematics', 10, 'Parallelograms and Triangles', 'متوازی الاضلاع اور مثلثیں', 'Theorem 10.1', 'long_question', 8, 'Theorem: In a parallelogram, prove that opposite sides are congruent and opposite angles are congruent.', 'مسئلہ: ثابت کریں کہ کسی متوازی الاضلاع کے مخالف اضلاع اور مخالف زاویے باہم متماثل ہوتے ہیں۔', NULL, NULL),

-- Unit 11 (Theorems - مسئلے)
('m9-u11-thm-01', '9th', 'Mathematics', 11, 'Line Bisectors and Angle Bisectors', 'خط کے عمودی ناصف اور زاویہ کے ناصف', 'Theorem 11.1', 'long_question', 8, 'Theorem (Compulsory): Prove that any point on the right bisector of a line segment is equidistant from its end points.', 'مسئلہ (لازمی): ثابت کریں کہ کسی قطعہ خط کے عمودی ناصف پر واقع ہر نقطہ اس کے سروں سے مساوی الفاصلہ ہوتا ہے۔', NULL, NULL),
('m9-u11-thm-02', '9th', 'Mathematics', 11, 'Line Bisectors and Angle Bisectors', 'خط کے عمودی ناصف اور زاویہ کے ناصف', 'Theorem 11.2', 'long_question', 8, 'Theorem (Compulsory): Prove that any point on the bisector of an angle is equidistant from its arms.', 'مسئلہ (لازمی): ثابت کریں کہ کسی زاویہ کے ناصف پر واقع کوئی نقطہ اس کے بازوؤں سے مساوی الفاصلہ ہوتا ہے۔', NULL, NULL),

-- Unit 12
('m9-u12-mcq-01', '9th', 'Mathematics', 12, 'Ratio, Proportion & Pythagoras Theorem', 'نسبت، تناسب اور مسئلہ فیثاغورث', 'Review Exercise 12', 'mcq', 1, 'In a right-angled triangle, if base $= 3\\text{ cm}$ and altitude $= 4\\text{ cm}$, the hypotenuse is:', 'قائمۃ الزاویہ مثلث میں اگر قاعدہ $= 3\\text{ cm}$ اور عمود $= 4\\text{ cm}$ ہو تو وتر ہوگا:', '[{"text":"$5\\text{ cm}$"},{"text":"$7\\text{ cm}$"},{"text":"$25\\text{ cm}$"},{"text":"$12\\text{ cm}$"}]', 0),
('m9-u12-mcq-02', '9th', 'Mathematics', 12, 'Ratio, Proportion & Pythagoras Theorem', 'نسبت، تناسب اور مسئلہ فیثاغورث', 'Review Exercise 12', 'mcq', 1, 'An equality of two ratios $a:b = c:d$ is called:', 'دو نسبتوں کے درمیان برابری کے تعلق $a:b = c:d$ کو کہتے ہیں:', '[{"text":"Proportion (تناسب)"},{"text":"Ratio (نسبت)"},{"text":"Equation (مساوات)"},{"text":"Identity (تماثل)"}]', 0),
('m9-u12-sq-01', '9th', 'Mathematics', 12, 'Ratio, Proportion & Pythagoras Theorem', 'نسبت، تناسب اور مسئلہ فیثاغورث', 'Definitions', 'short_question', 2, 'State Pythagoras Theorem and write its mathematical formula with a sketch.', 'مسئلہ فیثاغورث بیان کریں اور اس کا حسابی کلیہ مع خاکہ تحریر کریں۔', NULL, NULL),
('m9-u12-sq-02', '9th', 'Mathematics', 12, 'Ratio, Proportion & Pythagoras Theorem', 'نسبت، تناسب اور مسئلہ فیثاغورث', 'Ex 12.1', 'short_question', 2, 'In right triangle $ABC$ with $m\\angle C = 90^\\circ$, if $a = 6\\text{ cm}$ and $b = 8\\text{ cm}$, calculate hypotenuse $c$.', 'قائمۃ الزاویہ مثلث $ABC$ میں جبکہ $m\\angle C = 90^\\circ$ ہو، اگر $a = 6\\text{ cm}$ اور $b = 8\\text{ cm}$ ہو تو وتر $c$ کی لمبائی معلوم کریں۔', NULL, NULL),
('m9-u12-thm-01', '9th', 'Mathematics', 12, 'Ratio, Proportion & Pythagoras Theorem', 'نسبت، تناسب اور مسئلہ فیثاغورث', 'Theorem 12.1', 'long_question', 8, 'Theorem (Compulsory): In a right angled triangle, the square of the length of hypotenuse is equal to the sum of the squares of the lengths of the other two sides.', 'مسئلہ (لازمی): کسی قائمۃ الزاویہ مثلث میں وتر کی لمبائی کا مربع باقی دونوں اضلاع کی لمبائیوں کے مربعات کے مجموعے کے برابر ہوتا ہے۔', NULL, NULL),

-- Unit 13
('m9-u13-sq-01', '9th', 'Mathematics', 13, 'Practical Geometry - Triangles', 'عملی جیومیٹری — مثلثیں', 'Definitions', 'short_question', 2, 'Define Incentre and Circumcentre of a triangle.', 'مثلث کے محاصرہ مرکز اور اندرونی مرکز کی تعریف کریں۔', NULL, NULL),
('m9-u13-lq-01', '9th', 'Mathematics', 13, 'Practical Geometry - Triangles', 'عملی جیومیٹری — مثلثیں', 'Ex 13.1', 'long_question', 4, 'Construct triangle $ABC$ with $m\\overline{AB} = 4.8\\text{ cm}$, $m\\overline{BC} = 3.5\\text{ cm}$ and $m\\angle B = 60^\\circ$. Draw its angle bisectors.', 'مثلث $ABC$ بنائیں اور زاویوں کے ناصف کھینچیں۔', NULL, NULL)

ON DUPLICATE KEY UPDATE `chapter_name_en` = VALUES(`chapter_name_en`), `question_en` = VALUES(`question_en`);

