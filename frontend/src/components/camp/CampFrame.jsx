// The camp's frame and sign, shared by the camp (CampScene) and the buddy
// picker before it (BuddyPicker), so the sign stands in exactly the same place
// before and after a buddy is chosen. The picture goes in as children; the
// sign's title plank is the section's heading, its second plank says `names`.

import './CampScene.css'

export default function CampFrame({ names, children }) {
    return (
        <div className="camp-scene-frame">
            {children}
            <span className="camp-scene-frame-line" aria-hidden="true" />
            <div className="camp-scene-sign">
                <h2 className="camp-scene-plank camp-scene-plank--title ink-shape ink-shape--thin">
                    <span className="camp-scene-nail camp-scene-nail--left" />
                    Seikkailuleiri
                    <span className="camp-scene-nail camp-scene-nail--right" />
                </h2>
                <p className="camp-scene-plank camp-scene-plank--names ink-shape ink-shape--thin">
                    <span className="camp-scene-nail camp-scene-nail--left" />
                    {names}
                    <span className="camp-scene-nail camp-scene-nail--right" />
                </p>
            </div>
        </div>
    )
}
