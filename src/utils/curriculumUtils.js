export const determineDefaultCurriculum = (curricula) => {
    if (curricula.includes('Informaatika')) return 'Informaatika';
    return curricula[0];
};