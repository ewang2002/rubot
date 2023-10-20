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
    ucsdInfo: {
        enrollDataOrgName: string;
        apiBase: string;
        apiKey?: string;
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
    postgresInfo: {
        user: string;
        password: string;
        host: string;
        port: number;
        ssl: boolean,
        database: string;
    };
}


export interface ICategoryConf {
    categoryName: string;
}
