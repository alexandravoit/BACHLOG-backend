import express from "express";
import { searchCourses, getCourseSeason } from "../services/coursesService.js";
import Course from "../models/Course.js";

const router = express.Router();

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

router.get("/season", async (req, res) => {
  const { q } = req.query;

  try {
    const seasonData = await getCourseSeason(q);
    res.json(seasonData);
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
    const course = await Course.findById(id);
    
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
    const course = await Course.create(req.body);
    res.status(201).json(course);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { semester } = req.body;
    const result = Course.updateSemester(id, semester);
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

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = Course.delete(id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
