// Image loading and the one drawing trick the mini-games share.
//
// A module calls loadArt() once at import time and checks `art.ready` in draw():
// until every image has decoded it paints a flat colour instead, so a slow or
// failed load never breaks a run.

/** Starts loading every image in `sources` ({ name: url }); `ready` flips once all have decoded. */
export function loadArt(sources) {
    const art = { ready: false }
    let pending = Object.keys(sources).length
    for (const [name, url] of Object.entries(sources)) {
        const image = new Image()
        image.addEventListener('load', () => {
            pending -= 1
            art.ready = pending === 0
        })
        image.src = url
        art[name] = image
    }
    return art
}

/**
 * Paints `image` as a vertically scrolling backdrop that never shows a seam.
 *
 * The picture does not have to tile: copies are laid end to end alternately
 * upright and flipped, so every join is two identical rows. The pattern repeats
 * every 2 * height, so `scroll` must wrap at that value. Content moves down as
 * `scroll` grows.
 */
export function drawMirrored(ctx, image, scroll, width, height) {
    for (let n = -2; n <= 0; n++) {
        const top = Math.floor(scroll + n * height)
        if (top >= height || top + height <= 0) continue
        ctx.save()
        ctx.translate(0, top)
        // One extra row of overlap, so rounding never leaves a hairline between copies.
        if (n % 2 !== 0) {
            ctx.translate(0, height + 1)
            ctx.scale(1, -1)
        }
        ctx.drawImage(image, 0, 0, width, height + 1)
        ctx.restore()
    }
}
