const cheerio = require("cheerio");

const isSummaryRow = ($cells) => {
    const text = $cells.text().toLowerCase();
    return text.includes("total units") || text.includes("total");
};

const cleanText = (text) => text.replace(/\s+/g, " ").trim();

/**
 * Parses student info like name, ID, course, etc. from registration form.
 */
const parseStudentInformation = (html) => {
    const $ = cheerio.load(html);
    const $form = $("#view-registration-form");

    const info = {};
    $form
        .find("table")
        .first()
        .find("tr")
        .each((_, row) => {
            $(row)
                .find("td")
                .each((i, cell) => {
                    const text = cleanText($(cell).text());

                    switch (text) {
                        case "Card No:":
                            info.cardNumber = cleanText($(cell).next().text());
                            break;
                        case "ID No:":
                            info.idNumber = cleanText($(cell).next().text());
                            break;
                        case "Name:":
                            info.name = cleanText($(cell).next().text());
                            break;
                        case "Section:":
                            info.section = cleanText($(cell).next().text());
                            break;
                        case "Course:":
                            info.course = cleanText($(cell).next().text());
                            break;
                        case "Semester:":
                            info.semester = cleanText($(cell).next().text());
                            break;
                    }
                });
        });

    return info;
};

const parseSubjectList = (html) => {
    const $ = cheerio.load(html);
    const $form = $("#view-registration-form");
    const subjectList = [];

    const $tables = $form.find("table");
    const $table = $tables
        .filter((_, el) => $(el).text().includes("DESCRIPTIVE TITLE"))
        .first();
    $table.find("tbody tr").each((_, row) => {
        const $cells = $(row).find("td");
        const cells = $cells.map((i, el) => cleanText($(el).text())).get();
        const subject = {
            code: cells[1],
            subjectNumber: cells[2],
            title: cells[3],
            schedule: cells[4]
                .split("*")
                .filter(Boolean)
                .map((s) => {
                    const parts = s.trim().split(/\s+/); // Split by any whitespace
                    return {
                        timePeriod: parts[0] || null,
                        classroom: parts[1] || null,
                        days: parts[2] || null,
                    };
                }),

            units: cells[5],
            required: cells[6] !== "",
        };

        subjectList.push(subject);
    });

    return subjectList;
};

const parseSuggestedGElectiveDeficiencies = (html) => {
    const $ = cheerio.load(html);
    const suggestedGElectiveDeficiencies = [];

    const $table = $(
        'table:contains("SUGGESTED GE ELECTIVE DEFICIENCIES THAT CAN BE TAKEN THIS SEMESTER")'
    );
    $table.find("tbody tr:not(.empty)").each((_, row) => {
        const $cells = $(row).find("td");
        if (isSummaryRow($cells)) return;
        if ($cells.length < 5) return;

        const deficiency = {
            subjNo: cleanText($cells.eq(0).text()),
            descriptiveTitle: cleanText($cells.eq(1).text()),
            units: cleanText($cells.eq(2).text()),
            yearLevel: cleanText($cells.eq(3).text()),
            semester: cleanText($cells.eq(4).text()),
        };

        suggestedGElectiveDeficiencies.push(deficiency);
    });

    return suggestedGElectiveDeficiencies;
};

const parseDeficiencies = (html) => {
    const $ = cheerio.load(html);
    const deficiencies = [];

    const $table = $('table:contains("DEFICIENCIES")');
    $table.find("tbody tr:not(.empty)").each((_, row) => {
        const $cells = $(row).find("td");
        if (isSummaryRow($cells)) return;
        if ($cells.length < 5) return;

        const deficiency = {
            subjNo: cleanText($cells.eq(0).text()),
            descriptiveTitle: cleanText($cells.eq(1).text()),
            units: cleanText($cells.eq(2).text()),
            yearLevel: cleanText($cells.eq(3).text()),
            semester: cleanText($cells.eq(4).text()),
        };

        deficiencies.push(deficiency);
    });

    return deficiencies;
};

const parseCurrentCurriculum = (html) => {
    const $ = cheerio.load(html);
    const currentCurriculum = [];

    const $table = $('table:contains("CURRENT CURRICULUM REQUIREMENT")');
    if ($table.length === 0) {
        console.warn("⚠️ No curriculum requirement table found.");
        return [];
    }

    $table.find("tbody tr").each((_, row) => {
        const $cells = $(row).find("td");
        if (isSummaryRow($cells)) return;
        if ($cells.length < 6) return;

        const subject = {
            subjectNumber: cleanText($cells.eq(0).text()),
            title: cleanText($cells.eq(1).text()),
            units: cleanText($cells.eq(2).text()),
            year: cleanText($cells.eq(3).text()),
            semester: cleanText($cells.eq(4).text()),
            remarks: cleanText($cells.eq(5).text()),
        };

        currentCurriculum.push(subject);
    });

    return currentCurriculum;
};

const parsePrereq = (html) => {
    const $ = cheerio.load(html);
    const prereq = [];

    const $table = $('table:contains("PREREQUISITE SUBJECTS")');

    if ($table.length === 0) {
        console.warn("⚠️ No prerequisite subjects table found.");
        return [];
    }

    $table.find("tbody tr").each((_, row) => {
        const $cells = $(row).find("td");

        const prereqSubject = {
            code: cleanText($cells.eq(0).text()),
            grade: cleanText($cells.eq(1).text()),
            period: cleanText($cells.eq(2).text()),
            prereqFor: cleanText($cells.eq(3).text()),
            enrollmentStatus: cleanText($cells.eq(4).text()),
        };

        prereq.push(prereqSubject);
    });

    return prereq;
};

module.exports = {
  parseStudentInformation,
  parseSubjectList,
  parseSuggestedGElectiveDeficiencies,
  parseDeficiencies,
  parseCurrentCurriculum,
  parsePrereq,
};
