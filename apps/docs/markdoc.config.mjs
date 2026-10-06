import { component, defineMarkdocConfig, nodes } from "@astrojs/markdoc/config";
import shiki from "@astrojs/markdoc/shiki";

export default defineMarkdocConfig({
  extends: [
    shiki({
      themes: { light: "github-light", dark: "github-dark" },
      defaultColor: false,
    }),
  ],
  nodes: {
    heading: {
      ...nodes.heading,
      render: component("./src/components/Heading.astro"),
    },
  },
  tags: {
    preview: {
      render: component("./src/components/Preview.astro"),
      selfClosing: true,
      attributes: {
        src: { type: String, required: true },
        title: { type: String },
      },
    },
    utilities: {
      render: component("./src/components/api/UtilityTable.astro"),
      selfClosing: true,
      attributes: { section: { type: String, required: true } },
    },
    attributes: {
      render: component("./src/components/api/AttributesTable.astro"),
      selfClosing: true,
      attributes: { primitive: { type: String, required: true } },
    },
    hooks: {
      render: component("./src/components/api/HooksTable.astro"),
      selfClosing: true,
      attributes: { primitive: { type: String, required: true } },
    },
    examples: {
      render: component("./src/components/api/Examples.astro"),
      selfClosing: true,
      attributes: { primitive: { type: String, required: true } },
    },
    behavior: {
      render: component("./src/components/api/Behavior.astro"),
      selfClosing: true,
      attributes: { primitive: { type: String, required: true } },
    },
    switches: { render: component("./src/components/api/SwitchesTable.astro"), selfClosing: true },
    roles: { render: component("./src/components/api/RolesTable.astro"), selfClosing: true },
    globals: { render: component("./src/components/api/GlobalsTable.astro"), selfClosing: true },
    tokens: {
      render: component("./src/components/api/TokensTable.astro"),
      selfClosing: true,
      attributes: { group: { type: String, required: true } },
    },
    head: {
      render: component("./src/components/HeadSnippet.astro"),
      selfClosing: true,
      attributes: {
        mode: { type: String, default: "local", matches: ["local", "cdn"] },
        primitives: { type: String },
        scripts: { type: Boolean, default: true },
        theme: { type: Boolean, default: true },
        fonts: { type: Boolean, default: true },
      },
    },
    callout: {
      render: component("./src/components/Callout.astro"),
      attributes: {
        type: { type: String, default: "note", matches: ["note", "tip", "warning"] },
        title: { type: String },
      },
    },
  },
});
