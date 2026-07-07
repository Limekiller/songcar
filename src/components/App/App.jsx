import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence, LayoutGroup } from "motion/react"
import lib from "../../lib.js"

import styles from './App.module.scss'

const App = () => {
    const [metadata, setmetadata] = useState({
        'artist': '',
        'song': '',
        'album': '',
        'url': ''
    })
    const [albumArt, setalbumArt] = useState(false)

    const metadataRef = useRef(metadata)
    metadataRef.current = metadata;

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

        setTimeout(() => setalbumArt(false), 5000)
    }

    /**
     * Pull the playing metadata from the Python server and parse it as necessary
     */
    const updateMetadata = async () => {
        try {
            let currentMetadata = await fetch(`${lib.APP_URL}/metadata`)
        } catch (error) {
            console.log(error)
            await new Promise(r => setTimeout(r, 2000))
            updateMetadata()
        }
        currentMetadata = await currentMetadata.json()

        if (!currentMetadata.song || currentMetadata.song === "") {
            await new Promise(r => setTimeout(r, 5000))
            updateMetadata()
            return
        }

        try {
            currentMetadata = await lib.parseMetadata(currentMetadata)
            setmetadata(currentMetadata)
        } catch (error) {
            console.log(error)
        }

        await new Promise(r => setTimeout(r, 5000))
        updateMetadata()
    }

    // Fetch metadata from the server every second
    useEffect(() => {
        updateMetadata()
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

            const artist = metadata['artist'].replace('&', 'and');
            let url = encodeURIComponent(`https://musicbrainz.org/ws/2/release?query=artist:"${encodeURIComponent(artist)}" AND release:"${encodeURIComponent(metadata['album'])}" AND status:official AND packaging:None AND (primarytype:album OR primarytype:single OR primarytype:EP) &fmt=json`)
            let releases = await fetch(`${lib.APP_URL}?url=${url}`)
            releases = await releases.json()

            let albumInfo = lib.getBestRelease(releases)
            if (!albumInfo && metadataRef.current.album != 'not fetched') {
                albumInfo = await lib.getAlbumFromSong_Artist(metadata['song'].replace('&', 'and'), artist)
            }

            if (albumInfo && albumInfo.id) {
                loadAndSetAlbumArt(albumInfo.id)
            } else {
                setalbumArt(false)
            }
        }

        getAlbumArt()
    }, [metadata.album])

    const animatedLabel = (innerJSX, key) => { return (
        <motion.div
            layout
            className={styles.animatedLabel}
            key={key}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
                duration: 0.5,
                delay: 2,
                layout: { delay: 0 }
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
                            exit={{opacity: 0, x: '-1rem', transition: { delay: 5, duration: 0.5 }}}
                        />
                </AnimatePresence>
            : ""}
        </>

        {metadata.song ?
            <div className={`${styles.albumData} ${!albumArt ? styles.centered : ''}`}>
                <LayoutGroup>
                    <AnimatePresence mode="wait">
                        {animatedLabel(<h2>{metadata.artist}</h2>, metadata.artist)}
                    </AnimatePresence>
                    <AnimatePresence mode="wait">
                        {animatedLabel(<h1>{metadata.song}</h1>, metadata.song)}
                    </AnimatePresence>
                    <AnimatePresence mode="wait">
                        {animatedLabel(<h3>{metadata.album}</h3>, metadata.album)}
                    </AnimatePresence>
                </LayoutGroup>
            </div>
        : "" }
    </div>
}

export default App
