import express from "express";
import cors from "cors";
import router from "./routes/courses.js";

const app = express();

initDatabase();

app.use(cors());

app.use(express.json());

app.use("/api/courses", router);

export default app;