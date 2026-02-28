import express from "express";
import courseRoutes from "./src/routes/courses.js";
import moduleRoutes from "./src/routes/modules.js";

const app = express();
const PORT = 5001;

app.use(express.json());

app.use("/api/courses", courseRoutes);
app.use("/api/modules", moduleRoutes);

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});