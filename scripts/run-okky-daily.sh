#!/bin/bash
cd "$(dirname "$0")/.."

export OLLAMA_MODEL="llama3.2:3b"
export OKKY_MAX_PAGES="40"
export OKKY_MAX_POSTS="50"

node scripts/okky-analyze.mjs "https://okky.kr/users/199819/articles"
