// Stylesheets the app imports for Bun's bundler: plain ones for their rules,
// and the components' CSS Modules for their class names.
declare module "*.module.css" {
  const classes: Record<string, string>;
  export default classes;
}
declare module "*.css";

// An image file: Bun copies it next to the page and gives its address.
declare module "*.svg" {
  const url: string;
  export default url;
}
