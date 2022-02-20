import * as React from "react";
// MUI Imports
import { ThemeProvider } from "@mui/material/styles";
import { CssBaseline } from '@mui/material';
import { theme } from "./themes";
// Component Imports
import { Header } from "./components/header";
import { Layout } from "./components/layout";

function App() {
  return (
      <ThemeProvider theme={theme}>
          <CssBaseline />
          <Header />
          <Layout />
      </ThemeProvider>
  );
}

export default App;
