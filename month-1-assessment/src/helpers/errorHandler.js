const errorHandler = (error, response) => {
  console.error("Error:", error);
  let statusCode = 500;
  let message = "Internal server error";

  if (error.cause === "Validation error") {
    statusCode = 422;
    message = error.message;
  } else if (error.cause === "NotFoundError") {
    statusCode = 404;
    message = error.message;
  }

  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json");
  response.end(
    JSON.stringify({
      status: 0,
      message: message,
    })
  );
}

export {
    errorHandler
};

