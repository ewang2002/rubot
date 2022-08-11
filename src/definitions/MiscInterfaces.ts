export interface IGitContent {
    name: string;
    path: string;
    size: number;
    download_url: string;
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
