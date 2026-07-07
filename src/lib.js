//const APP_URL = 'http://192.168.0.124:3000'
const APP_URL = 'http://localhost:3000'

/**
 * Given a list of recordings containing releases from MusicBrainz, return the oldest release, prioritizing albums
 * We also include some conditions to try to filter out the mountains of bad data included in this awful API
 * @param data {obj}: The object containing an array of recordings and releases
 * @return {obj}: The most fitting release we could find
 */
const getBestRelease = data => {
    if (!data.recordings || data.recordings.length == 0) {
        return false
    }

    // Remove releases without a date
    let releases = data.recordings[0].releases.filter(release => release.date !== undefined);

    // Order by oldest first
    releases = releases.sort((a, b) => new Date(a.date) - new Date(b.date))
    return releases[0]
}

/**
 * Given just a song title and artist name, attempt to get the name of the best release containing the song
 * @param title {str}: The song title
 * @param artist {str}: The artist name
 * @return {obj}: A release object from MusicBrainz
 */
const getAlbumFromSong_Artist = async (title, artist) => {
    artist = artist.replace('&', 'and');
    title = title.replace('&', 'and');
    let url = encodeURIComponent(`https://musicbrainz.org/ws/2/recording?query=artist:"${encodeURIComponent(artist)}" AND recording:"${encodeURIComponent(title)}" AND video:false AND (primarytype:album OR primarytype:single OR primarytype:EP) &fmt=json`)

    let mbResponse = await fetch(`${APP_URL}?url=${url}`)
    mbResponse = await mbResponse.json()

    const album = getBestRelease(mbResponse)
    return album
}

/**
 * Given metadata from a SiriusXM station (which only includes the name of the station),
 * Parse it and then use an API to get the currently playing song and artist. Album is not included (thanks, very cool!)
 * so we then use the above function to try to get the best release matching it
 * @param data {obj}: The playerctl metadata containing SXM info
 * @return {obj}: An object containing song information
 */
const parseSiriusXMData = async data => {
    const channelName = data.song.split(' · ')[1]
    let url = encodeURIComponent(`http://xmplaylist.com/api/station/${channelName.replace(/\W/g, '')}`)
    let sxmData = await fetch(`${APP_URL}?url=${url}`)
    sxmData = await sxmData.json()

    const sxmTitle = sxmData.results[0].track.title
    const sxmArtist = sxmData.results[0].track.artists[0]
    const sxmAlbum = await getAlbumFromSong_Artist(sxmTitle, sxmArtist)

    return {
        'artist': sxmArtist,
        'song': sxmTitle,
        'album': sxmAlbum?.title || '',
        'albumId': sxmAlbum?.id || ''
    }
}

/**
 * Given a metadata object, modify it (if necessary) to the correct data
 * @param {obj} metadata: The metadata object to parse
 * @return {obj}: The modified metadata object
 */
const parseMetadata = async metadata => {
    if (metadata.url.includes('siriusxm')) {
        //metadata = await parseSiriusXMData(metadata)
    }

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
            'album': album?.title || '',
            'albumId': album?.id || '',
            'url': url || '',
        }
    }

    return metadata
}

export default {
    APP_URL,
    parseSiriusXMData,
    getAlbumFromSong_Artist,
    getBestRelease,
    parseMetadata
}
