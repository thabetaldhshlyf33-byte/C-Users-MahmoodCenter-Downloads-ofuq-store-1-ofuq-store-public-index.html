CREATE DATABASE IF NOT EXISTS ofuq_store
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE ofuq_store;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  phone VARCHAR(30) NULL,
  role ENUM('customer','admin') NOT NULL DEFAULT 'customer',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS categories (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(120) NOT NULL UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS products (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  category_id BIGINT UNSIGNED NULL,
  name VARCHAR(180) NOT NULL,
  description TEXT NULL,
  image_url VARCHAR(1000) NULL,
  price_yer DECIMAL(12,2) NOT NULL DEFAULT 0,
  stock INT UNSIGNED NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
  INDEX idx_products_active (is_active),
  INDEX idx_products_name (name)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS orders (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NULL,
  customer_name VARCHAR(120) NOT NULL,
  customer_email VARCHAR(190) NULL,
  customer_phone VARCHAR(30) NOT NULL,
  shipping_address VARCHAR(500) NOT NULL,
  notes VARCHAR(1000) NULL,
  total_yer DECIMAL(12,2) NOT NULL,
  status ENUM('pending','confirmed','processing','shipped','completed','cancelled') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_orders_status (status),
  INDEX idx_orders_created (created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS order_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  order_id BIGINT UNSIGNED NOT NULL,
  product_id BIGINT UNSIGNED NULL,
  product_name VARCHAR(180) NOT NULL,
  unit_price_yer DECIMAL(12,2) NOT NULL,
  quantity INT UNSIGNED NOT NULL,
  line_total_yer DECIMAL(12,2) NOT NULL,
  CONSTRAINT fk_items_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_items_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
) ENGINE=InnoDB;

INSERT IGNORE INTO categories (name, slug) VALUES
('إلكترونيات','electronics'),
('المنزل والمطبخ','home-kitchen'),
('الأزياء','fashion'),
('الإكسسوارات','accessories');

INSERT INTO products (category_id, name, description, image_url, price_yer, stock)
SELECT c.id, 'سماعة لاسلكية', 'سماعة لاسلكية للاستخدام اليومي مع تصميم مريح.', 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80', 12500, 15
FROM categories c WHERE c.slug='electronics'
AND NOT EXISTS (SELECT 1 FROM products WHERE name='سماعة لاسلكية');

INSERT INTO products (category_id, name, description, image_url, price_yer, stock)
SELECT c.id, 'ساعة يد عصرية', 'ساعة أنيقة تناسب الاستخدام اليومي والمناسبات.', 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=80', 18500, 9
FROM categories c WHERE c.slug='accessories'
AND NOT EXISTS (SELECT 1 FROM products WHERE name='ساعة يد عصرية');

INSERT INTO products (category_id, name, description, image_url, price_yer, stock)
SELECT c.id, 'حقيبة يومية', 'حقيبة عملية بتصميم بسيط ومساحة مناسبة.', 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=900&q=80', 22000, 7
FROM categories c WHERE c.slug='fashion'
AND NOT EXISTS (SELECT 1 FROM products WHERE name='حقيبة يومية');

INSERT INTO products (category_id, name, description, image_url, price_yer, stock)
SELECT c.id, 'مصباح مكتبي', 'مصباح مكتبي أنيق لإضاءة مساحة العمل.', 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=900&q=80', 9500, 20
FROM categories c WHERE c.slug='home-kitchen'
AND NOT EXISTS (SELECT 1 FROM products WHERE name='مصباح مكتبي');
