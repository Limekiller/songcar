#!/bin/bash

while true; do
    ARTIST="$(playerctl metadata --format '{{ artist }}')"
    SONG="$(playerctl metadata --format '{{ title }}')"
    ALBUM="$(playerctl metadata --format '{{ album }}')"

    JSON=$(jq -n --arg 'song' "$SONG" '$ARGS.named' --arg 'artist' "$ARTIST" '$ARGS.named' --arg 'album' "$ALBUM" '$ARGS.named')

    #curl --location --request POST 'http://192.168.0.179:3000/update' \
    curl --location --request POST 'http://localhost:3000/update' \
    --header 'Content-Type: application/json' \
    --data-raw "$JSON"

    sleep 5
done
