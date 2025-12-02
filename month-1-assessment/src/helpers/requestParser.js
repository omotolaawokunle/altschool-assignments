import querystring from "querystring";

const parseRequestBody = (request) => {
  return new Promise((resolve, reject) => {
    let body = "";

    request.on("data", (chunk) => {
      body += chunk.toString();
    });

    request.on("end", () => {
      try {
        const contentType = request.headers["content-type"] || "";
        
        if (contentType.includes("application/json")) {
          resolve(JSON.parse(body));
        } else if (contentType.includes("application/x-www-form-urlencoded")) {
          resolve(querystring.parse(body));
        } else {
          resolve({});
        }
      } catch (error) {
        reject(new Error("Invalid request body: " + error.message));
      }
    });

    request.on("error", reject);
  });
};

export {
    parseRequestBody
};
