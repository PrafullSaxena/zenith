import React from 'react'
import CapturePopup from './CapturePopup'

/**
 * CaptureApp — rendered at the /capture route inside the capture popup window.
 * Minimal wrapper: no AppLayout, no sidebar, just the popup UI.
 */
export default function CaptureApp(): React.JSX.Element {
  return <CapturePopup />
}
