/**
 * An interface that represents a configuration file for this bot.
 */
export interface IConfiguration {
    /**
     * Whether the configuration file is for production.
     *
     * @type {boolean}
     */
    isProd: boolean;

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


        /**
         * The MTS token.
         * 
         * @type {string}
         */
        mtsToken: string;
    };

    /**
     * The bot's client ID.
     *
     * @type {string}
     */
    clientId: string;

    /**
     * The bot owners.
     *
     * @type {string[]}
     */
    botOwnerIds: string[];

    /**
     * The organization containing all enrollment data repositories.
     *
     * @type {string}
     */
    enrollDataOrgName: string;

    /**
     * Various channel IDs to keep note of.
     *
     * @type {object}
     */
    channels: {
        /**
         * A channel where the bot should be keeping track of potential images to be used as the bot's profile picture.
         *
         * @type {string}
         */
        galleryChannel: string;

        /**
         * The category where the bot should keep track of courses.
         *
         * @type {string}
         */
        webregCategory: string;
    }
}