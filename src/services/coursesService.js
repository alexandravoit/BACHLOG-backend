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
