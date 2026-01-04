SELECT o.id, u.name, o.status, o.created_at
FROM orders o
JOIN users u ON u.id = o.user_id;

SELECT i.name, i.sku, i.price, c.name AS category_name, oi.quantity, u.name AS user FROM order_items oi
JOIN items i ON i.id = oi.item_id
JOIN orders o ON o.id = oi.order_id
JOIN users u ON u.id = o.user_id
JOIN categories c ON c.id = i.category_id;
