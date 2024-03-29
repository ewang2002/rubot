import axios, { AxiosInstance } from "axios";
import { ISearchQuery, IWebRegSearchResult, PrerequisiteInfo, ScraperTimeStatInfo, WebRegSection } from "../definitions";
import { GeneralUtilities } from "./GeneralUtilities";

export type ScraperResponse<T> = T | { error: string; } | null;

export class ScraperApiWrapper {
    private static _instance: ScraperApiWrapper | null = null;

    private _apiBase: string;
    private _apiKey?: string;
    private _axios: AxiosInstance;

    private constructor() {
        this._apiBase = "";
        this._apiKey = "";
        this._axios = axios.create();
    }

    /**
     * Gets or creates an instance of this wrapper.
     *
     * @returns {ScraperApiWrapper} The instance.
     */
    public static getInstance(): ScraperApiWrapper {
        if (ScraperApiWrapper._instance === null) {
            ScraperApiWrapper._instance = new ScraperApiWrapper();
        }

        return ScraperApiWrapper._instance;
    }

    /**
     * Initializes the information needed to make calls to the API.
     *
     * @param {string} apiBase The base URL for the API.
     * @param {string} apiKey The API key, if any.
     * @throws {Error} If this function is called before initialization.
     */
    public static init(apiBase: string, apiKey?: string): void {
        if (ScraperApiWrapper._instance === null) {
            throw new Error("this should be initialized before being used.");
        }
        else {
            ScraperApiWrapper._instance._apiBase = apiBase;
            ScraperApiWrapper._instance._apiKey = apiKey;
        }
    }

    /**
     * Gets prerequisite information for a course.
     * 
     * @param {string} term The term.
     * @param {string} subject The subject part of the course number (e.g., for `CSE 100`, use `CSE`)
     * @param {string} number The number part of the course number (e.g., for `CSE 100`, use `100`)
     * @returns {Promise<ScraperResponse<PrerequisiteInfo>>} The prerequisite information, if any. Some 
     * other options include an object with an error key or `null`.
     */
    public async getPrerequisites(
        term: string,
        subject: string,
        number: string
    ): Promise<ScraperResponse<PrerequisiteInfo>> {
        return GeneralUtilities.tryExecuteAsync<PrerequisiteInfo>(async () => {
            return this._axios.get(
                `${this._apiBase}/live/${term}/prerequisites?subject=${subject}&number=${number}`,
                {
                    headers: {
                        Authorization: `Bearer ${this._apiKey}`
                    }
                }
            ).then(r => r.data);
        });
    }

    /**
     * Gets basic course information from WebReg.
     * 
     * @param {string} term The term.
     * @param {string} subject The subject part of the course number (e.g., for `CSE 100`, use `CSE`)
     * @param {string} number The number part of the course number (e.g., for `CSE 100`, use `100`)
     * @returns {Promise<ScraperResponse<WebRegSection[]>>} Information about all sections for a course, 
     * if any. Some other options include an object with an error key or `null`.
     */
    public async getCourseInfo(
        term: string,
        subject: string,
        number: string
    ): Promise<ScraperResponse<WebRegSection[]>> {
        return GeneralUtilities.tryExecuteAsync<WebRegSection[]>(async () => {
            return this._axios.get(
                `${this._apiBase}/live/${term}/course_info?subject=${subject}&number=${number}`,
                {
                    headers: {
                        Authorization: `Bearer ${this._apiKey}`
                    }
                }
            ).then(r => r.data);
        });
    }

    /**
     * Searches for one or more courses on WebReg based on a number of different factors.
     * 
     * @param {string} term The term.
     * @param {ISearchQuery} query The search query.
     * @returns {Promise<ScraperResponse<IWebRegSearchResult[]>>} All possible courses that meet the
     * query. Some other options include an object with an error key or `null`.
     */
    public async searchCourse(
        term: string,
        query: ISearchQuery
    ): Promise<ScraperResponse<IWebRegSearchResult[]>> {
        return GeneralUtilities.tryExecuteAsync<IWebRegSearchResult[]>(async () => {
            return this._axios.get(
                `${this._apiBase}/live/${term}/search`,
                {
                    headers: {
                        Authorization: `Bearer ${this._apiKey}`
                    },
                    data: query
                }
            ).then(r => r.data);
        });
    }

    /**
     * Gets the time when the login script first started.
     * 
     * @returns {Promise<ScraperResponse<number>>} The login time, if any. Some 
     * other options include an object with an error key or `null`.
     */
    public async getLoginScriptStartTime(): Promise<ScraperResponse<number>> {
        return GeneralUtilities.tryExecuteAsync<number>(async () => {
            return this._axios.get(
                `${this._apiBase}/login_stat/start`,
                {
                    headers: {
                        Authorization: `Bearer ${this._apiKey}`
                    }
                }
            ).then(r => r.data);
        });
    }

    /**
     * Gets all times when the login script was used to get new cookies.
     * 
     * @returns {Promise<ScraperResponse<number[]>>} An array of numbers, where 
     * each number represents the unix time (in milliseconds) when the login
     * script was called to get new cookies. Some other options include an 
     * object with an error key or `null`.
     */
    public async getLoginScriptLoginHistory(): Promise<ScraperResponse<number[]>> {
        return GeneralUtilities.tryExecuteAsync<number[]>(async () => {
            return this._axios.get(
                `${this._apiBase}/login_stat/history`,
                {
                    headers: {
                        Authorization: `Bearer ${this._apiKey}`
                    }
                }
            ).then(r => r.data);
        });
    }

    /**
     * Gets the stats for requests made for a specified term.
     * 
     * @param {string} term The term to get stats for.
     * @returns {Promise<ScraperResponse<ScraperTimeStatInfo>>} The request stats for
     * the specified term. Some other options include an object with an error key or `null`.
     */
    public async getRequestStatsForTerm(term: string): Promise<ScraperResponse<ScraperTimeStatInfo>> {
        return GeneralUtilities.tryExecuteAsync<ScraperTimeStatInfo>(async () => {
            return this._axios.get(
                `${this._apiBase}/timing/${term}`,
                {
                    headers: {
                        Authorization: `Bearer ${this._apiKey}`
                    }
                }
            ).then(r => r.data);
        });
    }
}
