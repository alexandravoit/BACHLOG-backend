import {getCoursePrereqs} from "./coursesService.js";
import Course from "../models/Course.js";

export function checkSeason(course) {
    const plannedSeason = course.semester % 2 === 0 ? "spring" : "autumn";

    if (
        (plannedSeason === "spring" && !course.isSpringCourse) ||
        (plannedSeason === "autumn" && !course.isAutumnCourse)
    ) {
        return {
            ok: false,
            message: `Kursus ${course.code} on planeeritud valesse semestrisse.`
        };
    }

    return { ok: true };
}

export async function checkPrereqs(course) {
    const prereqs = await getCoursePrereqs(course.code);
    if (prereqs.length === 0) return { ok: true };

    const failed = [];

    for (const prereqCode of prereqs) {
        const plannedCourses = await Course.findByCode(prereqCode);
        const isSatisfied = plannedCourses.some(c => c.semester < course.semester);
        if (!isSatisfied) {
            failed.push(prereqCode);
        }
    }

    if (failed.length === prereqs.length) {
        return {
            ok: false,
            message: `Kursuse ${course.code} eeldusained on planeerimata.`,
            prereqs: failed
        }
    }
    return { ok: true };
}

export async function checkCourse(course) {
    const results = [];

    const seasonCheck = checkSeason(course);
    if (!seasonCheck.ok) results.push(seasonCheck);

    const prereqCheck = await checkPrereqs(course);
    if (!prereqCheck.ok) results.push(prereqCheck);

    if (results.length > 0) {
        return {
            ok: false,
            issues: results
        };
    }

    return { ok: true };
}

export async function checkCourses(courses) {
    const results = [];
    for (const course of courses) {
        const result = await checkCourse(course);
        results.push({
            id: course.id,
            code: course.code,
            semester: course.semester,
            ...result
        });
    }
    return results;
}