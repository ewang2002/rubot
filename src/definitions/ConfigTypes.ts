/**
 * An interface that represents a configuration file for this bot.
 */
export interface IConfiguration {
    discord: {
        token: string;
        clientId: string;
        botOwnerIds: string[];
        debugGuildIds: string[];
    };
    ucsdInfo: IApiInfo & {
        enrollDataOrgName: string;
        currentWebRegTerms: {
            term: string;
            termName: string;
            apiOverride?: IApiInfo;
        }[];
        githubTerms: {
            term: string;
            termName: string;
            repoName: string;
            overall: {
                reg: boolean;
                wide: boolean;
            };
        }[];
        miscData: {
            capeData: {
                fileName: string;
                lastUpdated: string;
            };
            courseList: {
                fileName: string;
                lastUpdated: string;
            };
            currentTermData: {
                fileName: string;
                term: string;
            };
        };
    };
}


export interface ICategoryConf {
    categoryName: string;
}

export interface IApiInfo {
    apiBase: string;
    apiKey: string;
}
