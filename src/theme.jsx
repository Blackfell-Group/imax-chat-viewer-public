import { createTheme } from '@mui/material'

// Analyst-console dark theme. Entity-chip colors are part of the design
// contract: person=amber, geo=teal, phone=violet — consistent everywhere an
// entity appears (message overlay, chip row, gold-copy tray).
const theme = createTheme({
  palette: {
    mode: 'dark',
    background: { default: '#0f1419', paper: '#171d24' },
    primary: { main: '#4da3ff' },
    secondary: { main: '#9a7bff' },
    entity: {
      person: '#ffb547',
      geo: '#39c5a3',
      phone: '#b48bff',
      passport: '#ff6f8e',
      handle: '#7fd1ff'
    }
  },
  typography: {
    fontFamily: 'Roboto, "Noto Sans", "Noto Sans Arabic", "Noto Sans SC", sans-serif',
    fontSize: 13
  },
  components: {
    MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } }
  }
})

export default theme
