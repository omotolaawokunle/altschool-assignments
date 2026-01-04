SELECT o.id AS order_id,
       u.name AS ordered_by,
       i.name AS item_name,
       oi.quantity,
       c.name AS category
FROM orders o
JOIN users u ON u.id = o.user_id
JOIN order_items oi ON oi.order_id = o.id
JOIN items i ON i.id = oi.item_id
JOIN categories c ON c.id = i.category_id;
