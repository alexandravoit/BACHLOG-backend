import {getCoursePrereqs} from "./coursesService.js";
import Course from "../models/Course.js";
import {getModuleOptions, getRequiredModules} from "./modulesService.js";
import {getCourseByUuid} from "./coursesService.js";

// COURSES

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

// MODULES
// Claude AI has been used in:
    // 1. Parsing the getRequiredModules result to showcase misplaced/doubled courses
    // 2. Optimising the final JSON response

function getModuleTitleByCode(code, moduleOptions) {
    const module = moduleOptions.find(m => m.code === code);
    return module?.title || code;
}

export async function checkModules(curriculumId, year) {
    const structure = await getRequiredModules(curriculumId, year);
    if (!structure) {
        return { ok: false, modules: {}, message: "No required modules found" };
    }

    const allCourses = await Course.findAll();
    const plannedUuids = allCourses.map((c) => c.uuid);
    const moduleOptions = await getModuleOptions();

    const courseToCorrectModule = buildCourseModuleMap(structure);
    const warnings = findCourseWarnings(allCourses, courseToCorrectModule, moduleOptions);

    // SUBMODULES: missing courses check
    const requiredResults = await Promise.all(
        structure.required_submodules.map(sub => checkSubmodule(sub, plannedUuids))
    );
    const thesisResult = await checkSubmodule(structure.thesis_submodule, plannedUuids);

    // RESPONSE
    const modules = buildModulesResponse(structure, requiredResults, thesisResult);

    // FINAL CHECK
    const allOk = [
        ...modules.required_submodules,
        modules.thesis_submodule
    ].every(m => m.ok);

    return {
        ok: allOk,
        modules,
        warnings
    };
}

function buildCourseModuleMap(structure) {
    const map = new Map();

    structure.required_submodules.forEach(sub => {
        sub.course_uuids.forEach(uuid =>
            map.set(uuid, { code: sub.code, title: sub.title })
        );
    });

    if (structure.elective_submodule) {
        structure.elective_submodule.course_uuids.forEach(uuid =>
            map.set(uuid, {
                code: structure.elective_submodule.code,
                title: structure.elective_submodule.title
            })
        );
    }

    if (structure.thesis_submodule) {
        structure.thesis_submodule.course_uuids.forEach(uuid =>
            map.set(uuid, {
                code: structure.thesis_submodule.code,
                title: structure.thesis_submodule.title
            })
        );
    }

    return map;
}

function findCourseWarnings(courses, courseToCorrectModule, moduleOptions) {
    const misplacedCourses = [];
    const seenUuids = new Set();
    const doubledCoursesMap = new Map();

    courses.forEach(course => {

        // CHECK: multiples
        if (seenUuids.has(course.uuid)) {
            doubledCoursesMap.set(course.uuid, {
                uuid: course.uuid,
                code: course.code,
                title: course.title
            });
        }
        seenUuids.add(course.uuid);

        // CHECK: misplacement
        const correctModule = courseToCorrectModule.get(course.uuid);

        // PM / LM course in wrong module
        if (correctModule && (correctModule.code === 'PM' || correctModule.code === 'LM')) {
            if (correctModule.code !== course.module) {
                const currentModuleTitle = getModuleTitleByCode(course.module, moduleOptions).toLowerCase();
                const correctModuleTitle = getModuleTitleByCode(correctModule.code, moduleOptions);

                const reason = course.module
                    ? `${correctModuleTitle}i kursus planeeritud ${currentModuleTitle}isse.`
                    : `${correctModuleTitle}i kursus on moodulisse määramata.`

                misplacedCourses.push({
                    uuid: course.uuid,
                    code: course.code,
                    title: course.title,
                    currentModule: course.module,
                    correctModule: correctModule.code,
                    correctSubmodule: correctModule.title,
                    reason: reason
                });
            }
        }

        // Non-PM/LM course in PM/LM
        if (!correctModule || (correctModule.code !== 'PM' && correctModule.code !== 'LM')) {
            if (course.module === 'PM' || course.module === 'LM') {
                const moduleTitle = getModuleTitleByCode(course.module, moduleOptions).toLowerCase();

                let reason = `Mitte-${moduleTitle}i kursus ${moduleTitle}is.`
                if (correctModule?.title) reason += ` Tegu on ${correctModule.title.toLowerCase()} ainega.`

                misplacedCourses.push({
                    uuid: course.uuid,
                    code: course.code,
                    title: course.title,
                    currentModule: course.module,
                    correctModule: correctModule?.code || null,
                    correctSubmodule: correctModule?.title || null,
                    reason: reason
                });
            }
        }
    });

    return { misplaced: misplacedCourses, doubled: Array.from(doubledCoursesMap.values()) };
}

async function checkSubmodule(submodule, plannedUuids) {
    const missingUuids = submodule.course_uuids.filter(
        (uuid) => !plannedUuids.includes(uuid)
    );

    const missingCourses = (await Promise.all(
        missingUuids.map(async (id) => {
            try {
                const course = await getCourseByUuid(id);

                return {
                    uuid: course.main_uuid,
                    code: course.code,
                    title: course.title?.et || course.title?.en,
                };
            } catch {
                return null;
            }
        })
    )).filter(Boolean);

    return {
        title: submodule.title,
        code: submodule.code,
        missing: missingCourses,
        ok: missingCourses.length === 0,
    };
}


function buildModulesResponse(structure, requiredResults, thesisResult) {
    return {
        required_submodules: structure.required_submodules.map((submodule, index) => ({
            ...submodule,
            missing: requiredResults[index].missing,
            ok: requiredResults[index].ok
        })),
        elective_submodule: structure.elective_submodule,
        thesis_submodule: {
            ...structure.thesis_submodule,
            missing: thesisResult.missing,
            ok: thesisResult.ok
        }
    };
}