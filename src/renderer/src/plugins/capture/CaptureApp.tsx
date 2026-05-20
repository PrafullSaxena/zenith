import React, { useEffect } from 'react'
import CapturePopup from './CapturePopup'

/**
 * CaptureApp — rendered at the /capture route inside the capture popup window.
 * Applies the same data-theme as the main window so CSS variables match.
 */
export default function CaptureApp(): React.JSX.Element {
  useEffect(() => {
    window.api.settings.get('general.theme').then((theme) => {
      const t = theme as string | undefined
      if (t && t !== 'zenith') {
        document.documentElement.setAttribute('data-theme', t)
      } else {
        document.documentElement.removeAttribute('data-theme')
      }
    })
  }, [])

  return <CapturePopup />
}
