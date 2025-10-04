import csv from 'csv-parser';
import { Readable } from 'stream';
import {getCourseSeason, searchCourses, getCourseCurricula} from './coursesService.js';
import Course from '../models/Course.js';
import {getModuleOptions} from "./modulesService.js";

const moduleOptions = await getModuleOptions();
const validModuleCodes = moduleOptions.map(m => m.code);

export const parseCsv = async (csvBuffer) => {
    return new Promise((resolve, reject) => {

        const results = {
            processed: 0,
            succeeded: 0,
            failed: 0,
            courses: []
        };

        const stream = Readable.from(csvBuffer.toString());
        const promises = [];

        stream
            .pipe(
                csv({
                    mapHeaders: ({ header }) => header.trim().toLowerCase(),
                })
            )
            .on('data', async (row) => {
                results.processed++;

                promises.push(
                    processCsvRow(row)
                        .then((course) => {
                            results.courses.push(course);
                            results.succeeded++;
                        })
                        .catch((error) => {
                            results.failed++;
                            results.courses.push({
                                code: row.kood || row.code,
                                semester: row.semester,
                                module: row.moodul || row.module,
                                error: error.message,
                                status: "failed"
                            });
                        })
                );

            })
            .on('end', async () => {
                try {
                    await Promise.all(promises);
                    resolve(results);
                } catch (err) {
                    reject(err);
                }

            })
            .on('error', (error) => {
                reject(error);
            });
    });
};

const processCsvRow = async (row) => {
    const code = (row.kood || row.code).trim().toUpperCase();
    const semester = parseInt(row.semester);
    const module = (row.moodul || row.module).trim().toUpperCase();

    if (!code)
        throw new Error("Missing required field: KOOD.");
    if (!semester)
        throw new Error(`Invalid or missing SEMESTER value for ${code}.`);
    if (!module)
        throw new Error(`Missing required field: MOODUL for ${code}.`);
    if (!validModuleCodes.includes(module))
        throw new Error(
            `Invalid module code '${module}' for ${code}. Must be one of: ${validModuleCodes.join(', ')}.`
        );

    const [courseDetails] = await searchCourses(code);
    const courseSeason = await getCourseSeason(courseDetails.code);
    const curriculumInfo = await getCourseCurricula(courseDetails.uuid);

    const courseData = {
        uuid: courseDetails.uuid,
        semester: semester,
        code: courseDetails.code,
        title: courseDetails.title.et,
        credits: courseDetails.credits,
        isAutumnCourse: courseSeason.isAutumnCourse,
        isSpringCourse: courseSeason.isSpringCourse,
        curriculum: curriculumInfo.default,
        module: module,
    };

    const createdCourse = await Course.create(courseData);

    return {
        ...createdCourse,
        status: 'success'
    };
};