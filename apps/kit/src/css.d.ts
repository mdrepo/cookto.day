// Stylesheets the kit imports for Bun's bundler: plain ones for their rules,
// and the components' CSS Modules for their class names.
declare module "*.module.css" {
  const classes: Record<string, string>;
  export default classes;
}
declare module "*.css";
