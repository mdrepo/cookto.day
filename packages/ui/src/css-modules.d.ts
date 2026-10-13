// A component's CSS Module: its class names, as Bun's bundler writes them.
declare module "*.module.css" {
  const classes: Record<string, string>;
  export default classes;
}

// An image file: Bun copies it next to the page and gives its address.
declare module "*.svg" {
  const url: string;
  export default url;
}
