import axios from "axios";

const API_BASE_CURRICULA = "http://ois2.ut.ee/api/curricula";

const moduleOptions = [
    { code: null, title: "Määramata" },
    { code: "PM", title: "Põhimoodul", minEap: 108 },
    { code: "VM", title: "Valikmoodul", minEap: 12 },
    { code: "SM", title: "Suunamoodul", minEap: 24 },
    { code: "EM", title: "Erialamoodul", minEap: 24 },
    { code: "VA", title: "Vabaaine", minEap: 9 },
    { code: "LM", title: "Lõputöö moodul", minEap: 15 }
];

export const getModuleOptions = async () => {
    return moduleOptions;
};

export async function getModuleVersions(curriculumId) {
    try {
        const response = await axios.get(`${API_BASE_CURRICULA}/${curriculumId}/versions`);

        const lastFiveYears = response.data
            .filter(version => version.state.code === 'confirmed')
            .sort((a, b) => b.year - a.year)
            .slice(0, 5)
            .map(version => version.year);

        return lastFiveYears;
    } catch (err) {
        throw new Error(`Error fetching curricula versions from: ${API_BASE_CURRICULA}/${curriculumId}/versions`);
    }
}

export async function getRequiredModules(curriculumId, year) {
    try {
        const response = await axios.get(
            `${API_BASE_CURRICULA}/${curriculumId}/versions/${year}`
        );

        if (response.data.modules.blocks) {
            return extractCurriculumSubmodules(response.data.modules.blocks);
        } else {
            return null;
        }
    } catch (err) {
        throw new Error(
            `Error fetching modules from: ${API_BASE_CURRICULA}/${curriculumId}/versions/${year}`
        );
    }
}

function extractCurriculumSubmodules(modules) {
    const requiredSubmodules = [];
    let electiveSubmodule = null;
    let thesisSubmodule = null;

    const stack = [...modules];

    while (stack.length > 0) {
        const currentModule = stack.pop();

        // HARD-CODED ELECTIVES SUBMODULE
        if (currentModule.title.et === 'Informaatika valikmoodulid') {
            electiveSubmodule = {
                uuid: currentModule.uuid,
                title: currentModule.title?.et,
                min_credits: currentModule.min_credits || 0,
                code: "VM",
                course_uuids: (currentModule.courses || []).map(course => course.main_uuid).filter(Boolean)
            };
        }

        // HARD-CODED THESIS SUBMODULE
        if (currentModule.title.et === 'Lõputöö moodul') {
            thesisSubmodule = {
                uuid: currentModule.uuid,
                title: currentModule.title?.et,
                min_credits: currentModule.min_credits || 0,
                code: "LM",
                course_uuids: (currentModule.courses || []).map(course => course.main_uuid).filter(Boolean)
            };
        }

        // REQUIRED SUBMODULES
        if (currentModule.submodules && Array.isArray(currentModule.submodules)) {
            for (const submodule of currentModule.submodules) {
                if (submodule.option_type && submodule.option_type.code === 'required') {
                    requiredSubmodules.push({
                        uuid: submodule.uuid,
                        title: submodule.title?.et,
                        min_credits: submodule.min_credits || 0,
                        code: "PM",
                        course_uuids: (submodule.courses || []).map(course => course.main_uuid).filter(Boolean)
                    });
                }
                stack.push(submodule);
            }
        }

        // NESTED BLOCKS CHECK
        if (currentModule.blocks && Array.isArray(currentModule.blocks)) {
            stack.push(...currentModule.blocks);
        }
    }

    return {
        required_submodules: requiredSubmodules,
        elective_submodule: electiveSubmodule,
        thesis_submodule: thesisSubmodule
    };
}
