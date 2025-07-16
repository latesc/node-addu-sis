const fs = require("fs");
const {
    parseStudentInformation,
    parseSubjectList,
    parseSuggestedGElectiveDeficiencies,
    parseDeficiencies,
    parseCurrentCurriculum,
    parsePrereq,
} = require("../lib/parsers/registration");

const loadHTMLFile = (path) => fs.readFileSync(path, "utf8");

// Test Registration
const main = async () => {
    const html = loadHTMLFile(
        "./test-pages/registration/My Enrollment _ STUDENT INFORMATION SYSTEM.html"
    );

    const info = parseStudentInformation(html);
    const subjectList = parseSubjectList(html);
    const suggestedGElectiveDeficiencies =
        parseSuggestedGElectiveDeficiencies(html);
    const deficiencies = parseDeficiencies(html);
    const currentCurriculum = parseCurrentCurriculum(html);
    const prereq = parsePrereq(html);

    console.group("Student Info");
    console.log(info);
    console.groupEnd();

    console.group("\nEnrolled Subjects");
    console.table(subjectList);
    console.groupEnd();

    console.group("\nGE Elective Deficiencies");
    console.table(suggestedGElectiveDeficiencies);
    console.groupEnd();

    console.group("\nDeficiencies");
    console.table(deficiencies);
    console.groupEnd();

    console.group("\nCurrent Curriculum");
    console.table(currentCurriculum);
    console.groupEnd();

    console.group("\nPrereq");
    console.table(prereq);
    console.groupEnd();
};

main();
