import csv from 'csv-parser';
import { Readable } from 'stream';
import {getCourseSeason, searchCourses, getCourseCurricula} from './coursesService.js';
import Course from '../models/Course.js';
import {getModuleOptions} from "./modulesService.js";

const moduleOptions = await getModuleOptions();
const validModuleCodes = moduleOptions.filter(m => m.code !== null).map(m => m.code);

// NOTE: Claude has been used to upgrade this parsing service to include better error handling and file checks

export const parseCsv = async (csvBuffer) => {
    return new Promise((resolve, reject) => {
        const results = {
            processed: 0,
            succeeded: 0,
            failed: 0,
            courses: [],
            errors: []
        };

        const csvString = csvBuffer.toString();
        const separator = csvString.includes(';') ? ';' : ',';

        const stream = Readable.from(csvString);
        const promises = [];
        let rowNumber = 0;

        stream
            .pipe(
                csv({
                    separator: separator,
                    mapHeaders: ({ header }) => header.trim().toLowerCase(),
                })
            )
            .on('headers', (headerList) => {
                const requiredColumns = ['kood', 'semester', 'moodul'];
                const missingColumns = requiredColumns.filter(col => !headerList.includes(col));

                if (missingColumns.length > 0) {
                    reject(new Error(
                        `CSV failis puuduvad veerud: ${missingColumns.join(', ').toUpperCase()}.\n` +
                        `Nõutud veerud on: KOOD, SEMESTER, MOODUL.`
                    ));
                }

                // CHECK FOR CORRECT ORDER
                const actualOrder = headerList.filter(h => requiredColumns.includes(h));
                const orderMismatch = requiredColumns.some((col, index) => actualOrder[index] !== col);
                if (orderMismatch) {
                    reject(new Error(
                        `CSV veergude järjekord on vale. ` +
                        `Oodatav järjekord: KOOD, SEMESTER, MOODUL.\n` +
                        `Tegelik järjekord: ${actualOrder.map(c => c.toUpperCase()).join(', ')}.`
                    ));
                }
            })
            .on('data', async (row) => {
                rowNumber++;
                results.processed++;

                promises.push(
                    processCsvRow(row, rowNumber, validModuleCodes)
                        .then((course) => {
                            results.courses.push(course);
                            results.succeeded++;
                        })
                        .catch((error) => {
                            results.failed++;
                            const failedCourse = {
                                code: row.kood || 'N/A',
                                semester: row.semester || 'N/A',
                                module: row.moodul || 'N/A',
                                error: error.message,
                                status: "failed"
                            };
                            results.courses.push(failedCourse);
                            results.errors.push(failedCourse);
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
                reject(new Error(`CSV faili lugemine ebaõnnestus: ${error.message}`));
            });
    });
};

const processCsvRow = async (row, rowNumber, validModuleCodes) => {
    // REQUIRED FIELDS
    const code = row.kood;
    const semester = row.semester;
    const module = row.moodul;

    if (!code || code.trim() === '') {
        throw new Error(`Rida ${rowNumber}: Puudub kood!`);
    }
    if (!semester || semester.trim() === '') {
        throw new Error(`Rida ${rowNumber}: Puudub semester!`);
    }
    if (!module || module.trim() === '') {
        throw new Error(`Rida ${rowNumber}: Puudub moodul!`);
    }

    // NORMALIZED VALUES
    const normalizedCode = code.trim().toUpperCase();
    const semesterNum = parseInt(semester);
    const normalizedModule = module.trim().toUpperCase();

    if (isNaN(semesterNum) || semesterNum < 1 || semesterNum > 6) {
        throw new Error(`Rida ${rowNumber}: Aine ${normalizedCode} semester peab olema arv 1-6.`);
    }

    if (!validModuleCodes.includes(normalizedModule)) {
        throw new Error(
            `Rida ${rowNumber}: Vigane mooduli kood "${normalizedModule}" ainele ${normalizedCode}.\n` +
            `Lubatud koodid: ${validModuleCodes.join(', ')}.`
        );
    }

    // ADD VIA API
    let searchResults;
    try {
        searchResults = await searchCourses(normalizedCode);
    } catch (error) {
        throw new Error(`Rida ${rowNumber}: Aine ${normalizedCode} otsimine ebaõnnestus: ${error.message}`);
    }

    if (!searchResults || searchResults.length === 0) {
        throw new Error(`Rida ${rowNumber}: Ainet ${normalizedCode} ei leitud.`);
    }
    const courseDetails = searchResults[0];

    // EXTRA INFO
    let courseSeason, curriculumInfo;
    try {
        courseSeason = await getCourseSeason(courseDetails.code);
        curriculumInfo = await getCourseCurricula(courseDetails.uuid);
    } catch (error) {
        throw new Error(`Rida ${rowNumber}: Aine ${normalizedCode} lisainfo pärimine ebaõnnestus: ${error.message}`);
    }

    // CREATE COURSE
    const courseData = {
        uuid: courseDetails.uuid,
        semester: semesterNum,
        code: courseDetails.code,
        title: courseDetails.title.et || courseDetails.title.en,
        credits: courseDetails.credits,
        isAutumnCourse: courseSeason.isAutumnCourse,
        isSpringCourse: courseSeason.isSpringCourse,
        curriculum: curriculumInfo.default,
        module: normalizedModule,
    };

    try {
        const createdCourse = await Course.create(courseData);
        return {
            code: createdCourse.code,
            semester: createdCourse.semester,
            module: createdCourse.module,
            status: 'success'
        };
    } catch (error) {
        throw new Error(`Rida ${rowNumber}: Aine ${normalizedCode} salvestamine ebaõnnestus: ${error.message}`);
    }
};