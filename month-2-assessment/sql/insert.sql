INSERT INTO users (name, email, role)
VALUES ('Admin One', 'admin@companyx.com', 'admin'),
       ('John Doe', 'john@companyx.com', 'user');

INSERT INTO categories (name, description)
VALUES ('Electronics', 'Electronic items'),
       ('Office Supplies', 'Office related items');

INSERT INTO items (name, price, size, category_id, sku, quantity)
VALUES ('Laptop', 250000, 'medium', 1, 'LAP-001', 10),
       ('Printer Paper', 5000, 'large', 2, 'PAP-002', 100);

INSERT INTO orders (user_id)
VALUES (2);

INSERT INTO order_items (order_id, item_id, quantity)
VALUES (1, 1, 1),
       (1, 2, 5);
