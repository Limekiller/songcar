while true; do
    ARTIST="$(playerctl metadata --format '{{ artist }}')"
    SONG="$(playerctl metadata --format '{{ title }}')"
    ALBUM="$(playerctl metadata --format '{{ album }}')"

    curl --location --request POST 'http://localhost:3000/update' \
    --header 'Content-Type: application/json' \
    --data-raw "{
        \"song\": \"$SONG\",
        \"artist\": \"$ARTIST\",
        \"album\": \"$ALBUM\"
    }"

    sleep 5
done
