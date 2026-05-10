export function errorHandler(err, req, res, next) {
  console.error("Unhandled error:", err.stack || err);
  res.status(err.status || 500).json({
    error: err.message || "Internal server error",
  });
}