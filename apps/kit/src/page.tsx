import type { Kit, KitLanguage } from "@cookto/ui";
import "@cookto/ui/tokens.css";
import "@cookto/ui/foundation.css";
import "./kit.css";

// The kit page (ADR 0019): every part, in light and dark, English and Arabic,
// side by side. Rendered once at build time; there's no script.

const PANELS: {
  name: string;
  theme: "light" | "dark";
  lang: KitLanguage;
  dir: "ltr" | "rtl";
}[] = [
  { name: "Light, English", theme: "light", lang: "en", dir: "ltr" },
  { name: "Dark, English", theme: "dark", lang: "en", dir: "ltr" },
  { name: "Light, Arabic", theme: "light", lang: "ar", dir: "rtl" },
  { name: "Dark, Arabic", theme: "dark", lang: "ar", dir: "rtl" },
];

export function KitPage({ kits }: { kits: Kit[] }) {
  return (
    <>
      <header className="kit-header">
        <h1 className="kit-title">cookto.day kit</h1>
        <p className="kit-about">
          Every part of the design system, in light and dark, English and
          Arabic. Screens are built from these. DESIGN.md says when to use each.
        </p>
      </header>
      <main className="kit-main">
        {kits.map((kit) => (
          <section
            key={kit.name}
            className="kit-part"
            aria-labelledby={`part-${kit.name}`}
          >
            <h2 id={`part-${kit.name}`} className="kit-part-name">
              {kit.name}
            </h2>
            <p className="kit-about">{kit.about}</p>
            <div
              className={kit.wide ? "kit-panels kit-panels-wide" : "kit-panels"}
            >
              {PANELS.map((panel) => (
                <div
                  key={panel.name}
                  role="group"
                  aria-label={panel.name}
                  className="kit-panel"
                  data-theme={panel.theme}
                  lang={panel.lang}
                  dir={panel.dir}
                >
                  <p className="kit-panel-name" lang="en" dir="ltr">
                    {panel.name}
                  </p>
                  {kit.examples.map((example) => (
                    <figure
                      key={example.title}
                      className="kit-example"
                      aria-label={example.title}
                    >
                      <figcaption className="kit-caption" lang="en">
                        {example.title}
                      </figcaption>
                      {example.render(panel.lang)}
                    </figure>
                  ))}
                </div>
              ))}
            </div>
          </section>
        ))}
      </main>
    </>
  );
}
