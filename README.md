# Smartlist

This is a client-side webapp that integrates with Home Assistant and the Google Vision API for making a shopping list.

It allows users to write down items for their list, and the handwriting is then interpreted into text and added to Home Assistant. I am deploying it on a Raspberry Pi w/ touchscreen running in the kitchen so I can write down things as I remember them, and they then get added to a persistent list.

Note that since this is entirely client-side, same origin policy (CORS) must be disabled in your browser. I run this in Chrome with the --disable-web-security flag.# songcar
