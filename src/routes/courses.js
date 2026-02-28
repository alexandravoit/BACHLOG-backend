import express from "express";
import multer from 'multer';
import {
    searchCourses,
    getCourseSeason,
    getCourseCurricula,
    getCoursePrereqs,
    getAllCurricula
} from "../services/coursesService.js";
import { parseCsv } from "../services/parsingService.js";
import { checkCourses } from "../services/validationService.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// OIS API

router.get("/search", async (req, res) => {
    const { q } = req.query;

    try {
        const courses = await searchCourses(q);
        res.json(courses);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get("/prereqs", async (req, res) => {
    const { q } = req.query;

    try {
        const prereqs = await getCoursePrereqs(q);
        res.json(prereqs);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get("/season", async (req, res) => {
    const { q } = req.query;

    try {
        const seasonData = await getCourseSeason(q);
        res.json(seasonData);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get("/curricula", async (req, res) => {
    const { q } = req.query;

    try {
        const curriculumData = await getCourseCurricula(q);
        res.json(curriculumData);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get("/curricula/all", async (req, res) => {
    try {
        const curricula = await getAllCurricula();
        res.json(curricula);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// CSV PROCESSOR

router.post("/parser", upload.single('csv'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "CSV file is required" });
        }

        const results = await parseCsv(req.file.buffer);
        res.json(results);

    } catch (error) {
        console.error('CSV parsing error:', error);
        res.status(500).json({ error: error.message });
    }
});

// VALIDATION

router.post("/check/all", async (req, res) => {
    try {
        const { courses } = req.body;

        if (!courses || !Array.isArray(courses)) {
            return res.status(400).json({ error: "Courses array is required" });
        }

        const results = await checkCourses(courses);
        res.json(results);
    } catch (error) {
        console.error('Validation error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;