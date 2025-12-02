import http from "http";
import { ItemController } from "./src/controllers/ItemController.js";
import { errorHandler } from "./src/helpers/errorHandler.js";
import { parseRequestBody } from "./src/helpers/requestParser.js";

const getIdFromUrl = (url) => {
  const match = url.match(/^\/api\/items\/(\d+)$/);
  return match ? parseInt(match[1]) : null;
};

const server = http.createServer(async (request, response) => {
  try {
    if (request.url === "/api/items" && request.method === "GET") {
        const items = ItemController.getAllItems();
        response.statusCode = 200;
        response.setHeader("Content-Type", "application/json");
        response.end(
          JSON.stringify({
            status: 1,
            data: items,
            message: "Items retrieved successfully",
          })
        );
    } else if (request.url === "/api/items" && request.method === "POST") {
        let data = await parseRequestBody(request);
        const item = ItemController.addItem(data);
        response.statusCode = 201;
        response.setHeader("Content-Type", "application/json");
        response.end(
          JSON.stringify({
            status: 1,
            data: item,
            message: "Item added successfully",
          })
        );
    } else if (request.url.startsWith("/api/items/") && request.method === "GET") {
        const id = getIdFromUrl(request.url);
        if (id) {
            const item = ItemController.getItemById(id);
            response.statusCode = 200;
            response.setHeader("Content-Type", "application/json");
            response.end(
                JSON.stringify({
                    status: 1,
                    data: item,
                    message: "Item retrieved successfully",
                })
            );
        } else {
            response.statusCode = 404;
            response.setHeader("Content-Type", "application/json");
            response.end(
                JSON.stringify({
                    status: 0,
                    message: "Item not found",
                })
            );
        }
    } else if (request.url.startsWith("/api/items/") && request.method === "PUT") {
        let data = await parseRequestBody(request);
        const id = getIdFromUrl(request.url);
        if (id) {
            const item = ItemController.updateItem(id, data);
            response.statusCode = 200;
            response.setHeader("Content-Type", "application/json");
            response.end(
                JSON.stringify({
                    status: 1,
                    data: item,
                    message: "Item updated successfully",
                })
            );
        } else {
            response.statusCode = 404;
            response.setHeader("Content-Type", "application/json");
            response.end(
                JSON.stringify({
                    status: 0,
                    message: "Item not found",
                })
            );
        }
    } else if (request.url.startsWith("/api/items/") && request.method === "DELETE") {
        const id = getIdFromUrl(request.url);
        if (id) {
            ItemController.deleteItem(id);
            response.statusCode = 200;
            response.end(
                JSON.stringify({
                    status: 1,
                    message: "Item deleted successfully",
                })
            );
        } else {
            response.statusCode = 404;
            response.setHeader("Content-Type", "application/json");
            response.end(
                JSON.stringify({
                    status: 0,
                    message: "Item not found",
                })
            );
        }
    } else {
      response.statusCode = 404;
      response.end(
        JSON.stringify({
          status: 0,
          message: "Route not found",
        })
      );
    }
  } catch (error) {
    errorHandler(error, response);
  }
});
server.listen(3100, () => {
  console.log("Server running at http://localhost:3100/");
});
