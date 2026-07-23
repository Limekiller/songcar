// const APP_URL = 'http://192.168.0.124:3000'
const APP_URL = 'http://localhost:3000'

/**
 * Given just a song title and artist name, attempt to get the name of the best release containing the song
 * @param title {str}: The song title
 * @param artist {str}: The artist name
 * @return {obj}: A release object from MusicBrainz
 */
const getAlbumFromSong_Artist = async (title, artist) => {
    artist = artist.replace('&', 'and');
    title = title.replace('&', 'and');
    let url = encodeURIComponent(`https://itunes.apple.com/search?term=${artist} ${title}&entity=song&limit=1`)

    let data = await fetch(`${APP_URL}?url=${url}`, { signal: AbortSignal.timeout(10000) })
    data = await data.json()

    if (data.results.length > 0 && data.results[0].collectionId) {
        url = encodeURIComponent(`https://itunes.apple.com/lookup?id=${data.results[0].collectionId}`)
        data = await fetch(`${APP_URL}?url=${url}`, { signal: AbortSignal.timeout(10000) })
        data = await data.json()

        if (data.results.length > 0) {
            return data.results[0]
        }
    }

    return false
}

/**
 * Given a metadata object, modify it (if necessary) to the correct data
 * @param {obj} metadata: The metadata object to parse
 * @return {obj}: The modified metadata object
 */
const parseMetadata = async metadata => {
    if (!metadata.album) {
        let url = metadata.url
        let song = metadata.song
        let artist = metadata.artist
        let album = null

        // Some metadata just includes the song and artist in the title field like "Song - Artist"
        // If that's the case--the artist is blank and the title includes " - "--attempt to parse it
        if (!artist && song.includes(' - ')) {
            song = metadata.song.split(' - ')[1]
            artist = metadata.song.split(' - ')[0]
        }
        if ((!song && artist.includes(' - ')) || metadata.url.includes('siriusxm')) {
            song = metadata.artist.split(' - ')[1]
            artist = metadata.artist.split(' - ')[0]
        }

        album = await getAlbumFromSong_Artist(song, artist)
        metadata = {
            'song': song,
            'artist': artist,
            'album': album?.collectionName || '',
            'albumId': album?.collectionId || '',
            'url': url || '',
        }
    }

    return metadata
}

export default {
    APP_URL,
    getAlbumFromSong_Artist,
    parseMetadata
}
