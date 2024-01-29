CREATE DATABASE rubot;

CREATE SCHEMA IF NOT EXISTS "rubot";

CREATE TABLE IF NOT EXISTS "rubot"."watch" (
    "user_id" text NOT NULL,
    "course" text NOT NULL,
    "channel_id" text NOT NULL,
    "previously_open" boolean NOT NULL
);

CREATE TABLE IF NOT EXISTS "rubot"."alert" (
    "id" SERIAL PRIMARY KEY,
    "user_id" text NOT NULL,
    "message" text NOT NULL,
    "alert_time" timestamp NOT NULL,
    "channel_id" text NOT NULL
);