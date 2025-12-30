import nodemailer from "nodemailer";

export const sendOTPEmail = async (to, otp) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  await transporter.sendMail({
    from: `"Freelancer App" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Verify your email",
    html: `<h2>Your OTP: ${otp}</h2>`
  });
};
