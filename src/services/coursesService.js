import axios from "axios";

const API_BASE = "http://ois2.ut.ee/api/courses";

export async function searchCourses(query) {
  try {
    const response = await axios.get(API_BASE, {
      params: {
        code: query.toUpperCase(),
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
    throw new Error("Error fetching courses from: " + API_BASE);
  }
}

export async function getCourseSeason(courseCode) {
  try {
    
    const [autumnResponse, springResponse] = await Promise.all([

      axios.get(API_BASE, {
        params: {
          code: courseCode.toUpperCase(),
          states: ["confirmed"],
          semester: "autumn" 
        }
      }),
      axios.get(API_BASE, {
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

