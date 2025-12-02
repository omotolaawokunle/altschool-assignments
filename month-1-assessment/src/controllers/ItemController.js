import fileSystem from "fs";
import { validateItemRequest } from "../requests/ItemRequest.js";

let ItemController = {
    items: JSON.parse(fileSystem.readFileSync("./public/items.json", "utf-8")),
    getAllItems() {
        return this.items;
    },
    getItemById(id) {
        const item = this.items.find((item) => item.id === id);
        if (!item) {
            throw new Error("Item not found", {
              cause: "NotFoundError",
              status: 404,
            });
        }
        return item;
    },

    addItem(request) {
       validateItemRequest(request);
        let id = this.items.length > 0 ? this.items[this.items.length - 1].id + 1 : 1;
        const item = {
            id: id,
            name: request.name,
            price: request.price,
            size: request.size,
        };
        this.items.push(item);
        this.saveItems();
        return item;
    },

    updateItem(id, request) {
        validateItemRequest(request);
        const item = this.getItemById(id);
        const index = this.items.findIndex((t) => t.id === id);
        this.items[index] = {
            ...item,
            name: request.name,
            price: request.price,
            size: request.size,
        };
        this.saveItems();
        return this.items[index];
    },

    deleteItem(id) {
        this.getItemById(id);
        this.items = this.items.filter((item) => item.id !== id);
        this.saveItems();
        return;
    },
    saveItems() {
        fileSystem.writeFileSync("./public/items.json", JSON.stringify(this.items));
    }
}
export {
    ItemController
};
