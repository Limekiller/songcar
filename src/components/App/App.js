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

            if (albumInfo['releases'][0]) {
                const albumId = albumInfo['releases'][0].id
                setalbumArt(`https://coverartarchive.org/release/${albumId}/front-500`)
            } else {
                setalbumArt(false)
            }
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
                    animate={{ opacity: 1, transition: { delay: 2, duration: 0.5 }}}
                    exit={{ opacity: 0, transition: { delay: 2.5, duration: 0.5 }}}
                />
            </AnimatePresence>
            <AnimatePresence mode="wait">
                <motion.img
                    src={albumArt || ''}
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

        {metadata.artist ?
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
