# PaceCtrl Widget

This package contains the embeddable PaceCtrl passenger widget. It is compiled to a single UMD bundle (`dist/widget.js`) that exposes a global `window.PaceCtrlWidget` object with an `init` method.

## Development

```bash
cd widget
npm install
npm run build
```

The build command uses Vite library mode to emit `dist/widget.js` and an accompanying source map.

## Usage

```html
<div id="pace-widget" data-external-trip-id="trip-123"></div>
<script src="https://WEBSITEURL/widget.js"></script>
<script>
  window.PaceCtrlWidget.init({
    container: "#pace-widget",
    onIntentCreated(intent) {
      console.log("Intent stored", intent.intent_id);
    }
  });
</script>
```

### `init` options

| Option | Type | Description |
| --- | --- | --- |
| `container` | `string` \| `HTMLElement` | Required. The node where the widget should render. |
| `externalTripId` | `string` | Optional. Trip identifier. Falls back to `data-external-trip-id` attribute. |
| `apiBaseUrl` | `string` | Optional. Defaults to the origin that served `widget.js`. |
| `onIntentCreated` | `(intent) => void` | Optional callback invoked after the widget successfully stores a choice intent. |

The widget automatically posts choice intents when the slider value changes (debounced)