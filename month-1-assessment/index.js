import fileSystem from "fs";
import http from "http";

const server = http.createServer((request, response) => {
    if(["/", "/index", "/index.html"].includes(request.url)) {
        fileSystem.readFile("public/index.html", (err, data) => {
            if (err) {
                response.statusCode = 500;
                response.setHeader("Content-Type", "text/plain");
                response.end("Error: " + err.message);
            } else {
                response.statusCode = 200;
                response.setHeader("Content-Type", "text/html");
                response.end(data);
            }
        });
    } else {
        response.statusCode = 404;
        response.setHeader("Content-Type", "text/plain");
        response.end("404 Not Found");
    }
});

server.listen(3000, () => {
    console.log("Server running at http://localhost:3000/");
});
