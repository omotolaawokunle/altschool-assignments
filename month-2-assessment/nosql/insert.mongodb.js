db.users.insertMany([
  { _id: 1, name: "Admin One", email: "admin@companyx.com", role: "admin" },
  { _id: 2, name: "John Doe", email: "john@companyx.com", role: "user" },
]);

db.categories.insertMany([
  { _id: 1, name: "Electronics" },
  { _id: 2, name: "Office Supplies" },
]);

db.items.insertMany([
  {
    _id: 1,
    name: "Laptop",
    price: 250000,
    size: "medium",
    category_id: 1,
    quantity: 10,
  },
  {
    _id: 2,
    name: "Printer Paper",
    price: 5000,
    size: "large",
    category_id: 2,
    quantity: 100,
  },
]);

db.orders.insertOne({
  _id: 1,
  user_id: 2,
  status: "pending",
  items: [
    { item_id: 1, quantity: 1 },
    { item_id: 2, quantity: 5 },
  ],
  created_at: new Date(),
});
