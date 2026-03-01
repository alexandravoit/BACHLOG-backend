import express from "express";
import cors from "cors";
import courseRoutes from "./src/routes/courses.js";
import moduleRoutes from "./src/routes/modules.js";

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors({
    origin: [
        'https://bachlog.vercel.app',
        'http://localhost:3000'
    ],
    credentials: true
}));

app.use(express.json());

app.use("/api/courses", courseRoutes);
app.use("/api/modules", moduleRoutes);

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});