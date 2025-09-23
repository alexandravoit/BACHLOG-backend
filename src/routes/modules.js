import express from "express";
import { getModuleOptions } from "../services/modulesService.js";

const moduleRouter = express.Router();

moduleRouter.get("/", async (req, res) => {
    try {
        const modules = await getModuleOptions();
        res.json({ modules });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default moduleRouter;