import axios from "axios";
import {determineDefaultCurriculum} from "../utils/curriculumUtils.js";

const API_BASE_COURSES = "http://ois2.ut.ee/api/courses";
const API_BASE_CURRICULA = "http://ois2.ut.ee/api/curricula/course-curricula";

export async function searchCourses(courseCode) {
  try {
    const response = await axios.get(API_BASE_COURSES, {
      params: {
        code: courseCode.toUpperCase(),
        take: 20,
        states: ["confirmed"],
      },
    });
    
    if (response.data && Array.isArray(response.data)) {
      return response.data;
    } else {
      return [];
    }
  } catch (err) {
    throw new Error("Error fetching courses from: " + API_BASE_COURSES);
  }
}

export async function getCourseByUuid(courseUuid) {
    try {
        const response = await axios.get(`${API_BASE_COURSES}/${courseUuid}`);
        return response.data;
    } catch (err) {
        throw new Error(`Error fetching course by uuid from: ${API_BASE_COURSES}/${courseUuid}`);
    }
}

export async function getCourseSeason(courseCode) {
  try {
    
    const [autumnResponse, springResponse] = await Promise.all([

      axios.get(API_BASE_COURSES, {
        params: {
          code: courseCode.toUpperCase(),
          states: ["confirmed"],
          semester: "autumn" 
        }
      }),
      axios.get(API_BASE_COURSES, {
        params: {
          code: courseCode.toUpperCase(),
          states: ["confirmed"],
          semester: "spring"
        }
      })

    ]);

    const hasAutumn = autumnResponse.data && autumnResponse.data.length > 0;
    const hasSpring = springResponse.data && springResponse.data.length > 0;

    return {
      isAutumnCourse: hasAutumn ? 1 : 0,
      isSpringCourse: hasSpring ? 1 : 0
    };
  } catch (error) {
     throw new Error("Error determining course season")
  }
}

export async function getCourseCurricula(courseUuid) {
    try {
        const response = await axios.get(`${API_BASE_CURRICULA}/${courseUuid}`);
        const curricula = response.data.map(item => item.curriculum?.title?.et);
        const defaultCurriculum = determineDefaultCurriculum(curricula);

        return {
            curricula: curricula,
            default: defaultCurriculum
        };
    } catch (err) {
        throw new Error("Error getting course curricula from: " + API_BASE_CURRICULA);
    }
}

export async function getCoursePrereqs(courseCode) {
    try {
        const response = await axios.get(`${API_BASE_COURSES}/${courseCode}`);
        const courseDetails = response.data;
        const prerequisites = courseDetails?.additional_info?.prerequisites || [];

        if (prerequisites.length === 0) return [];

        const confirmedPrereqs = [];

        for (const prereq of prerequisites) {
            if (prereq.state?.code === "confirmed" && prereq.code) {
                confirmedPrereqs.push(prereq.code);
            }

            const alternatives = prereq.alternatives || [];
            for (const alternative of alternatives) {
                if (alternative.state?.code === "confirmed" && alternative.code) {
                    confirmedPrereqs.push(alternative.code);
                }
            }
        }

        return confirmedPrereqs;
    } catch (err) {
        throw new Error("Error getting course prerequisites from: " + API_BASE_COURSES + "/" + courseCode);
    }
}