import { db } from '../db/index.js';
import { normalizeCourse, normalizeCourses } from '../utils/DatabaseNormalizer.js';

class Course {
  static findAll() {
    try {
      const stmt = db.prepare("SELECT * FROM COURSES ORDER BY SEMESTER, CODE");
      const dbCourses = stmt.all();
      return normalizeCourses(dbCourses);
    } catch (error) {
      throw new Error("Error fetching courses: " + error.message);
    }
  }

  static findById(id) {
    try {
      const stmt = db.prepare("SELECT * FROM COURSES WHERE ID = ?");
      const dbCourse = stmt.get(id);
      return normalizeCourse(dbCourse);
    } catch (error) {
      throw new Error("Error fetching course: " + error.message);
    }
  }

  static findBySemester(semester) {
    try {
      const stmt = db.prepare(
        "SELECT * FROM COURSES WHERE SEMESTER = ? ORDER BY CODE"
      );
      const dbCourses = stmt.all();
      return normalizeCourses(dbCourses);
    } catch (error) {
      throw new Error("Error fetching courses by semester: " + error.message);
    }
  }

  static create(courseData) {
    const {
        semester,
        code,
        title,
        credits,
        isAutumnCourse = 0,
        isSpringCourse = 0,
        curriculum,
        module,
        comment,
        grade
        } = courseData;

    try {
      const stmt = db.prepare(`
            INSERT INTO COURSES (SEMESTER, CODE, TITLE, CREDITS, IS_AUTUMN_COURSE, IS_SPRING_COURSE, CURRICULUM, MODULE, COMMENT, GRADE) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

      const result = stmt.run(
        semester,
        code,
        title,
        credits,
        isAutumnCourse,
        isSpringCourse,
        curriculum,
        module,
        comment,
        grade
      );

      const stmtGet = db.prepare("SELECT * FROM COURSES WHERE ID = ?");
      const dbCourse = stmtGet.get(result.lastInsertRowid);
      return normalizeCourse(dbCourse);
    } catch (error) {
      throw new Error("Error creating course: " + error.message);
    }
  }

  static updateSemester(id, semester) {
    try {
      const stmt = db.prepare("UPDATE COURSES SET SEMESTER = ? WHERE ID = ?");
      const result = stmt.run(semester, id);

      if (result.changes === 0) {
        throw new Error("Course not found");
      }
    } catch (error) {
      throw new Error("Error updating course: " + error.message);
    }
  }

  static updateSeason(id, isAutumnCourse, isSpringCourse) {
    try {
      const stmt = db.prepare("UPDATE COURSES SET IS_AUTUMN_COURSE = ?, IS_SPRING_COURSE = ? WHERE ID = ?");
      const result = stmt.run(isAutumnCourse, isSpringCourse, id);

      if (result.changes === 0) {
        throw new Error("Course not found");
      }
    } catch (error) {
      throw new Error("Error updating course season: " + error.message);
    }
  }

  static delete(id) {
    try {
      const stmt = db.prepare("DELETE FROM COURSES WHERE ID = ?");
      const result = stmt.run(id);

      if (result.changes === 0) {
        throw new Error("Course not found");
      }
    } catch (error) {
      throw new Error("Error deleting course: " + error.message);
    }
  }
}

export default Course;