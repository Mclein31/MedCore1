# Solar icons in MedCore

Solar Icon Set by [480 Design](https://www.figma.com/community/file/1166831539721848736), licensed under [Creative Commons Attribution 4.0](https://creativecommons.org/licenses/by/4.0/).

Source: [Solar Icons](https://solar-icons.vercel.app/icons) and [saoudi-h/solar-icons](https://github.com/saoudi-h/solar-icons), pinned at `ee04ec4d114633a0cfaefa1791a6486f1e90173d`. Upstream notices are retained in this directory. `sources.json` records every selected source path.

MedCore uses Linear for interface controls and Bold for selected navigation. Adaptations normalize colors to the application palette and preserve configurable stroke widths and dimensions. Original SVG geometry is retained. No remote icon requests or additional runtime packages are required; mobile uses the existing react-native-svg renderer.

Adapters retain established component names to keep the migration limited to presentation. Semantic substitutions: DoorOpen → exit; Receipt → bill; Scale → book-bookmark (statutory documents); UserRoundCog → user-id. ExternalLink uses square-top-down, whose arrow exits the square. Provider and MedCore logos are unchanged.
