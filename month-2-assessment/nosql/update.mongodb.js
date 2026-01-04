db.orders.updateOne(
  { _id: 1 },
  { $set: { status: "approved", approved_by: 1 } }
);
db.items.updateOne(
  { _id: 1 },
  { $inc: { quantity: -1 } }
);