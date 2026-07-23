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
    metadataRef.current = metadata

    /**
     * Given a MusicBrainz album ID, we fetch the corresponding album art and then set it
     * @param {str} albumId: The ID of the album
     */
    const loadAndSetAlbumArt = async albumData => {
        if (albumData) {
            let albumURL = albumData.artworkUrl100
            albumURL = albumURL.split('/').slice(0, -1).join('/') + '/1000x1000bb.jpg'

            // Load the cover in the browser via fetch before setting it so that it appears to load right away
            const albumResp = await fetch(albumURL)
            if (albumResp.status === 200) {
                setalbumArt(albumURL)
                return
            }
        }

        setTimeout(() => setalbumArt(false), 5000)
    }

    /**
     * Pull the playing metadata from the Python server and parse it as necessary
     */
    const updateMetadata = async () => {
        let currentMetadata
        try {
            currentMetadata = await fetch(`${lib.APP_URL}/metadata`)
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
         * Use the currently set album to try to fetch its art from iTunes
         */
        const getAlbumArt = async () => {
            if (!metadataRef.current.song) {
                return
            }

            const artist = metadata['artist'].replace('&', 'and')
            let url = encodeURIComponent(`https://itunes.apple.com/search?term=${encodeURIComponent(artist)} ${encodeURIComponent(metadata['album'])}&entity=album&limit=1`)
            let data = await fetch(`${lib.APP_URL}?url=${url}`, { signal: AbortSignal.timeout(10000) })
            data = await data.json()

            let albumData
            if (data.results.length === 0 && metadataRef.current.album != 'not fetched') {
                albumData = await lib.getAlbumFromSong_Artist(metadata['song'].replace('&', 'and'), artist)
            } else {
                albumData = data.results[0]
            }

            if (albumData && albumData.artworkUrl100) {
                loadAndSetAlbumArt(albumData)
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
                    src={albumArt || 'defaultbackground.jpg'}
                    key={albumArt}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1, transition: { delay: 2, duration: 5 }}}
                    exit={{ opacity: 0, transition: { delay: 10, duration: 0.5 }}}
                />
            </AnimatePresence>
            <AnimatePresence mode="wait">
                    <motion.img
                        src={albumArt || 'noalbumart.png'}
                        key={albumArt || 'null'}
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
        </>

        {metadata.song ?
            <div className={`${styles.albumData}`}>
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
