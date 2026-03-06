function App(): React.JSX.Element {
  return (
    <div
      style={{
        width: '100%',
        height: '100vh',
        background: '#0f0f0f',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'oklch(90% 0 0)',
        fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
      }}
    >
      <div style={{ textAlign: 'center', opacity: 0.3 }}>
        <div style={{ fontSize: 14, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          Zenith
        </div>
      </div>
    </div>
  )
}

export default App
