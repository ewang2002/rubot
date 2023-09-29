/**
 * An interface that represents a configuration file for this bot.
 */
export interface IConfiguration {
    isProd: boolean;
    discord: {
        token: string;
        clientId: string;
        botOwnerIds: string[];
    };
    ucsdInfo: {
        enrollDataOrgName: string;
        apiEndpoint: string;
        currentWebRegTerms: {
            term: string;
            termName: string;
        }[];
        githubTerms: {
            term: string;
            termName: string;
            repoName: string;
            overall: {
                reg: boolean;
                wide: boolean;
            };
            section: {
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