db.orders.find({ status: "pending" });
db.items.find({ quantity: { $lt: 20 } });
db.users.find({ role: "admin" });