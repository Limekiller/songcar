#!/bin/bash

while true; do
    ARTIST="$(playerctl metadata --format '{{ artist }}')"
    SONG="$(playerctl metadata --format '{{ title }}')"
    ALBUM="$(playerctl metadata --format '{{ album }}')"
    URL="$(playerctl metadata --format '{{ xesam:url }}')"

    JSON=$(jq -n --arg 'song' "$SONG" '$ARGS.named' --arg 'artist' "$ARTIST" '$ARGS.named' --arg 'album' "$ALBUM" '$ARGS.named' --arg 'url' "$URL" '$ARGS.named')

    #curl --location --request POST 'http://localhost:3000/update' \
    curl --location --request POST 'http://192.168.0.124:3000/update' \
    --header 'Content-Type: application/json' \
    --data-raw "$JSON"

    sleep 5
done
