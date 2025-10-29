const { verifyJwt } = require("../utils/authToken");

exports.authenticate = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }
  const token = header.split(" ")[1];
  const payload = verifyJwt(token);
  if (!payload) return res.status(401).json({ message: "Invalid or expired token" });
  req.user = payload; // contiene userId, email, role, etc.
  next();
};
