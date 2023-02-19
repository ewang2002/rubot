export interface IPlotInfo {
    fileName: string;
    fileUrl: string;
}

export interface ICapeRow {
    instructor: string;
    subjectCourse: string;
    courseName: string;
    term: string;
    enrollmentCount: number;
    evaluationsMade: number;
    recommendedClass: number;
    recommendedInstructor: number;
    studyHourWeek: number;
    averageGradeExp: number;
    averageGradeRec: number;
}

export interface WebRegSection {
    subj_course_id: string;
    section_id: string;
    section_code: string;
    all_instructors: string[];
    available_seats: number;
    enrolled_ct: number;
    total_seats: number;
    waitlist_ct: number;
    meetings: Meeting[];
    needs_waitlist: boolean;
    is_visible: boolean;
}

export interface IWebRegSearchResult {
    UNIT_TO: number;
    SUBJ_CODE: string;
    CRSE_TITLE: string;
    UNIT_FROM: number;
    CRSE_CODE: string;
}

export interface Meeting {
    meeting_type: string;
    meeting_days: string[] | string | null;
    start_hr: number;
    start_min: number;
    end_hr: number;
    end_min: number;
    building: string;
    room: string;
}

export interface ListedCourse {
    department: string;
    subjCourse: string;
    units: string;
    courseName: string;
    description: string;
}

export interface PrerequisiteInfo {
    course_prerequisites: CoursePrerequisite[][];
    exam_prerequisites: string[];
}

export interface CoursePrerequisite {
    subj_course_id: string;
    course_title: string;
}

export interface ScraperTimeStatInfo {
    recent_requests: number[];
    ttl_requests:    number;
    ttl_time_ms:     number;
}
