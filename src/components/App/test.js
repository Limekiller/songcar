const fs = require('fs')

const getBestRelease = (data, artist) => {
    let returnRelease
    let oldestReleaseDate = new Date()

    // If there's only one recording and release, just return it right away
    if (data.recordings.length === 1 && data.recordings[0].releases.length === 1) {
        return data.recordings[0].releases[0]
    }

    for (let recording of data.recordings) {

        if (recording.disambiguation) {
            continue;
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

let data = fs.readFileSync(process.argv.slice(2)[0]).toString()
data = JSON.parse(data)
release = getBestRelease(data, "The Who")
console.log(release)
