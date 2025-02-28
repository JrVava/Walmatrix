import dotenv from 'dotenv';
dotenv.config();
export const config = {
    port: +process.env.PORT,
    env: process.env.ENV,
    databases: {
        host: process.env.DB_HOST,
        port: +process.env.DB_PORT,
        username: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        database: process.env.DATABASE,
    },
    hash: {
        secret_key: process.env.SECRET_KEY,
        secret_iv: process.env.SECRET_IV,
        ecnryption_method: process.env.ECNRYPTION_METHOD,
    },
    wallmart: {
        baseURL: process.env.WALLMART_BASE_URL,
        clientId: process.env.WALLMART_CLIENT_ID,
        clientSecret: process.env.WALLMART_SECRET_ID,
        AdsBaseURL: process.env.AD_API_URL,
        consumerID: process.env.CONSUMER_ID,
        authToken: process.env.AUTH_TOKEN,
        keyVersion: '1',
    },
    jwtSecret: process.env.JWT_SECRET,
    frontend_url: process.env.FRONTEND_URL,
    sendgrid: {
        sendgrid_key: process.env.SENDGRID_API_KEY,
        sendgrid_from: process.env.SENDGRID_FROM,
    },
    userTypes: [2, 4], // 2-Seller and 4-seller users
    company_name: process.env.COMPANY_NAME,
    googleClientId: process.env.GOOGLE_OAUTH_CLIENT_ID,
    googleClientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    googleOauthRedirect: process.env.GOOGLE_OAUTH_REDIRECT_URL,
    mailtemplate: {
        welcomemail: 'd-1368ee6cb9134395a05fb50e8b5e9e52',
        accverifymail: 'd-2d405782196d422588b44298b4326792',
        subscriptionmail: 'd-5ca19e15f0944423a7373953ed578735',
        paymentfailmail: 'd-9962c50bb89848c69d928d36c3f85883',
        paymentfailmailadmin: 'd-88166e7f42b246939d8b9666d3b53e66',
    },
    advertiserCredentials: {
        user_id: process.env.ADVERTISER_USER_ID,
        password: process.env.ADVERTISER_PASSWORD,
    },
    wallmartHeder: {
        svcName: process.env.WM_SVC_NAME,
        consumerChannelType: process.env.WM_CONSUMER_CHANNEL_TYPE,
    },
    aws: {
        region: process.env.S3_REGION,
        accessKey: process.env.S3_ACCESS_KEY,
        secretKey: process.env.S3_SECRET_KEY,
        bucket: process.env.S3_BUCKET,
    },
    redis: {
        host: process.env.REDIST_HOST,
        port: +process.env.REDIS_PORT,
    },
    stripe: {
        SECRET_KEY: process.env.STRIPE_SECRET_KEY,
        PUBLISHED_KEY: process.env.STRIPE_PUBLISHED_KEY,
        WEBHOOK_KEY: process.env.STRIPE_WEBHOOK_KEY,
        CURRENCY: 'usd',
        SUBSCRIPTIONMODE: 'subscription',
        COUPON: 'JkbcFKtf',
    },
};
