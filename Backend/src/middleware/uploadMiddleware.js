import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "freelancer-projects",
    allowed_formats: ["jpg", "png", "pdf", "zip"],
  },
});

const upload = multer({ storage });
export default upload;
