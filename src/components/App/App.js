import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from "motion/react"
import styles from './App.module.scss'

const App = () => {
    const [metadata, setmetadata] = useState({
        'artist': '',
        'song': '',
        'album': ''
    })
    const [albumArt, setalbumArt] = useState(false)

    const getOldestResult = data => {
        let returnRelease
        let oldestReleaseDate = new Date()
        for (let recording of data.recordings) {
            for (let release of recording.releases) {
                if (!release['date'] || release['date'].length < 10) {
                    continue
                }
                if (release['title'].includes('live')) {
                    continue
                }

                const recordingReleaseDate = new Date(release['date'])
                if (recordingReleaseDate < oldestReleaseDate) {
                    oldestReleaseDate = recordingReleaseDate
                    returnRelease = release
                }
            }
        }
        return returnRelease
    }

    const parseSiriusXMData = async data => {
        const channelName = data.song.split(' | ')[0]
        let url = encodeURIComponent(`http://xmplaylist.com/api/station/${channelName.replace(/\W/g, '')}`)
        let sxmData = await fetch(`http://localhost:3000?url=${url}`)
        sxmData = await sxmData.json()

        const sxmTitle = sxmData.results[0].track.title
        const sxmArtist = sxmData.results[0].track.artists[0]

        url = encodeURIComponent(`https://musicbrainz.org/ws/2/recording?query=artist:"${sxmArtist}" AND recording:"${sxmTitle}" AND video:false AND status:official&fmt=json`)
        let mbResponse = await fetch(`http://localhost:3000?url=${url}`)
        mbResponse = await mbResponse.json()
        const album = getOldestResult(mbResponse).title

        return {
            'artist': sxmArtist,
            'song': sxmTitle,
            'album': album
        }
    }

    // Fetch metadata from the server every second
    useEffect(() => {
        const updateMetadata = async () => {
            let currentMetadata = await fetch(`http://localhost:3000/metadata`)
            currentMetadata = await currentMetadata.json()

            if (currentMetadata.song.includes(' | SiriusXM')) {
                currentMetadata = await parseSiriusXMData(currentMetadata)
            }

            setmetadata({
                'song': currentMetadata.song,
                'artist': currentMetadata.artist,
                'album': currentMetadata.album,
            })
        }

        const songCheckInterval = setInterval(() => {
            updateMetadata()
        }, 1000)

        return () => {
            clearInterval(songCheckInterval)
        }
    }, [])

    // When the album changes, attempt to fetch album art
    useEffect(() => {
        const getAlbumArt = async () => {
            let url = encodeURIComponent(`https://musicbrainz.org/ws/2/release?query=artist:"${metadata['artist']}" AND release:"${metadata['album']}" AND status:official&fmt=json`)
            let albumInfo = await fetch(`http://localhost:3000?url=${url}`)
            albumInfo = await albumInfo.json()

            if (albumInfo['releases'][0]) {
                const albumId = albumInfo['releases'][0].id

                // Load the cover in the browser via fetch before setting it so that it appears to load right away
                const albumResp = await fetch(`https://coverartarchive.org/release/${albumId}/front-500`)
                if (albumResp.status === 200) {
                    setalbumArt(`https://coverartarchive.org/release/${albumId}/front-500`)
                }
                return
            }
            setalbumArt(false)
        }

        getAlbumArt()
    }, [metadata.album])

    const animatedLabel = (innerJSX, key) => { return (
        <motion.div
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
        </>

        {metadata.song ?
            <div className={styles.albumData}>
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
