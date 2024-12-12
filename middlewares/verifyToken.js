import jwt from "jsonwebtoken";
const verifyToken = async (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).send({
      message: "Unauthorized",
    });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({
        message: "Unauthorized",
      });
    }
    req.user = decoded;
    next();
  });
};

export default verifyToken;
