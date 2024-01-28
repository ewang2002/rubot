CREATE DATABASE rubot;

CREATE SCHEMA IF NOT EXISTS "roobot";

CREATE TABLE IF NOT EXISTS "roobot"."watch" (
    "user_id" text NOT NULL,
    "course" text NOT NULL,
    "channel_id" text NOT NULL,
    "previously_open" boolean NOT NULL
);

CREATE TABLE IF NOT EXISTS "roobot"."alert" (
    "id" SERIAL PRIMARY KEY,
    "user_id" text NOT NULL,
    "message" text NOT NULL,
    "alert_time" timestamp NOT NULL,
    "channel_id" text NOT NULL
);