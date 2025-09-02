export const normalizeCourse = (dbCourse) => {
  if (!dbCourse) return null;
  
  return {
    id: dbCourse.ID,
    semester: dbCourse.SEMESTER,
    code: dbCourse.CODE,
    title: dbCourse.TITLE,
    credits: dbCourse.CREDITS,
    isAutumnCourse: dbCourse.IS_AUTUMN_COURSE,
    isSpringCourse: dbCourse.IS_SPRING_COURSE,
    curriculum: dbCourse.CURRICULUM,
    module: dbCourse.MODULE,
    comment: dbCourse.COMMENT,
    grade: dbCourse.GRADE
  };
};

export const normalizeCourses = (dbCourses) => {
  return dbCourses.map(normalizeCourse).filter(course => course !== null);
};