import { db } from '../db/index.js';

class Course {

    static findAll() {
        try {
            const stmt = db.prepare('SELECT * FROM COURSES ORDER BY SEMESTER, CODE');
            return stmt.all();
        } catch (error) {
            throw new Error('Error fetching courses: ' + error.message);
        }
    }

    static findById(id) {
        try {
            const stmt = db.prepare('SELECT * FROM COURSES WHERE ID = ?');
            return stmt.get(id);
        } catch (error) {
            throw new Error('Error fetching course: ' + error.message);
        }
    }

    static findBySemester(semester) {
        try {
            const stmt = db.prepare('SELECT * FROM COURSES WHERE SEMESTER = ? ORDER BY CODE');
            return stmt.all(semester);
        } catch (error) {
            throw new Error('Error fetching courses by semester: ' + error.message);
        }
    }

    static create(courseData) {
        const { semester, code, title, credits, isAutumnCourse = 0, isSpringCourse = 0, comment, grade, type } = courseData;

        try {
            const stmt = db.prepare(`
            INSERT INTO COURSES (SEMESTER, CODE, TITLE, CREDITS, IS_AUTUMN_COURSE, IS_SPRING_COURSE, COMMENT, GRADE, TYPE) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);
            
            const result = stmt.run(semester, code, title, credits, isAutumnCourse, isSpringCourse, comment, grade, type);
            
            return { 
                id: result.lastInsertRowid, 
                ...courseData 
            };
        } catch (error) {
            throw new Error('Error creating course: ' + error.message);
        }
    }

    static updateSemester(id, semester) {
        try {
        const stmt = db.prepare('UPDATE COURSES SET SEMESTER = ? WHERE ID = ?');
        const result = stmt.run(semester, id);
        
        if (result.changes === 0) {
            throw new Error('Course not found');
        }
        
        } catch (error) {
            throw new Error('Error updating course: ' + error.message);
        }
    }

    static delete(id) {
        try {
            const stmt = db.prepare('DELETE FROM COURSES WHERE ID = ?');
            const result = stmt.run(id);
            
            if (result.changes === 0) {
                throw new Error('Course not found');
            }
            
        } catch (error) {
            throw new Error('Error deleting course: ' + error.message);
        }
    }
}

export default Course;