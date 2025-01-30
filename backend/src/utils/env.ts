import dotenv from 'dotenv';
dotenv.config({ path: process.env.NODE_ENV=== 'production' ? undefined : '../.env' });

export const SLACK_PORT = process.env.SLACK_PORT || 4005;
export const API_PORT = process.env.API_PORT || 4006;
export const ENV = process.env.NODE_ENV || 'development';
export const IS_PRODUCTION = ENV === 'production';

export const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN || '';
export const SLACK_SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET || '';
export const SLACK_CLIENT_ID = process.env.SLACK_CLIENT_ID || '';
export const SLACK_CLIENT_SECRET = process.env.SLACK_CLIENT_SECRET || '';
export const SLACK_STATE_SECRET = process.env.SLACK_STATE_SECRET || '';