// Not loaded by any page. A second build entry that uses React, so the build
// splits React into a file of its own, whose name only changes with React's
// version. Browsers keep it for a year (ADR 0018); scripts/build.ts drops
// this entry's own output.
import "react";
import "react-dom";
import "react-dom/client";
import "react/jsx-runtime";
