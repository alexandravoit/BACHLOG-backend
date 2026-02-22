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
            courses: []
        };

        const csvString = csvBuffer.toString();
        const separator = csvString.includes(';') ? ';' : ',';

        const stream = Readable.from(csvString);
        const rows = [];
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
                        `CSV failis puuduvad veerud: ${missingColumns.join(', ').toUpperCase()}. ` +
                        `Nõutud veerud on: KOOD, SEMESTER, MOODUL.`
                    ));
                    return;
                }

                const actualOrder = headerList.filter(h => requiredColumns.includes(h));
                const orderMismatch = requiredColumns.some((col, index) => actualOrder[index] !== col);
                if (orderMismatch) {
                    reject(new Error(
                        `CSV veergude järjekord on vale. ` +
                        `Oodatav järjekord: KOOD, SEMESTER, MOODUL. ` +
                        `Tegelik järjekord: ${actualOrder.map(c => c.toUpperCase()).join(', ')}.`
                    ));
                }
            })
            .on('data', (row) => {
                rowNumber++;
                rows.push({ row, rowNumber });
            })
            .on('end', async () => {
                const BATCH_SIZE = 10;
                for (let i = 0; i < rows.length; i += BATCH_SIZE) {
                    const batch = rows.slice(i, i + BATCH_SIZE);

                    await Promise.all(
                        batch.map(async ({ row, rowNumber }) => {
                            results.processed++;

                            try {
                                const course = await processCsvRow(row, rowNumber, validModuleCodes);
                                results.courses.push(course);
                                results.succeeded++;
                            } catch (error) {
                                results.failed++;
                                const failedCourse = {
                                    code: row.kood || 'N/A',
                                    semester: row.semester || 'N/A',
                                    module: row.moodul || 'N/A',
                                    row: error.row,
                                    error: error.message,
                                    status: "failed"
                                };
                                results.courses.push(failedCourse);
                            }
                        })
                    );
                }
                resolve(results);
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
        const err = new Error(`Puudub kood!`);
        err.row = rowNumber;
        throw err;
    }
    if (!semester || semester.trim() === '') {
        const err = new Error(`Puudub semester!`);
        err.row = rowNumber;
        throw err;
    }
    if (!module || module.trim() === '') {
        const err = new Error(`Puudub moodul!`);
        err.row = rowNumber;
        throw err;
    }

    // NORMALIZED VALUES
    const normalizedCode = code.trim().toUpperCase();
    const semesterNum = parseInt(semester);
    const normalizedModule = module.trim().toUpperCase();

    if (isNaN(semesterNum) || semesterNum < 1 || semesterNum > 6) {
        const err = new Error(`Aine ${normalizedCode} semester peab olema arv 1-6.`);
        err.row = rowNumber;
        throw err;
    }

    if (!validModuleCodes.includes(normalizedModule)) {
        const err = new Error(
            `Vigane mooduli kood "${normalizedModule}" ainele ${normalizedCode}. ` +
            `Lubatud koodid: ${validModuleCodes.join(', ')}.`
        );
        err.row = rowNumber;
        throw err;
    }

    // ADD VIA API
    let searchResults;
    try {
        searchResults = await searchCourses(normalizedCode);
    } catch (error) {
        const err = new Error(`Aine ${normalizedCode} otsimine ebaõnnestus: ${error.message}`);
        err.row = rowNumber;
        throw err;
    }

    if (!searchResults || searchResults.length === 0) {
        const err = new Error(`Ainet ${normalizedCode} ei leitud.`);
        err.row = rowNumber;
        throw err;
    }
    const courseDetails = searchResults[0];

    // EXTRA INFO
    let courseSeason, curriculumInfo;
    try {
        courseSeason = await getCourseSeason(courseDetails.code);
        curriculumInfo = await getCourseCurricula(courseDetails.uuid);
    } catch (error) {
        const err = new Error(`Aine ${normalizedCode} lisainfo pärimine ebaõnnestus: ${error.message}`);
        err.row = rowNumber;
        throw err;
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
        const err = new Error(`Aine ${normalizedCode} salvestamine ebaõnnestus: ${error.message}`);
        err.row = rowNumber;
        throw err;
    }
};