import express from "express";
import {getRequiredModules, getModuleOptions} from "../services/modulesService.js";
import {checkModules} from "../services/validationService.js";

const moduleRouter = express.Router();

moduleRouter.get("/", async (req, res) => {
    try {
        const modules = await getModuleOptions();
        res.json({ modules });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

moduleRouter.get("/required/:curriculumId/:year", async (req, res) => {
    try {
        const { curriculumId, year } = req.params;
        const result = await getRequiredModules(curriculumId, year);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

moduleRouter.get("/check/:curriculumId/:year", async (req, res) => {
    try {
        const { curriculumId, year } = req.params;
        const result = await checkModules(curriculumId, year);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default moduleRouter;