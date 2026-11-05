// A baked ink icon (the lukudiplomi-ink-icons skill) at the size it was baked at.
// Each PNG is `size` pixels of icon inside a clear 10px margin, so the picture is
// larger than its box and the negative margin takes the difference back out.

const PAD = 10

export default function InkIcon({ src, size }) {
    const full = size + PAD * 2
    return <img src={src} width={full} height={full} style={{ margin: -PAD }} alt="" aria-hidden="true" />
}
