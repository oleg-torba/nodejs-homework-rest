const HttpErrors = require("../helpers/HttpErrors");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const { SECRET_KEY } = process.env;

const authentificate = async (req, res, next) => {
  const { authorization = "" } = req.headers;
  const [bearer, token] = authorization.split(" ");
  if (bearer !== "Bearer") {
    throw HttpErrors(401);
  }
  try {
    const { id } = jwt.verify(token, SECRET_KEY);
    const user = await User.findById(id);
    if (!user || !user.token || user.token !== token) {
      next(HttpErrors(401));
    }
    req.user = user;
    next();
  } catch {
    next(HttpErrors(401));
  }
};

module.exports = authentificate;
