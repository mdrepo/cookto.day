// A photo a pack imports (specs/118): Bun copies the file into the site and
// gives its address.
declare module "*.webp" {
  const url: string;
  export default url;
}
