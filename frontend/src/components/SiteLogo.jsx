import logo from '../assets/siteLogo.gif'
import logoStill from '../assets/siteLogoStill.png'

// The hand-drawn logo as the page heading. It boils on a 3-frame loop; with
// reduced motion the browser takes its first frame instead. Sized in App.css
// (.site-logo); a page that wants it larger adds its own class.
export default function SiteLogo({ className = '', ...props }) {
    return (
        <h1 className={`site-logo ${className}`.trim()} {...props}>
            <picture>
                <source srcSet={logoStill} media="(prefers-reduced-motion: reduce)" />
                <img className="site-logo-img" src={logo} alt="Lukudiplomi-peli" width="348" height="137" />
            </picture>
        </h1>
    )
}
