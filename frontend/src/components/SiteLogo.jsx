import logoPaper from '../assets/siteLogoPaper.gif'
import logoPaperStill from '../assets/siteLogoPaperStill.png'
import logoSky from '../assets/siteLogoSky.gif'
import logoSkyStill from '../assets/siteLogoSkyStill.png'

// Two looks of the same drawing, kept so either can be brought back by
// changing ACTIVE_LOOK.
//   paper  brown letters, the drawn orange and blue, a paper rim
//   sky    brown letters, the site's sun and navy, a sky rim
const LOOKS = {
    paper: { logo: logoPaper, still: logoPaperStill },
    sky: { logo: logoSky, still: logoSkyStill }
}
const ACTIVE_LOOK = 'paper'

// The hand-drawn logo as the page heading. It boils on a 3-frame loop; with
// reduced motion the browser takes its first frame instead. Sized in App.css
// (.site-logo); a page that wants it larger adds its own class.
export default function SiteLogo({ className = '', ...props }) {
    const { logo, still } = LOOKS[ACTIVE_LOOK]

    return (
        <h1 className={`site-logo ${className}`.trim()} {...props}>
            <picture>
                <source srcSet={still} media="(prefers-reduced-motion: reduce)" />
                <img className="site-logo-img" src={logo} alt="Lukudiplomi-peli" width="348" height="137" />
            </picture>
        </h1>
    )
}
