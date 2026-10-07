const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

// =====================================================
// MYSQL CONNECTION
// =====================================================

const dbConfig = {
    host: "localhost",
    user: "campusai_user",
    password: "CampusAI@123",
    database: "campusai"
};

let db;

async function connectDatabase() {
    try {
        db = await mysql.createConnection(dbConfig);
        console.log("CampusAI MySQL database connected!");
    } catch (error) {
        console.error("MySQL connection failed:", error.message);
    }
}

connectDatabase();


// =====================================================
// HOME
// =====================================================

app.get("/", (req, res) => {
    res.send("CampusAI backend running successfully!");
});


// =====================================================
// TEST DATABASE
// =====================================================

app.get("/test-db", async (req, res) => {

    try {

        const [rows] = await db.query(
            "SELECT 1 AS test"
        );

        res.json({
            success: true,
            message: "Database connected",
            data: rows
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            error: error.message
        });

    }

});


// =====================================================
// STUDENT LOGIN
// =====================================================

app.post("/student-login", async (req, res) => {

    try {

        const {
            register_no,
            password
        } = req.body;

        if (!register_no || !password) {

            return res.status(400).json({
                success: false,
                message:
                    "Register number and password required"
            });

        }

        const [rows] = await db.query(
            `SELECT
                register_no,
                name,
                class_name
             FROM students
             WHERE register_no = ?
             AND password = ?`,
            [
                register_no,
                password
            ]
        );

        if (rows.length === 0) {

            return res.status(401).json({
                success: false,
                message:
                    "Invalid register number or password"
            });

        }

        res.json({
            success: true,
            student: rows[0]
        });

    } catch (error) {

        console.error(
            "LOGIN ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Login error"
        });

    }

});


// =====================================================
// GET ONE STUDENT
// =====================================================

app.get("/student/:register_no", async (req, res) => {

    try {

        const {
            register_no
        } = req.params;

        const [rows] = await db.query(
            `SELECT
                register_no,
                name,
                class_name
             FROM students
             WHERE register_no = ?`,
            [register_no]
        );

        res.json({
            success: true,
            student: rows[0] || null
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            error: error.message
        });

    }

});


// =====================================================
// GET STUDENTS BY CLASS
// =====================================================

app.get("/students/:class_name", async (req, res) => {

    try {

        const {
            class_name
        } = req.params;

        const [rows] = await db.query(
            `SELECT
                register_no,
                name,
                class_name
             FROM students
             WHERE class_name = ?
             ORDER BY register_no`,
            [class_name]
        );

        res.json({
            success: true,
            students: rows
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            error: error.message
        });

    }

});


// =====================================================
// GET MARKS - ONE STUDENT
// =====================================================

app.get("/marks/:register_no", async (req, res) => {

    try {

        const {
            register_no
        } = req.params;

        const [rows] = await db.query(
            `SELECT
                register_no,
                class_name,
                semester,
                internal_exam,
                subject,
                mark
             FROM marks
             WHERE register_no = ?
             ORDER BY
                semester,
                internal_exam,
                subject`,
            [register_no]
        );

        res.json({
            success: true,
            marks: rows
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            error: error.message
        });

    }

});


// =====================================================
// SAVE MARK
// =====================================================

app.post("/marks", async (req, res) => {

    try {

        const {
            register_no,
            class_name,
            semester,
            internal_exam,
            subject,
            mark
        } = req.body;

        if (
            !register_no ||
            !class_name ||
            !semester ||
            !internal_exam ||
            !subject ||
            mark === undefined
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "All mark fields are required"
            });

        }

        const [existing] = await db.query(
            `SELECT id
             FROM marks
             WHERE register_no = ?
             AND class_name = ?
             AND semester = ?
             AND internal_exam = ?
             AND subject = ?`,
            [
                register_no,
                class_name,
                semester,
                internal_exam,
                subject
            ]
        );

        if (existing.length > 0) {

            await db.query(
                `UPDATE marks
                 SET mark = ?
                 WHERE id = ?`,
                [
                    mark,
                    existing[0].id
                ]
            );

        } else {

            await db.query(
                `INSERT INTO marks
                (
                    register_no,
                    class_name,
                    semester,
                    internal_exam,
                    subject,
                    mark
                )
                VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    register_no,
                    class_name,
                    semester,
                    internal_exam,
                    subject,
                    mark
                ]
            );

        }

        res.json({
            success: true,
            message:
                "Mark saved successfully"
        });

    } catch (error) {

        console.error(
            "SAVE MARK ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            error: error.message
        });

    }

});


// =====================================================
// MARKS - CLASS / SEMESTER / INTERNAL / SUBJECT
// =====================================================

app.get(
    "/marks-class/:class_name/:semester/:internal_exam/:subject",
    async (req, res) => {

        try {

            const {
                class_name,
                semester,
                internal_exam,
                subject
            } = req.params;

            const [rows] = await db.query(
                `SELECT
                    register_no,
                    class_name,
                    semester,
                    internal_exam,
                    subject,
                    mark
                 FROM marks
                 WHERE class_name = ?
                 AND semester = ?
                 AND internal_exam = ?
                 AND subject = ?
                 ORDER BY register_no`,
                [
                    class_name,
                    semester,
                    internal_exam,
                    subject
                ]
            );

            res.json({
                success: true,
                marks: rows
            });

        } catch (error) {

            res.status(500).json({
                success: false,
                error: error.message
            });

        }

    }
);


// =====================================================
// GET ATTENDANCE - ONE STUDENT
// =====================================================

app.get("/attendance/:register_no", async (req, res) => {

    try {

        const {
            register_no
        } = req.params;

        const [rows] = await db.query(
            `SELECT
                register_no,
                class_name,
                semester,
                internal_exam,
                subject,
                attendance_percentage
             FROM attendance
             WHERE register_no = ?
             ORDER BY
                semester,
                internal_exam,
                subject`,
            [register_no]
        );

        res.json({
            success: true,
            attendance: rows
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            error: error.message
        });

    }

});


// =====================================================
// SAVE ATTENDANCE
// =====================================================

app.post("/attendance", async (req, res) => {

    try {

        const {
            register_no,
            class_name,
            semester,
            internal_exam,
            subject,
            attendance_percentage
        } = req.body;

        if (
            !register_no ||
            !class_name ||
            !semester ||
            !internal_exam ||
            !subject ||
            attendance_percentage === undefined
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "All attendance fields are required"
            });

        }

        const [existing] = await db.query(
            `SELECT id
             FROM attendance
             WHERE register_no = ?
             AND class_name = ?
             AND semester = ?
             AND internal_exam = ?
             AND subject = ?`,
            [
                register_no,
                class_name,
                semester,
                internal_exam,
                subject
            ]
        );

        if (existing.length > 0) {

            await db.query(
                `UPDATE attendance
                 SET attendance_percentage = ?
                 WHERE id = ?`,
                [
                    attendance_percentage,
                    existing[0].id
                ]
            );

        } else {

            await db.query(
                `INSERT INTO attendance
                (
                    register_no,
                    class_name,
                    semester,
                    internal_exam,
                    subject,
                    attendance_percentage
                )
                VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    register_no,
                    class_name,
                    semester,
                    internal_exam,
                    subject,
                    attendance_percentage
                ]
            );

        }

        res.json({
            success: true,
            message:
                "Attendance saved successfully"
        });

    } catch (error) {

        console.error(
            "SAVE ATTENDANCE ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            error: error.message
        });

    }

});


// =====================================================
// COMPLAINTS
// =====================================================


// -----------------------------------------------------
// GET COMPLAINTS - ONE STUDENT
// -----------------------------------------------------

app.get("/complaints/:register_no", async (req, res) => {

    try {

        const {
            register_no
        } = req.params;

        const [rows] = await db.query(
            `SELECT *
             FROM complaints
             WHERE register_no = ?
             ORDER BY created_at DESC`,
            [register_no]
        );

        res.json({
            success: true,
            complaints: rows
        });

    } catch (error) {

        console.error(
            "GET STUDENT COMPLAINTS ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            error: error.message
        });

    }

});


// -----------------------------------------------------
// GET ALL COMPLAINTS - ADMIN
// -----------------------------------------------------

app.get("/complaints", async (req, res) => {

    try {

        const [rows] = await db.query(
            `SELECT *
             FROM complaints
             ORDER BY created_at DESC`
        );

        res.json({
            success: true,
            complaints: rows
        });

    } catch (error) {

        console.error(
            "GET ALL COMPLAINTS ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            error: error.message
        });

    }

});


// -----------------------------------------------------
// SAVE COMPLAINT
// -----------------------------------------------------

app.post("/complaints", async (req, res) => {

    try {

        const {
            register_no,
            complaint_id,
            complaint_about,
            about,
            language,
            statement,
            video,
            audio,
            photo,
            status
        } = req.body;

        const complaintAbout =
            complaint_about ||
            about ||
            "";

        const complaintStatus =
            status ||
            "Pending";

        if (!register_no) {

            return res.status(400).json({
                success: false,
                message:
                    "Register number is required"
            });

        }

        if (!complaintAbout) {

            return res.status(400).json({
                success: false,
                message:
                    "Complaint about is required"
            });

        }

        const generatedComplaintId =
            complaint_id ||
            "CMP" +
            Date.now()
                .toString()
                .slice(-6);


        const [columns] =
            await db.query(
                `SHOW COLUMNS FROM complaints`
            );


        const columnNames =
            columns.map(
                column => column.Field
            );


        const complaintData = {

            register_no:
                register_no,

            complaint_id:
                generatedComplaintId,

            complaint_about:
                complaintAbout,

            about:
                complaintAbout,

            language:
                language ||
                "English",

            statement:
                statement ||
                "",

            video:
                video ||
                null,

            audio:
                audio ||
                null,

            photo:
                photo ||
                null,

            status:
                complaintStatus

        };


        const insertColumns = [];
        const insertValues = [];


        for (
            const column of columnNames
        ) {

            if (
                Object.prototype.hasOwnProperty.call(
                    complaintData,
                    column
                )
            ) {

                insertColumns.push(column);

                insertValues.push(
                    complaintData[column]
                );

            }

        }


        if (
            insertColumns.length === 0
        ) {

            return res.status(500).json({
                success: false,
                message:
                    "No matching complaint columns found in database."
            });

        }


        const placeholders =
            insertColumns
                .map(() => "?")
                .join(", ");


        const sql = `
            INSERT INTO complaints
            (${insertColumns.join(", ")})
            VALUES (${placeholders})
        `;


        await db.query(
            sql,
            insertValues
        );


        res.json({

            success: true,

            message:
                "Complaint submitted successfully!",

            complaint_id:
                generatedComplaintId,

            status:
                complaintStatus

        });


    } catch (error) {

        console.error(
            "SAVE COMPLAINT ERROR:",
            error
        );

        res.status(500).json({

            success: false,

            message:
                "Could not save complaint",

            error:
                error.message

        });

    }

});


// -----------------------------------------------------
// UPDATE COMPLAINT STATUS
// -----------------------------------------------------

app.put(
    "/complaints/:id/status",
    async (req, res) => {

        try {

            const {
                id
            } = req.params;

            const {
                status
            } = req.body;


            if (!status) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Status is required"
                });

            }


            const allowedStatuses = [
                "Pending",
                "Solved"
            ];


            if (
                !allowedStatuses.includes(
                    status
                )
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid status"
                });

            }


            const [result] =
                await db.query(
                    `UPDATE complaints
                     SET status = ?
                     WHERE complaint_id = ?`,
                    [
                        status,
                        id
                    ]
                );


            if (
                result.affectedRows === 0
            ) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Complaint not found"
                });

            }


            res.json({

                success: true,

                message:
                    "Complaint status updated successfully",

                status:
                    status

            });


        } catch (error) {

            console.error(
                "UPDATE COMPLAINT STATUS ERROR:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Could not update complaint status",

                error:
                    error.message

            });

        }

    }
);


// =====================================================
// FOOD COURT
// =====================================================

app.get("/foodcourt", async (req, res) => {

    try {

        const [rows] = await db.query(
            `SELECT
                id,
                name,
                price,
                quantity
             FROM food_items
             ORDER BY id DESC`
        );

        res.json({
            success: true,
            items: rows
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            error: error.message
        });

    }

});


app.post("/foodcourt", async (req, res) => {

    try {

        const {
            name,
            price,
            quantity
        } = req.body;

        await db.query(
            `INSERT INTO food_items
            (name, price, quantity)
            VALUES (?, ?, ?)`,
            [
                name,
                price,
                quantity
            ]
        );

        res.json({
            success: true,
            message:
                "Food item added"
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            error: error.message
        });

    }

});


app.put("/foodcourt/:id", async (req, res) => {

    try {

        const {
            name,
            price,
            quantity
        } = req.body;

        const {
            id
        } = req.params;

        await db.query(
            `UPDATE food_items
             SET name = ?,
                 price = ?,
                 quantity = ?
             WHERE id = ?`,
            [
                name,
                price,
                quantity,
                id
            ]
        );

        res.json({
            success: true,
            message:
                "Food item updated"
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            error: error.message
        });

    }

});


app.delete("/foodcourt/:id", async (req, res) => {

    try {

        const {
            id
        } = req.params;

        await db.query(
            `DELETE FROM food_items
             WHERE id = ?`,
            [id]
        );

        res.json({
            success: true,
            message:
                "Food item deleted"
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            error: error.message
        });

    }

});


// =====================================================
// LIBRARY
// =====================================================

app.get("/library", async (req, res) => {

    try {

        const [rows] = await db.query(
            `SELECT
                id,
                name,
                book_count,
                status
             FROM library_books
             ORDER BY id DESC`
        );

        res.json({
            success: true,
            books: rows
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            error: error.message
        });

    }

});


// =====================================================
// EVENTS
// =====================================================

app.get("/events", async (req, res) => {

    try {

        const [rows] = await db.query(
            `SELECT
                id,
                name,
                event_date,
                venue,
                about,
                registration_link
             FROM events
             ORDER BY event_date`
        );

        res.json({
            success: true,
            events: rows
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            error: error.message
        });

    }

});


// =====================================================
// ANNOUNCEMENTS
// =====================================================

app.get(
    "/announcements",
    async (req, res) => {

        try {

            const [rows] =
                await db.query(
                    `SELECT
                        id,
                        announcement_text,
                        announcement_date
                     FROM announcements
                     ORDER BY announcement_date DESC`
                );

            res.json({
                success: true,
                announcements: rows
            });

        } catch (error) {

            res.status(500).json({
                success: false,
                error: error.message
            });

        }

    }
);


// =====================================================
// TIMETABLE
// =====================================================

app.get(
    "/timetable/:class_name/:semester",
    async (req, res) => {

        try {

            const {
                class_name,
                semester
            } = req.params;

            const [rows] =
                await db.query(
                    `SELECT
                        id,
                        class_name,
                        semester,
                        file_name,
                        file_type,
                        file_data,
                        uploaded_at
                     FROM timetables
                     WHERE class_name = ?
                     AND semester = ?
                     ORDER BY uploaded_at DESC`,
                    [
                        class_name,
                        semester
                    ]
                );

            res.json({
                success: true,
                timetables: rows
            });

        } catch (error) {

            res.status(500).json({
                success: false,
                error: error.message
            });

        }

    }
);


// =====================================================
// SMART SUBJECT MATCHING
// =====================================================

function normalizeSubject(text) {

    return String(text || "")
        .toLowerCase()
        .replace(
            /[^a-z0-9]/g,
            ""
        );

}


function subjectMatches(
    question,
    subject
) {

    const q =
        normalizeSubject(question);

    const s =
        normalizeSubject(subject);


    if (q.includes(s)) {
        return true;
    }


    const aliases = {

        se: [
            "se",
            "softwareengineering"
        ],

        dbms: [
            "dbms",
            "database",
            "databasemanagementsystem",
            "databasemanagement"
        ],

        cn: [
            "cn",
            "computernetwork",
            "computernetworks"
        ],

        ai: [
            "ai",
            "artificialintelligence"
        ],

        ml: [
            "ml",
            "machinelearning"
        ],

        python: [
            "python"
        ],

        java: [
            "java"
        ],

        os: [
            "os",
            "operatingsystem",
            "operatingsystems"
        ],

        ds: [
            "ds",
            "datastructure",
            "datastructures"
        ]

    };


    for (
        const key in aliases
    ) {

        const words =
            aliases[key];


        const subjectMatchesAlias =
            words.some(
                word =>
                    s.includes(word) ||
                    word.includes(s)
            );


        const questionMatchesAlias =
            words.some(
                word =>
                    q.includes(word)
            );


        if (
            subjectMatchesAlias &&
            questionMatchesAlias
        ) {

            return true;

        }

    }


    const subjectWords =
        String(subject)
            .toLowerCase()
            .split(/\s+/)
            .filter(
                word =>
                    word.length >= 3
            );


    for (
        const word of subjectWords
    ) {

        const cleanWord =
            word.replace(
                /[^a-z0-9]/g,
                ""
            );


        if (
            cleanWord &&
            q.includes(cleanWord)
        ) {

            return true;

        }

    }


    return false;

}


// =====================================================
// FIND SEMESTER
// =====================================================

function findSemester(text) {

    const match =
        String(text).match(
            /(?:semester|sem)\s*[- ]?\s*(1|2|3|4|5|6|7|8)\b/i
        );


    if (match) {

        return Number(
            match[1]
        );

    }


    return null;

}


// =====================================================
// FIND INTERNAL
// =====================================================

function findInternal(text) {

    const match =
        String(text).match(
            /(?:internal|int)\s*[- ]?\s*(1|2|3)\b/i
        );


    if (match) {

        return Number(
            match[1]
        );

    }


    return null;

}


// =====================================================
// SMART CAMPUSAI CHATBOT
// =====================================================

app.post("/chat", async (req, res) => {

    try {

        const {
            register_no,
            question
        } = req.body;


        if (
            !register_no ||
            !question
        ) {

            return res.status(400).json({

                success: false,

                answer:
                    "Please enter your question."

            });

        }


        const q =
            String(question)
                .toLowerCase()
                .trim();


        const [studentRows] =
            await db.query(
                `SELECT
                    register_no,
                    name,
                    class_name
                 FROM students
                 WHERE register_no = ?`,
                [register_no]
            );


        if (
            studentRows.length === 0
        ) {

            return res.json({

                success: false,

                answer:
                    "Student information not found."

            });

        }


        const student =
            studentRows[0];


        // =================================================
        // MARKS QUESTION
        // =================================================

        const isMarksQuestion =
            q.includes("mark") ||
            q.includes("marks") ||
            q.includes("score") ||
            q.includes("scored");


        if (isMarksQuestion) {

            const semester =
                findSemester(q);

            const internal =
                findInternal(q);


            let sql = `
                SELECT
                    semester,
                    internal_exam,
                    subject,
                    mark
                FROM marks
                WHERE register_no = ?
            `;


            const params = [
                register_no
            ];


            if (
                semester !== null
            ) {

                sql +=
                    ` AND semester = ?`;

                params.push(
                    semester
                );

            }


            if (
                internal !== null
            ) {

                sql +=
                    ` AND internal_exam = ?`;

                params.push(
                    internal
                );

            }


            sql += `
                ORDER BY
                    semester,
                    internal_exam,
                    subject
            `;


            const [marks] =
                await db.query(
                    sql,
                    params
                );


            if (
                marks.length === 0
            ) {

                let message =
                    "No marks found";


                if (
                    semester !== null
                ) {

                    message +=
                        ` for Semester ${semester}`;

                }


                if (
                    internal !== null
                ) {

                    message +=
                        ` Internal ${internal}`;

                }


                message += ".";


                return res.json({

                    success: true,

                    answer:
                        message

                });

            }


            const matchedSubject =
                marks.find(
                    row =>
                        subjectMatches(
                            q,
                            row.subject
                        )
                );


            if (
                matchedSubject
            ) {

                return res.json({

                    success: true,

                    answer:
                        `${matchedSubject.subject} mark: ${matchedSubject.mark}`

                });

            }


            let answer = "";


            if (
                semester !== null
            ) {

                answer +=
                    `Semester ${semester}`;

            } else {

                answer +=
                    "Your";

            }


            if (
                internal !== null
            ) {

                answer +=
                    ` - Internal ${internal}`;

            }


            answer +=
                " marks:\n\n";


            marks.forEach(
                (row, index) => {

                    answer +=
                        `${index + 1}. ${row.subject} - ${row.mark}\n`;

                }
            );


            return res.json({

                success: true,

                answer

            });

        }


        // =================================================
        // ATTENDANCE QUESTION
        // =================================================

        const isAttendanceQuestion =
            q.includes("attendance") ||
            q.includes("attend") ||
            q.includes("present percentage");


        if (
            isAttendanceQuestion
        ) {

            const semester =
                findSemester(q);

            const internal =
                findInternal(q);


            let sql = `
                SELECT
                    semester,
                    internal_exam,
                    subject,
                    attendance_percentage
                FROM attendance
                WHERE register_no = ?
            `;


            const params = [
                register_no
            ];


            if (
                semester !== null
            ) {

                sql +=
                    ` AND semester = ?`;

                params.push(
                    semester
                );

            }


            if (
                internal !== null
            ) {

                sql +=
                    ` AND internal_exam = ?`;

                params.push(
                    internal
                );

            }


            sql += `
                ORDER BY
                    semester,
                    internal_exam,
                    subject
            `;


            const [attendance] =
                await db.query(
                    sql,
                    params
                );


            if (
                attendance.length === 0
            ) {

                let message =
                    "No attendance data found";


                if (
                    semester !== null
                ) {

                    message +=
                        ` for Semester ${semester}`;

                }


                if (
                    internal !== null
                ) {

                    message +=
                        ` Internal ${internal}`;

                }


                message += ".";


                return res.json({

                    success: true,

                    answer:
                        message

                });

            }


            const matchedAttendance =
                attendance.find(
                    row =>
                        subjectMatches(
                            q,
                            row.subject
                        )
                );


            if (
                matchedAttendance
            ) {

                return res.json({

                    success: true,

                    answer:
                        `${matchedAttendance.subject} attendance: ${matchedAttendance.attendance_percentage}%`

                });

            }


            let answer = "";


            if (
                semester !== null
            ) {

                answer +=
                    `Semester ${semester}`;

            } else {

                answer +=
                    "Your";

            }


            if (
                internal !== null
            ) {

                answer +=
                    ` - Internal ${internal}`;

            }


            answer +=
                " attendance:\n\n";


            attendance.forEach(
                (row, index) => {

                    answer +=
                        `${index + 1}. ${row.subject} - ${row.attendance_percentage}%\n`;

                }
            );


            return res.json({

                success: true,

                answer

            });

        }


        // =================================================
        // TIMETABLE QUESTION
        // =================================================

        const isTimetableQuestion =
            q.includes("timetable") ||
            q.includes("time table") ||
            q.includes("class schedule") ||
            q.includes("schedule");


        if (
            isTimetableQuestion
        ) {

            const semester =
                findSemester(q);


            if (
                semester === null
            ) {

                return res.json({

                    success: true,

                    answer:
                        "Please mention the semester. Example: Semester 1 timetable"

                });

            }


            const [timetables] =
                await db.query(
                    `SELECT
                        file_name,
                        file_type,
                        file_data,
                        uploaded_at
                     FROM timetables
                     WHERE class_name = ?
                     AND semester = ?
                     ORDER BY uploaded_at DESC
                     LIMIT 1`,
                    [
                        student.class_name,
                        semester
                    ]
                );


            if (
                timetables.length === 0
            ) {

                return res.json({

                    success: true,

                    answer:
                        `No timetable uploaded for ${student.class_name}, Semester ${semester}.`

                });

            }


            const timetable =
                timetables[0];


            return res.json({

                success: true,

                answer:
                    `Your ${student.class_name} Semester ${semester} timetable is available as "${timetable.file_name}". Please open the Timetable section to view it.`

            });

        }


        // =================================================
        // HELLO
        // =================================================

        if (
            q === "hi" ||
            q === "hello" ||
            q === "hey"
        ) {

            return res.json({

                success: true,

                answer:
                    "Hello! I am CampusAI. You can ask me about your marks, attendance, timetable, complaints, food court, library, events and announcements."

            });

        }


        // =================================================
        // FOOD COURT
        // =================================================

        if (
            q.includes("food") ||
            q.includes("canteen") ||
            q.includes("food court")
        ) {

            const [foods] =
                await db.query(
                    `SELECT
                        name,
                        price,
                        quantity
                     FROM food_items
                     ORDER BY name`
                );


            if (
                foods.length === 0
            ) {

                return res.json({

                    success: true,

                    answer:
                        "No food items are currently available."

                });

            }


            let answer =
                "Available food items:\n\n";


            foods.forEach(
                (food, index) => {

                    answer +=
                        `${index + 1}. ${food.name} - ₹${food.price} - ${food.quantity} available\n`;

                }
            );


            return res.json({

                success: true,

                answer

            });

        }


        // =================================================
        // LIBRARY
        // =================================================

        if (
            q.includes("library") ||
            q.includes("book")
        ) {

            const [books] =
                await db.query(
                    `SELECT
                        name,
                        book_count,
                        status
                     FROM library_books
                     ORDER BY name`
                );


            if (
                books.length === 0
            ) {

                return res.json({

                    success: true,

                    answer:
                        "No books are currently available."

                });

            }


            let answer =
                "Library books:\n\n";


            books.forEach(
                (book, index) => {

                    answer +=
                        `${index + 1}. ${book.name} - ${book.book_count} books - ${book.status}\n`;

                }
            );


            return res.json({

                success: true,

                answer

            });

        }


        // =================================================
        // EVENTS
        // =================================================

        if (
            q.includes("event")
        ) {

            const [events] =
                await db.query(
                    `SELECT
                        name,
                        event_date,
                        venue,
                        about
                     FROM events
                     ORDER BY event_date`
                );


            if (
                events.length === 0
            ) {

                return res.json({

                    success: true,

                    answer:
                        "No events are currently available."

                });

            }


            let answer =
                "Campus events:\n\n";


            events.forEach(
                (event, index) => {

                    answer +=
                        `${index + 1}. ${event.name} - ${event.event_date} - ${event.venue}\n`;


                    if (
                        event.about
                    ) {

                        answer +=
                            `   ${event.about}\n`;

                    }

                }
            );


            return res.json({

                success: true,

                answer

            });

        }


        // =================================================
        // ANNOUNCEMENTS
        // =================================================

        if (
            q.includes("announcement") ||
            q.includes("notice")
        ) {

            const [announcements] =
                await db.query(
                    `SELECT
                        announcement_text,
                        announcement_date
                     FROM announcements
                     ORDER BY announcement_date DESC`
                );


            if (
                announcements.length === 0
            ) {

                return res.json({

                    success: true,

                    answer:
                        "No announcements are currently available."

                });

            }


            let answer =
                "Campus announcements:\n\n";


            announcements.forEach(
                (item, index) => {

                    answer +=
                        `${index + 1}. ${item.announcement_text} - ${item.announcement_date}\n`;

                }
            );


            return res.json({

                success: true,

                answer

            });

        }


        // =================================================
        // DEFAULT RESPONSE
        // =================================================

        return res.json({

            success: true,

            answer:
                "I can help you with marks, attendance, timetable, complaints, food court, library, events and announcements. Please ask your question clearly."

        });


    } catch (error) {

        console.error(
            "CHAT ERROR:",
            error
        );

        res.status(500).json({

            success: false,

            answer:
                "Sorry, I could not process your question. Please try again."

        });

    }

});


// =====================================================
// START SERVER
// =====================================================

app.listen(5000, () => {

    console.log(
        "CampusAI backend running on http://localhost:5000"
    );

});