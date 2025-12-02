const fields = {
        name: {
            required: true,
            type: "string"
        },
        price: {
            required: true,
            type: "number"
        },
        size: {
            required: true,
            type: "string",
            enum: ["small", "medium", "large"]
        }
    }
let validateItemRequest = (request) => {
    let errors = [];
    for (let field in fields) {
        if (fields[field].required && !request[field]) {
            errors.push(field.toLocaleUpperCase() + " field is required");
            continue;
        }

        if (request[field] && fields[field].type !== typeof request[field]) {
            errors.push(field.toLocaleUpperCase() + " field must be of type " + fields[field].type);
        }
        
        if (request[field] && fields[field].enum && !fields[field].enum.includes(request[field].toLowerCase())) {
            errors.push(field.toLocaleUpperCase() + " field must be one of " + fields[field].enum.join(", "));
        }
    }
    if (errors.length > 0) {
        throw new Error(errors.join(", "), { cause: "Validation error", status: 422 });
    }
}

export {
    validateItemRequest
};

