const errorMiddleware = (err, req, res, next) => {
    console.error(err.stack || err.message);

    if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
        return res.status(400).json({
            success: false,
            message: "Invalid JSON format"
        });
    }

    if (err.status === 413) {
        return res.status(413).json({
            success: false,
            message: "Request body too large"
        });
    }

    const statusCode =
        err.statusCode || err.status || 500;

    return res.status(statusCode).json({
        success: false,
        message: statusCode >= 500
            ? "Internal Server Error"
            : err.message || "Request failed"
    });
};

module.exports = errorMiddleware;