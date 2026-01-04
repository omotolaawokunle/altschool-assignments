UPDATE orders
SET status = 'approved',
    approved_by = 1
WHERE id = 1;

UPDATE items 
SET quantity = quantity - 1
WHERE id = 1;