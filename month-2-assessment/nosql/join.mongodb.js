db.orders.aggregate([
  {
    $lookup: {
      from: "users",
      localField: "user_id",
      foreignField: "_id",
      as: "user",
    },
  },
  {
    $lookup: {
      from: "items",
      localField: "items.item_id",
      foreignField: "_id",
      as: "items_info",
    },
  },
]);
