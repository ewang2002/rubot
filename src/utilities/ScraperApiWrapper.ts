import axios, { AxiosInstance } from "axios";
import { ISearchQuery, IWebRegSearchResult, PrerequisiteInfo, WebRegSection } from "../definitions";
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
}