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
    subj_code: string;
    course_code: string;
    course_title: string;
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
    ttl_requests: number;
    ttl_time_ms: number;
}

export interface IInternalCourseData {
    location: string;
    startTime: number;
    endTime: number;
    day: string[];
    subjCourseId: string;
    meetingType: string;
    startHr: number;
    sectionFamily: string;
    startMin: number;
    endHr: number;
    endMin: number;
    instructor: string[];
}

export interface ISearchQuery {
    subjects: string[];
    courses: string[];
    departments: string[];
    instructor?: string;
    title?: string;
    only_allow_open: boolean;
    show_lower_div: boolean;
    show_upper_div: boolean;
    show_grad_div: boolean;
    start_min?: number;
    start_hr?: number;
    end_min?: number;
    end_hr?: number;
}
