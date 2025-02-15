import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from "motion/react"
import styles from './App.module.scss'

const App = () => {
    const [metadata, setmetadata] = useState({
        'artist': 'init',
        'song': 'init',
        'album': 'init'
    })
    const [albumArt, setalbumArt] = useState('')

    const updateMetadata = async () => {
        let currentMetadata = await fetch(`http://localhost:3000/metadata`)
        currentMetadata = await currentMetadata.json()
        setmetadata({
            'song': currentMetadata.song,
            'artist': currentMetadata.artist,
            'album': currentMetadata.album,
        })
    }

    useEffect(() => {
        const songCheckInterval = setInterval(() => {
            updateMetadata()
        }, 1000)

        return () => {
            clearInterval(songCheckInterval)
        }
    }, [])

    useEffect(() => {
        const getAlbumArt = async () => {
            let url = encodeURIComponent(`https://musicbrainz.org/ws/2/release?query=artist:"${metadata['artist']}" AND release:"${metadata['album']}" AND status:official&fmt=json`)
            let albumInfo = await fetch(`http://localhost:3000?url=${url}`)
            albumInfo = await albumInfo.json()
            const albumId = albumInfo['releases'][0].id
            setalbumArt(`https://coverartarchive.org/release/${albumId}/front-500`)
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
        {albumArt ?
            <>
                <AnimatePresence>
                    <motion.img
                        className={styles.bg}
                        alt={`The album cover for ${metadata.artist} - ${metadata.album}`}
                        src={albumArt}
                        key={albumArt}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1, transition: { delay: 2, duration: 0.5 }}}
                        exit={{ opacity: 0, transition: { delay: 4, duration: 0.5 }}}
                    />
                </AnimatePresence>
                <AnimatePresence mode="wait">
                    <motion.img
                        alt={`The album cover for ${metadata.artist} - ${metadata.album}`}
                        src={albumArt}
                        key={albumArt}
                        style={{
                            width: "66%",
                            objectFit: "cover",
                            boxShadow: "0px 0px 100rem white"
                        }}
                        initial={{ opacity: 0, x: '-1rem' }}
                        animate={{ opacity: 1, x: 0, transition: { delay: 2, duration: 0.5 }}}
                        exit={{ opacity: 0, x: '-1rem', transition: { duration: 0.5 }}}
                    />
                </AnimatePresence>
            </>
        : "" }

        {metadata.artist && metadata.artist !== 'init' ?
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
