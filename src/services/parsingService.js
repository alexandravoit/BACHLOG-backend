import csv from 'csv-parser';
import { Readable } from 'stream';
import {getCourseSeason, searchCourses, getCourseCurricula} from './coursesService.js';
import Course from '../models/Course.js';

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
            .pipe(csv())
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
                                code: row.KOOD,
                                semester: row.SEMESTER,
                                module: row.MOODUL,
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
    const { KOOD, SEMESTER, MOODUL } = row;

    const [courseDetails] = await searchCourses(KOOD);
    const courseSeason = await getCourseSeason(courseDetails.code);
    const curriculumInfo = await getCourseCurricula(courseDetails.uuid);

    const courseData = {
        uuid: courseDetails.uuid,
        semester: parseInt(SEMESTER),
        code: courseDetails.code,
        title: courseDetails.title.et,
        credits: courseDetails.credits,
        isAutumnCourse: courseSeason.isAutumnCourse,
        isSpringCourse: courseSeason.isSpringCourse,
        curriculum: curriculumInfo.default,
        module: MOODUL,
    };

    const createdCourse = await Course.create(courseData);

    return {
        ...createdCourse,
        status: 'success'
    };
};