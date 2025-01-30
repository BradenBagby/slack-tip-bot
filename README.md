# Slack Tip Bot

A Slack bot that enables easy tipping between workspace members, created during a WAVV Fedex Day - where we spend one day to create and ship a product.

## Features

- Easy-to-use `/tip` command to send tips to workspace members
- Quick-select tip amounts ($1, $5, $10)
- QR code generation for payment links
- Simple configuration through `/tip configure` command
- Support for both channel messages and direct messages

## Setup Requirements

- Node.js 18+
- PostgreSQL database
- Slack App credentials
- Docker (optional)

## Environment Variables
POSTGRES_USER=
POSTGRES_PASSWORD=
POSTGRES_DB=main
DATABASE_URL=
HOST=
ENV=development
SLACK_PORT=4005
API_PORT=4006
SLACK_SIGNING_SECRET=
SLACK_CLIENT_ID=
SLACK_CLIENT_SECRET=
SLACK_STATE_SECRET=

## Usage

1. Install the bot to your Slack workspace visiting slacktipbot.bradenbagby.com
2. Configure your payment URL using `/tip configure`
3. Start tipping! Use `/tip` in any channel or DM

---
Created during WAVV Fedex Day - From concept to production in 24 hours.