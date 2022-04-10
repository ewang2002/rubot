/**
 * An interface that represents a configuration file for this bot.
 */
export interface IConfiguration {
    /**
     * Relevanat tokens.
     *
     * @type {object}
     */
    token: {
        /**
         * The bot's token.
         *
         * @type {string}
         */
        botToken: string;

        /**
         * The Github token.
         *
         * @type {string}
         */
        githubAuthToken: string;
    };

    /**
     * The bot's client ID.
     *
     * @type {string}
     */
    clientId: string;

    /**
     * Whether this is production.
     *
     * @type {boolean}
     */
    isProd: boolean;

    /**
     * The bot owners.
     *
     * @type {string[]}
     */
    botOwnerIds: string[];

    /**
     * Repository to the enrollment data.
     *
     * @type {object}
     */
    enrollData: {
        /**
         * The repository's owner.
         *
         * @type {string}
         */
        repoOwner: string;

        /**
         * The repository name.
         *
         * @type {string}
         */
        repoName: string;
    }
}