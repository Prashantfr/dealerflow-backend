const errorMiddleware = (err, req, res, next) => {

    if (process.env.NODE_ENV !== "production") {
        console.error(err.stack || err.message);
    } else {
        console.error("Request failed:", err.message);
    }

    if (err.name === "VersionError") {
        return res.status(409).json({
            success: false,
            message: "This application was modified by another request. Please refresh and try again."
        });
    }

    if (
        err instanceof SyntaxError &&
        err.status === 400 &&
        "body" in err
    ) {
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

    const requestedStatus = err.statusCode || err.status;

    const statusCode =
        Number.isInteger(requestedStatus) &&
        requestedStatus >= 400 &&
        requestedStatus <= 599
            ? requestedStatus
            : 500;

    return res.status(statusCode).json({
        success: false,
        message:
            statusCode >= 500
                ? "Internal Server Error"
                : err.message || "Request failed"
    });
};

module.exports = errorMiddleware;
