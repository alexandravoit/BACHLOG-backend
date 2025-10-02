import {getCoursePrereqs} from "./coursesService.js";
import Course from "../models/Course.js";
import {getRequiredModules} from "./modulesService.js";
import {getCourseByUuid} from "./coursesService.js";

export function checkSeason(course) {
    if (!course.isAutumnCourse && !course.isSpringCourse) return null;

    const plannedSeason = course.semester % 2 === 0 ? "spring" : "autumn";

    if (
        (plannedSeason === "spring" && !course.isSpringCourse) ||
        (plannedSeason === "autumn" && !course.isAutumnCourse)
    ) {
        return {
            type: "Semester",
            message: `Kursus ${course.code} on planeeritud valesse semestrisse.`
        };
    }

    return null;
}

export async function checkPrereqs(course) {
    const prereqs = await getCoursePrereqs(course.code);
    if (prereqs.length === 0) return null;

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
            type: "Eeldusained",
            message: `Kursuse ${course.code} eeldusained on planeerimata.`,
            prereqs: failed
        }
    }
    return null;
}

export async function checkCourse(course) {
    const issues = [];

    const seasonIssue = checkSeason(course);
    if (seasonIssue) issues.push(seasonIssue);

    const prereqIssue = await checkPrereqs(course);
    if (prereqIssue) issues.push(prereqIssue);

    if (issues.length > 0) {
        return {
            ok: false,
            issues: issues
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

export async function checkModules(curriculumId, year) {
    const structure = await getRequiredModules(curriculumId, year);
    if (!structure) {
        return { ok: false, modules: {}, message: "No required modules found" };
    }

    const allCourses = await Course.findAll();
    const plannedUuids = allCourses.map((c) => c.uuid);

    async function checkSubmodule(submodule) {
        const missingUuids = submodule.course_uuids.filter(
            (uuid) => !plannedUuids.includes(uuid)
        );

        const missingCourses = await Promise.all(
            missingUuids.map(async (id) => {
                try {
                    const course = await getCourseByUuid(id);
                    return {
                        uuid: course.main_uuid,
                        code: course.code,
                        title: course.title?.et || course.title?.en,
                    };
                } catch {
                    return { uuid: id, code: id, title: "Unknown course" };
                }
            })
        );

        return {
            title: submodule.title,
            code: submodule.code,
            missing: missingCourses,
            ok: missingCourses.length === 0,
        };
    }

    const requiredResults = await Promise.all(
        structure.required_submodules.map(checkSubmodule)
    );

    const thesisResult = await checkSubmodule(structure.thesis_submodule);

    const allResults = [...requiredResults, thesisResult];

    return {
        ok: allResults.every((r) => r.ok),
        modules: allResults,
    };
}