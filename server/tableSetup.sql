CREATE TABLE categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    categoryName TEXT UNIQUE NOT NULL CHECK (categoryName IN ('Shoes', 'Clothes', 'Bags', 'Watches', 'Sunglasses'))
);


CREATE TABLE products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    productName TEXT NOT NULL,
    price NUMBER NOT NULL,
    image TEXT,
    secondaryImage1 TEXT,
    secondaryImage2 TEXT,
    secondaryImage3 TEXT,
    brand TEXT,
    productDescription TEXT,
    isNew TEXT,
    categoryId INTEGER,  
    publishingDate TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (categoryId) REFERENCES categories(id) ON DELETE SET NULL
);

INSERT INTO categories (categoryName) VALUES
('Shoes'),
('Clothes'),
('Bags'),
('Watches'),
('Sunglasses');


DROP TABLE IF EXISTS products;


-- Exempel produkter
INSERT INTO products (productName, price, image, secondaryImage1, secondaryImage2, secondaryImage3, brand, productDescription, isNew, categoryId, publishingDate) VALUES
('Nike Air Jordan 1', 199.99, 'https://example.com/jordan1-main.jpg', 'https://example.com/jordan1-side.jpg', 'https://example.com/jordan1-back.jpg', 'https://example.com/jordan1-box.jpg', 'Nike', 'Iconic basketball sneakers with premium leather', 'yes', 1, '2024-01-15'),
('Adidas Ultraboost 22', 179.99, 'https://example.com/ultraboost-main.jpg', 'https://example.com/ultraboost-side.jpg', 'https://example.com/ultraboost-top.jpg', 'https://example.com/ultraboost-box.jpg', 'Adidas', 'Ultra-responsive running shoes with Boost cushioning', 'yes', 1, '2024-02-01'),
('Balenciaga Triple S', 995.00, 'https://example.com/tripleS-main.jpg', 'https://example.com/tripleS-side.jpg', 'https://example.com/tripleS-back.jpg', 'https://example.com/tripleS-box.jpg', 'Balenciaga', 'High-fashion chunky sneakers', 'no', 1, '2024-03-10'),
('Gucci Ace Sneakers', 690.00, 'https://example.com/ace-main.jpg', 'https://example.com/ace-side.jpg', 'https://example.com/ace-back.jpg', 'https://example.com/ace-box.jpg', 'Gucci', 'Luxury leather sneakers with embroidered details', 'yes', 1, '2023-12-20'),
('Yeezy 350 Boost V2', 220.00, 'https://example.com/yeezy-main.jpg', 'https://example.com/yeezy-side.jpg', 'https://example.com/yeezy-top.jpg', 'https://example.com/yeezy-box.jpg', 'Adidas', 'Kanye West-designed running shoes', 'yes', 1, '2024-01-05'),
('Prada Cloudbust Thunder', 895.00, 'https://example.com/prada-main.jpg', 'https://example.com/prada-side.jpg', 'https://example.com/prada-back.jpg', 'https://example.com/prada-box.jpg', 'Prada', 'Futuristic chunky sneaker with bold sole', 'no', 1, '2023-11-18'),
('New Balance 990v5', 185.00, 'https://example.com/990v5-main.jpg', 'https://example.com/990v5-side.jpg', 'https://example.com/990v5-back.jpg', 'https://example.com/990v5-box.jpg', 'New Balance', 'Timeless performance running shoe', 'yes', 1, '2024-02-15'),
('Christian Louboutin Louis Junior', 795.00, 'https://example.com/louboutin-main.jpg', 'https://example.com/louboutin-side.jpg', 'https://example.com/louboutin-back.jpg', 'https://example.com/louboutin-box.jpg', 'Louboutin', 'Luxury low-top sneakers with red soles', 'yes', 1, '2024-03-05'),

('Louis Vuitton Leather Jacket', 2999.99, 'https://example.com/lv-jacket-main.jpg', 'https://example.com/lv-jacket-side.jpg', 'https://example.com/lv-jacket-back.jpg', 'https://example.com/lv-jacket-label.jpg', 'Louis Vuitton', 'Luxury leather jacket with monogram detailing', 'yes', 2, '2023-12-05'),
('Balmain Double-Breasted Blazer', 2295.00, 'https://example.com/balmain-main.jpg', 'https://example.com/balmain-side.jpg', 'https://example.com/balmain-back.jpg', 'https://example.com/balmain-detail.jpg', 'Balmain', 'Signature structured blazer with gold buttons', 'yes', 2, '2024-02-10'),

('Gucci Leather Bag', 2499.99, 'https://example.com/gucci-bag-main.jpg', 'https://example.com/gucci-bag-side.jpg', 'https://example.com/gucci-bag-interior.jpg', 'https://example.com/gucci-bag-strap.jpg', 'Gucci', 'Timeless luxury handbag with Italian leather', 'no', 3, '2024-02-10'),
('Louis Vuitton Keepall 55', 2499.99, 'https://example.com/lv-keepall-main.jpg', 'https://example.com/lv-keepall-side.jpg', 'https://example.com/lv-keepall-back.jpg', 'https://example.com/lv-keepall-inside.jpg', 'Louis Vuitton', 'Classic travel duffle bag in Monogram canvas', 'yes', 3, '2024-03-01'),

('Rolex Daytona', 23999.99, 'https://example.com/rolex-daytona-main.jpg', 'https://example.com/rolex-daytona-side.jpg', 'https://example.com/rolex-daytona-wrist.jpg', 'https://example.com/rolex-daytona-box.jpg', 'Rolex', 'Swiss luxury chronograph watch with gold casing', 'yes', 4, '2023-11-20'),
('Omega Speedmaster', 6500.00, 'https://example.com/speedmaster-main.jpg', 'https://example.com/speedmaster-side.jpg', 'https://example.com/speedmaster-back.jpg', 'https://example.com/speedmaster-box.jpg', 'Omega', 'Iconic Moonwatch worn by NASA astronauts', 'yes', 4, '2024-01-10'),

('Ray-Ban Aviator Classic', 179.99, 'https://example.com/rayban-aviator-main.jpg', 'https://example.com/rayban-aviator-side.jpg', 'https://example.com/rayban-aviator-close.jpg', 'https://example.com/rayban-aviator-box.jpg', 'Ray-Ban', 'Iconic aviator sunglasses with polarized lenses', 'yes', 5, '2024-03-01'),
('Prada PR 17WS', 429.99, 'https://example.com/prada-sunglasses-main.jpg', 'https://example.com/prada-sunglasses-side.jpg', 'https://example.com/prada-sunglasses-back.jpg', 'https://example.com/prada-sunglasses-case.jpg', 'Prada', 'Bold acetate sunglasses with oversized frames', 'yes', 5, '2024-01-22');
