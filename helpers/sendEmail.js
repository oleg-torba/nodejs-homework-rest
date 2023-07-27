const nodemailer = require("nodemailer");
require("dotenv").config();

const { GMAIL_PASSWORD } = process.env;

const nodemailerConfig = {
  host: "smtp.meta.ua",
  port: 465, // 25, 465, 2255
  secure: true,
  auth: {
    user: "oleg020393@meta.ua",
    pass: GMAIL_PASSWORD,
  },
};

const transporter = nodemailer.createTransport(nodemailerConfig);

module.exports = transporter;
