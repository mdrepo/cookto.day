// A component's CSS Module: its class names, as Bun's bundler writes them.
declare module "*.module.css" {
  const classes: Record<string, string>;
  export default classes;
}
