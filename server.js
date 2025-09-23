import express from "express";
import courseRoutes from "./src/routes/courses.js";
import moduleRoutes from "./src/routes/modules.js";
import { initDatabase } from "./src/db/index.js"; 

const app = express();
const PORT = 5001;

const startServer = async () => {
  try {
    await initDatabase();

    app.use(express.json());

    app.use("/api/courses", courseRoutes);
    app.use("/api/modules", moduleRoutes);

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();