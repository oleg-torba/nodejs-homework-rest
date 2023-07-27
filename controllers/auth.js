const User = require("../models/user");
const gravatar = require("gravatar");
const path = require("path");
const fs = require("fs/promises");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const ctrlWrapper = require("../helpers/ctrlWrapper");
const { SECRET_KEY, BASE_URL } = process.env;
const { nanoid } = require("nanoid");
const transport = require("../helpers/sendEmail");
const HttpErrors = require("../helpers/HttpErrors");

const avatarsDir = path.join(__dirname, "../", "public", "avatars");

const register = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (user) {
    throw HttpErrors(409, "Email in use");
  }

  const hashPassword = await bcrypt.hash(password, 10);
  const avatarURL = gravatar.url(email);
  const verificationToken = nanoid();
  const result = await User.create({
    ...req.body,
    avatarURL,
    password: hashPassword,
    verificationToken,
  });
  const mail = {
    to: email,
    from: "oleg020393@meta.ua",
    subject: "Confirm the registration on contacts application",
    html: `<a href="${BASE_URL}/api/users/verify/${verificationToken}" target="_blank">Push to confirm</a>`,
  };

  await transport
    .sendMail(mail)
    .then(() => console.log("Email send success"))
    .catch((error) => console.log(error.message));
  console.log(result);
  res.status(201).json({
    user: {
      email: result.email,
      subscription: result.subscription,
      avatarURL,
      verificationToken: result.verificationToken,
    },
  });
};
const verifyEmail = async (req, res) => {
  const { verificationToken } = req.params;
  const user = await User.findOne({ verificationToken });
  if (!user) {
    throw HttpErrors(401, "unauthorized");
  }
  await User.findByIdAndUpdate(user._id, {
    verify: true,
    verificationToken: "",
  });
  res.json({
    message: "Verify success",
  });
};

const resendEmail = async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  const mail = {
    to: email,
    from: "oleg020393@meta.ua",
    subject: "Confirm the registration on contacts application",
    html: `<a href="${BASE_URL}/api/users/verify/${user.verificationToken}" target="_blank">Push to confirm</a>`,
  };
  if (!user) {
    throw HttpErrors(401, "Email not found");
  }
  if (user.verify) {
    throw HttpErrors(401, "Email already verify");
  }
  await transport
    .sendEmail(mail)
    .then(() => console.log("Email send success"))
    .catch((error) => console.log(error.message));

  res.status(200).json({ message: "Verification email sent" });
};

const login = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) {
    throw HttpErrors(401, "Email or password is wrong");
  }
  const passwordCompare = bcrypt.compare(password, user.password);
  if (!passwordCompare) {
    throw HttpErrors(401, "Email or password is wrong");
  }

  const payload = {
    id: user._id,
  };

  const token = jwt.sign(payload, SECRET_KEY, { expiresIn: "23h" });
  await User.findByIdAndUpdate(user._id, { token });
  res.json({ token });
};

const getCurrent = async (req, res) => {
  const { email } = req.user;
  res.json({
    email,
  });
};

const logout = async (req, res) => {
  const { _id } = req.user;
  await User.findByIdAndUpdate(_id, { token: "" });
  res.json({
    message: "Logout success",
  });
};

const updateAvatar = async (req, res) => {
  const { _id } = req.user;
  const { path: tempUpload, originalname } = req.file;
  const filename = `${_id}_${originalname}`;
  const resultUpload = path.join(avatarsDir, filename);
  await fs.rename(tempUpload, resultUpload);
  const avatarURL = path.join("avatars", filename);
  await User.findByIdAndUpdate(_id, { avatarURL });
  res.json({ avatarURL });
};

module.exports = {
  register: ctrlWrapper(register),
  verifyEmail: ctrlWrapper(verifyEmail),
  resendEmail: ctrlWrapper(resendEmail),
  login: ctrlWrapper(login),
  getCurrent: ctrlWrapper(getCurrent),
  logout: ctrlWrapper(logout),
  updateAvatar: ctrlWrapper(updateAvatar),
};
