import express from "express";
import multer from 'multer';
import {
    searchCourses,
    getCourseSeason,
    getCourseCurricula,
    getCoursePrereqs,
    getAllCurricula
} from "../services/coursesService.js";
import {exportCsv, parseCsv} from "../services/parsingService.js";
import Course from "../models/Course.js";
import {checkCourse, checkCourses} from "../services/validationService.js";

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

// DATABASE

router.get("/", async (req, res) => {
  try {
    const courses = Course.findAll();
    res.json(courses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const course = Course.findById(id);
    
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }
    
    res.json(course);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/code/:code", async (req, res) => {
    try {
        const { code } = req.params;
        const course = Course.findByCode(code);

        if (!course) {
            return res.status(404).json({ error: "Course not found" });
        }

        res.json(course);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get("/semester/:semester", async (req, res) => {
  try {
    const { semester } = req.params;
    const semesterNumber = parseInt(semester);
    
    const courses = Course.findBySemester(semesterNumber);
    res.json(courses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const course = Course.create(req.body);
    res.status(201).json(course);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put("/:id/semester", async (req, res) => {
  try {
    const { id } = req.params;
    const { semester } = req.body;
    const result = await Course.updateSemester(id, semester);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put("/:id/season", async (req, res) => {
  try {
    const { id } = req.params;
    const { isAutumnCourse, isSpringCourse } = req.body;
    const result = await Course.updateSeason(id, isAutumnCourse, isSpringCourse);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put("/:id/curriculum", async (req, res) => {
    try {
        const { id } = req.params;
        const { curriculum } = req.body;
        const result = await Course.updateCurriculum(id, curriculum);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.put("/:id/module", async (req, res) => {
    try {
        const { id } = req.params;
        const { module } = req.body;
        const result = await Course.updateModule(id, module);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = Course.delete(id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/', (req, res) => {
    try {
        const { deletedRows } = Course.deleteAll();
        res.json({ message: `Courses deleted: ${deletedRows}` });
    } catch (err) {
        res.status(500).json({ message: err.message });
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

router.get("/parser/export", async (req, res) => {
    try {
        const csvContent = await exportCsv();
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="BACHLOG.csv"');
        res.send(csvContent);
    } catch (error) {
        console.error('CSV export error:', error);
        res.status(500).json({ error: error.message });
    }
});

// RULE CHECKS

router.get("/:id/check", async (req, res) => {
    try {
        const { id } = req.params;
        const course = await Course.findById(id);
        if (!course) return res.status(404).json({ error: "Course not found" });

        const result = await checkCourse(course);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get("/check/all", async (req, res) => {
    try {
        const courses = await Course.findAll();
        const results = await checkCourses(courses);
        res.json(results);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
