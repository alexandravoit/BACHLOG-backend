import express from "express";
import cors from "cors";
import router from "./routes/courses.js";
import moduleRouter from "./routes/modules.js";

const app = express();

initDatabase();

app.use(cors());

app.use(express.json());

app.use("/api/courses", router);
app.use("/api/modules", moduleRouter);

export default app;