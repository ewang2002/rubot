export namespace GeneralConstants {
    export const ZERO_WIDTH_SPACE: string = "\u200b";
    export const PERMITTED_SERVER_IDS: string[] = ["778738941443440640", "533476850421202944"];
    export const CONFIG_JS_FILE: string = "_.js";
    export const DAYS_OF_WEEK: string[] = ["Su", "M", "Tu", "W", "Th", "F", "Sa"];
}

export namespace UCSDConstants {
    /**
     * Duration of the final exam, in milliseconds.
     */
    export const FINAL_DURATION_TO_MS: number = 179 * 60 * 1000;

    // Scraped from https://registrar.ucsd.edu/StudentLink/bldg_codes.html
    // Using the scuffed script https://gist.github.com/ewang2002/129c20480273a9e86b683b06d4c0ec8a.
    export const BUILDING_CODES: { [code: string]: string } = {
        APM: "Applied Physics & Mathematics Building (Muir)",
        ASANT: "Asante Hall (Eleanor Roosevelt)",
        BIO: "Biology Building (Muir)",
        BIRCH: "Birch Aquarium (SIO)",
        BONN: "Bonner Hall (Revelle)",
        BSB: "Basic Science Building (Medical School)",
        CCC: "Cross-Cultural Center (University Center)",
        CENTR: "Center Hall (University Center)",
        CICC: "Copely International Conference Center (Eleanor Roosevelt)",
        CLICS: "Center for Library & Instructional Computing Services (Revelle)",
        CLIN: "Clinical Sciences Building (Medical School)",
        CMG: "Center for Molecular Genetics (Medical School)",
        CMME: "Center for Molecular Medicine East (Medical School)",
        CMMW: "Center for Molecular Medicine West (Medical School)",
        CMRR: "Center for Magnetic Recording Research (Warren)",
        CNCB: "Center for Neural Circuits and Behavior (Medical School)",
        CRB: "Chemistry Research Building (Thurgood Marshall)",
        CPMC: "Conrad Presbys Music Center (University Center)",
        CSB: "Cognitive Science Building (Thurgood Marshall)",
        CTL: "Catalyst (North Torrey Pines Living Learning Neighborhood)",
        DANCE: "Wagner Dance Facility (Revelle)",
        DIB: "Design and Innovation Building (Warren )",
        DSD: "Deep Sea Drilling Building (SIO)",
        EBU1: "Engineering Building Unit 1 (Warren)",
        EBU2: "Engineering Building Unit 2 (Warren)",
        EBU3B: "Engineering Building Unit 3 (Warren)",
        ECKRT: "SIO Library, Eckart Building (SIO)",
        ECON: "Economics Building (Thurgood Marshall)",
        ERCA: "Eleanor Roosevelt College Administration (Eleanor Roosevelt)",
        FORUM: "Mandell Weiss Forum (Revelle)",
        GA: "General Academic NTPLL (North Torrey Pines Living Learning Neighborhood)",
        GEISL: "Geisel Library (University Center)",
        GH: "Galbraith Hall (Revelle)",
        HSS: "Humanities & Social Sciences Building (Muir)",
        HUBBS: "Hubbs Hall (SIO)",
        IGPP: "Institute of Geophysics & Planetary Physics (SIO)",
        IOA: "Institute of the Americas (Eleanor Roosevelt)",
        JEANN: "The Jeannie  (North Torrey Pines Living Learning Neighborhood )",
        KECK: "W.M. Keck Building (fMRI) (Medical School)",
        LASB: "Latin American Studies Building (Eleanor Roosevelt)",
        "LEDDN AUD": "Patrick J. Ledden Auditorium (formerly HSS 2250) (Muir)",
        LFFB: "Leichtag Family Foundation Biomedical Research Building (Medical School)",
        LIT: "Literature Building (Warren)",
        MANDE: "Mandeville Center (Muir)",
        MAYER: "Mayer Hall (Revelle)",
        MCC: "Media Center/Communication Building (Thurgood Marshall)",
        MCGIL: "William J. McGill Hall (Muir)",
        MET: "Medical Education and Telemedicine (Medical School)",
        MNDLR: "Mandler Hall (formerly McGill Hall Annex) (Muir)",
        MOS: "Mosaic (North Torrey Pines Living Learning Neighborhood)",
        MTF: "Medical Teaching Facility (Medical School)",
        MWEIS: "Mandell Weiss Center (Revelle)",
        "MYR-A": "Mayer Hall Addition (Revelle)",
        NIERN: "Nierenberg Hall (SIO)",
        NSB: "Natural Sciences Building (Revelle)",
        NTV: "Nierenberg Hall Annex (SIO)",
        OAR: "Ocean & Atmospheric Res Bldg (SIO)",
        OFF: "Off Campus (Off Campus)",
        OTRSN: "Otterson Hall (Eleanor Roosevelt)",
        P416: "P416 Outdoor Classroom (University Center)",
        PACIF: "Pacific Hall (Revelle)",
        PCYNH: "Pepper Canyon Hall (University Center)",
        PETER: "Peterson Hall (Thurgood Marshall)",
        PFBH: "Powell-Focht Bioengineering Hall (Warren)",
        POTKR: "Potiker Theatre (Revelle)",
        PRICE: "Price Center (University Center)",
        RBC: "Robinson Building Complex (Eleanor Roosevelt)",
        RECGM: "Recreation Gym (Muir)",
        REV: "Revelle Plaza Outdoor Classroom (Revelle)",
        RITTR: "Ritter Hall (SIO)",
        RVCOM: "Revelle Commons (Revelle)",
        RVPRO: "Revelle College Provost Building (Revelle)",
        RWAC: "Ridge Walk Academic Complex (North Torrey Pines Living Learning Neighborhood)",
        SCHOL: "Scholander Hall (SIO)",
        SCRB: "Stein Clinical Research Building (Medical School)",
        SCRPS: "Scripps Building (SIO)",
        SDSC: "San Diego Supercomputer Center (Eleanor Roosevelt)",
        SEQUO: "Sequoyah Hall (Thurgood Marshall)",
        SERF: "Science & Engineering Research Facility (University Center)",
        SME: "Structural & Materials Science Engineering Building (Sixth)",
        SOLIS: "Faustina Solis Lecture Hall (Thurgood Marshall)",
        SPIES: "Fred N. Spies Hall (SIO)",
        SSB: "Social Sciences Building (Eleanor Roosevelt)",
        SSC: "Student Services Center (University Center)",
        SVERD: "Sverdrup Hall (SIO)",
        TBA: "To Be Arranged (N/A)",
        TM102: "Thurgood Marshall College 102 (Thurgood Marshall)",
        TMCA: "Thurgood Marshall College Administration Building (Thurgood Marshall)",
        U201: "University Center, Building 201 (University Center)",
        U303: "Cancer Research Facility (University Center)",
        U409: "University Center, Building 409 (University Center)",
        U413: "University Center, Building 413 (University Center)",
        U413A: "University Center, Building 413A (University Center)",
        U515: "University Center, Building 515 (formerly R515) (University Center)",
        U516: "University Center, Building 516 (formerly R516) (University Center)",
        U517: "University Center, Building 517 (formerly R517) (University Center)",
        U518: "University Center, Building 518 (formerly R518) (University Center)",
        UNEX: "University Extension Complex (Marshall)",
        UREY: "Urey Hall (Revelle)",
        "URY-A": "Urey Hall Annex (Revelle)",
        VAF: "Visual Arts Facility (formerly VIS) (Sixth)",
        VAUGN: "Vaughan Hall (SIO)",
        WARR: "Warren Mall Outdoor Classroom (Warren)",
        WFH: "Wells Fargo Hall (Eleanor Roosevelt)",
        WLH: "Warren Lecture Hall (Warren)",
        YORK: "Herbert F. York Undergraduate Sciences Building (Revelle)",
    };
}

export namespace RegexConstants {
    export const ONLY_DIGITS_REGEX: RegExp = /^\d+$/;
}

export namespace EmojiConstants {
    export const UPSIDE_DOWN_EMOJI: string = "🙃";
    export const LOCK_EMOJI: string = "🔒";
    export const MINUS_EMOJI: string = "➖";
    export const PLUS_EMOJI: string = "➕";
    export const LONG_SIDEWAYS_ARROW_EMOJI: string = "↔️";
    export const X_EMOJI: string = "❌";
    export const RED_SQUARE_EMOJI: string = "🟥";
    export const GREEN_SQUARE_EMOJI: string = "🟩";
    export const WHITE_SQUARE_EMOJI: string = "⬜";
    export const BLACK_SQUARE_EMOJI: string = "⬛";
    export const YELLOW_SQUARE_EMOJI: string = "🟨";
    export const GREEN_CHECK_EMOJI: string = "✅";
    export const HOURGLASS_EMOJI: string = "⌛";
    export const RIGHT_TRIANGLE_EMOJI: string = "▶️";
    export const UP_TRIANGLE_EMOJI: string = "🔼";
    export const DOWN_TRIANGLE_EMOJI: string = "🔽";
    export const LONG_LEFT_ARROW_EMOJI: string = "⬅";
    export const LONG_RIGHT_TRIANGLE_EMOJI: string = "➡";
    export const STOP_SIGN_EMOJI: string = "🛑";
    export const WARNING_EMOJI: string = "⚠️";
    export const QUESTION_MARK_EMOJI: string = "❓";
    export const GHOST_EMOJI: string = "👻";
    export const EYE_EMOJI: string = "👁️";

    export const LONG_UP_ARROW_EMOJI: string = "⬆️";
    export const LONG_DOWN_ARROW_EMOJI: string = "⬇️";
    export const ARROW_HEADING_UP_EMOJI: string = "⤴️";
    export const ARROW_HEADING_DOWN_EMOJI: string = "⤵️";
    export const COUNTERCLOCKWISE_EMOJI: string = "🔄";
    export const INBOX_EMOJI: string = "📥";
    export const OUTBOX_EMOJI: string = "📤";

    export const DATE_EMOJI: string = "📅";
    export const TIME_EMOJI: string = "🕰️";
}
