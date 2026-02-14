import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material'
import './index.css'
import App from './App.tsx'

const container = document.getElementById('root')
if (!container) {
  throw new Error('Root element #root is missing in index.html')
}

const root = createRoot(container)

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#004d61',
    },
    secondary: {
      main: '#ff6f3c',
    },
    background: {
      default: '#f5f7fa',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: '"Space Grotesk", "Segoe UI", sans-serif',
    h3: {
      fontWeight: 600,
    },
  },
})

root.render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </StrictMode>,
)
