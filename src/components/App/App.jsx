import React, { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from "motion/react"
import styles from './App.module.scss'

const App = () => {
    const [metadata, setmetadata] = useState({
        'artist': '',
        'song': '',
        'album': '',
        'url': '',
        'refetch': true
    })
    const [albumArt, setalbumArt] = useState(false)

    const metadataRef = useRef(metadata)
    metadataRef.current = metadata;

    /**
     * Given a list of recordings containing releases from MusicBrainz, return the oldest release, prioritizing albums
     * We also include some conditions to try to filter out the mountains of bad data included in this awful API
     * @param data {obj}: The object containing an array of recordings and releases
     * @return {obj}: The most fitting release we could find
     */
    const getBestRelease = (data, artist) => {
        let returnRelease
        let oldestReleaseDate = new Date()

        // If there's only one recording and release, just return it right away
        if (data.recordings.length === 1 && data.recordings[0].releases.length === 1) {
            return data.recordings[0].releases[0]
        }

        for (let recording of data.recordings) {
            if (recording.disambiguation) {
                continue
            }
            for (let release of recording.releases) {
                if (release.disambiguation) {
                    continue;
                }

                // If our current best choice is an Album, and the current one we're looking at isn't, ignore it
                let isNotAlbumAndCurrentIsAlbum = false
                if (returnRelease && returnRelease['release-group']) {
                    if (returnRelease['release-group']['primary-type'] === 'Album' && release['release-group']['primary-type'] !== 'Album') {
                        isNotAlbumAndCurrentIsAlbum = true
                    }
                }

                // Ignore compilations, releases without the full date, and live albums
                const hasPartialData = release['date'] && release['date'].length < 10
                const isCompOrLive = release['release-group']['secondary-types'] &&
                    (release['release-group']['secondary-types'].includes('Compilation') ||
                    release['release-group']['secondary-types'].includes('Live')) ? true : false;
                if (isCompOrLive) {
                    continue;
                }

                // If the current release has an artist-credit property, and it isn't the artist we want, ignore it
                let isCorrectArtist = true
                //isCorrectArtist = release['artist-credit'] && release['artist-credit'][0]['name'].toLowerCase() !== artist.toLowerCase() ? false : true

                if (returnRelease && (hasPartialData || !isCorrectArtist || isNotAlbumAndCurrentIsAlbum)) {
                    continue
                }

                // If we made it through all that, this is a pretty good candidate. Switch to it if it's older than the one we're currently looking at.
                const recordingReleaseDate = new Date(release['date'])
                if (recordingReleaseDate < oldestReleaseDate) {
                    oldestReleaseDate = recordingReleaseDate
                    returnRelease = release
                }
            }
        }

        return returnRelease
    }

    /**
     * Given just a song title and artist name, attempt to get the name of the best release containing the song
     * @param title {str}: The song title
     * @param artist {str}: The artist name
     * @return {obj}: A release object from MusicBrainz
     */
    const getAlbumFromSong_Artist = async (title, artist) => {
        let url = encodeURIComponent(`https://musicbrainz.org/ws/2/recording?query=artist:"${encodeURIComponent(artist)}" AND recording:"${encodeURIComponent(title)}" AND video:false AND (primarytype:album OR primarytype:single OR primarytype:EP) &fmt=json`)
        let mbResponse = await fetch(`http://localhost:3000?url=${url}`)
        mbResponse = await mbResponse.json()
        const album = getBestRelease(mbResponse, artist)
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
        let sxmData = await fetch(`http://localhost:3000?url=${url}`)
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
     * Given a MusicBrainz album ID, we fetch the corresponding album art and then set it
     * @param {str} albumId: The ID of the album
     */
    const loadAndSetAlbumArt = async albumId => {
        if (albumId) {
            // Load the cover in the browser via fetch before setting it so that it appears to load right away
            const albumResp = await fetch(`https://coverartarchive.org/release/${albumId}/front-500`)
            if (albumResp.status === 200) {
                setalbumArt(`https://coverartarchive.org/release/${albumId}/front-500`)
                return
            }
        }

        setalbumArt(false)
    }

    /**
     * Pull the playing metadata from the Python server and parse it as necessary
     */
    const updateMetadata = async () => {
        let currentMetadata = await fetch(`http://localhost:3000/metadata`)
        currentMetadata = await currentMetadata.json()

        if (!currentMetadata.song || currentMetadata.song === "") {
            return
        }

        currentMetadata = {...currentMetadata, 'refetch': true}
        let specialCase = false
        if (currentMetadata.url.includes('siriusxm')) {
            currentMetadata = await parseSiriusXMData(currentMetadata)
            specialCase = true
        }

        // Some metadata just includes the song and artist in the title field like "Song - Artist"
        // If that's the case--the artist is blank and the title includes " - "--attempt to parse it
        if (!currentMetadata.artist && !currentMetadata.album && currentMetadata.song.includes(' - ')) {
            let song = currentMetadata.song.split(' - ')[1]
            let artist = currentMetadata.song.split(' - ')[0]
            let album = await getAlbumFromSong_Artist(song, artist)
            let url = currentMetadata.url
            currentMetadata = {
                'song': song,
                'artist': artist,
                'album': album?.title || '',
                'albumId': album?.id || '',
                'url': url || '',
            }
            specialCase = true
        }

        // If the album has changed, fetch new art
        if (currentMetadata.album !== metadataRef.current.album && specialCase) {
            loadAndSetAlbumArt(currentMetadata.albumId)
            currentMetadata = {...currentMetadata, 'refetch': false}
        }

        setmetadata(currentMetadata)
    }

    // Fetch metadata from the server every second
    useEffect(() => {
        const songCheckInterval = setInterval(() => {
            updateMetadata()
        }, 1000)

        return () => {
            clearInterval(songCheckInterval)
        }
    }, [])

    // When the album changes, attempt to fetch album art
    useEffect(() => {
        /**
         * Use the currently set album to try to fetch its art from MusicBrains
         */
        const getAlbumArt = async () => {
            if (!metadataRef.current.song) {
                return
            }

            let url = encodeURIComponent(`https://musicbrainz.org/ws/2/release?query=artist:"${encodeURIComponent(metadata['artist'])}" AND release:"${encodeURIComponent(metadata['album'])}" AND status:official AND (primarytype:album OR primarytype:single OR primarytype:EP) &fmt=json`)
            let albumInfo = await fetch(`http://localhost:3000?url=${url}`)
            albumInfo = await albumInfo.json()
            albumInfo = getBestRelease({recordings: [albumInfo]}, metadata['artist'])
            if (albumInfo && albumInfo.id) {
                loadAndSetAlbumArt(albumInfo.id)
            } else {
                setalbumArt(false)
            }
        }

        if (metadata.refetch) {
            getAlbumArt()
        }
    }, [metadata.album])

    const animatedLabel = (innerJSX, key) => { return (
        <motion.div
            layout
            className={styles.animatedLabel}
            key={key}
            initial={{ opacity: 0 }}
            animate={{
                opacity: 1,
                transition: {
                    duration: 0.5,
                    delay: 0.5
                }
            }}
            exit={{
                opacity: 0,
                transition: {
                    duration: 0.5,
                }
            }}
        >
            {innerJSX}
        </motion.div>
    )}

    return <div className={styles.App}>
        <>
            <AnimatePresence>
                <motion.img
                    className={styles.bg}
                    src={albumArt || 'https://coverartarchive.org/release/986b2849-60e1-40bb-b57d-1d0bf10e8873/front-500'}
                    key={albumArt}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1, transition: { delay: 2, duration: 5 }}}
                    exit={{ opacity: 0, transition: { delay: 10, duration: 0.5 }}}
                />
            </AnimatePresence>
            {albumArt ?
                <AnimatePresence mode="wait">
                        <motion.img
                            src={albumArt || ''}
                            key={albumArt}
                            style={{
                                width: "66%",
                                objectFit: "cover",
                                boxShadow: "0px 0px 10rem white"
                            }}
                            initial={{ opacity: 0, x: '-1rem' }}
                            animate={{ opacity: 1, x: 0, transition: { delay: 5, duration: 0.5 }}}
                            exit={{opacity: 0, x: '-1rem', transition: { duration: 0.5 }}}
                        />
                </AnimatePresence>
            : ""}
        </>

        {metadata.song ?
            <div className={`${styles.albumData} ${!albumArt ? styles.centered : ''}`}>
                <AnimatePresence mode="wait">
                    {animatedLabel(<h2>{metadata.artist}</h2>, metadata.artist)}
                </AnimatePresence>
                <AnimatePresence mode="wait">
                    {animatedLabel(<h1>{metadata.song}</h1>, metadata.song)}
                </AnimatePresence>
                <AnimatePresence mode="wait">
                    {animatedLabel(<h3>{metadata.album}</h3>, metadata.album)}
                </AnimatePresence>
            </div>
        : "" }
    </div>
}

export default App
