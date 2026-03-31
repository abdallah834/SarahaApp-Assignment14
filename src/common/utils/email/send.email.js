import nodemailer from "nodemailer";
import {
  GOOGLE_APP_PASSWORD,
  GOOGLE_EMAIL,
} from "../../../../config/config.js";

// using OAuth for better security
// const transporter = nodemailer.createTransport({
//   service: "gmail",
//   auth: {
//     type: "OAuth2",
//     user: GOOGLE_EMAIL,
//     clientId: WEB_CLIENT_ID,
//     clientSecret: CLIENT_SECRET,
//     refreshToken: GOOGLE_REFRESH_TOKEN,
//   },
// });
// const generateOTP = async () => {
//   return crypto.randomInt(100000, 999999);
// };
export const sendEmail = async ({
  to = undefined,
  cc = undefined,
  bcc = undefined,
  title = undefined,
  subject = undefined,
  html = undefined,
  text = undefined,
  attachments = [],
} = {}) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: GOOGLE_EMAIL,
      pass: GOOGLE_APP_PASSWORD,
    },
  });

  const info = await transporter.sendMail({
    from: `"Saraha App Verification"`,
    to,
    cc,
    bcc,
    subject,
    text,
    html,
    attachments,
  });

  // console.log({ "message sent": info.messageId });
};
