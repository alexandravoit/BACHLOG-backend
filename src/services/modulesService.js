const moduleOptions = [
    { code: null, title: "Määramata" },
    { code: "PM", title: "Põhimoodul" },
    { code: "VM", title: "Valikmoodul" },
    { code: "SM", title: "Suunamoodul" },
    { code: "EM", title: "Erialamoodul" },
    { code: "VA", title: "Vabaaine" },
    { code: "LM", title: "Lõputöö moodul" }
];

export const getModuleOptions = async () => {
    return moduleOptions;
};